import {
  ComputeBudgetProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction,
  createTransferCheckedInstruction,
  getMint,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import {
  PRIORITY_FEE_MICROLAMPORTS,
  TX_PACK_BUDGET,
  USDC_MINT,
  WSOL_MINT,
} from "../config";
import {
  deserializeIx,
  fetchAddressLookupTables,
  fetchQuote,
  fetchSwapInstructions,
} from "./jupiter";

/**
 * Build one or more v0 VersionedTransactions that sweep `dustTokens` to a
 * single destination mint (USDC by default, or another like $SWEEP).
 *
 * Per dust token (in order):
 *   1. swap input → output via Jupiter
 *   2. close the source ATA (refund rent as native SOL to user)
 *
 * Common to every tx:
 *   - ComputeBudget: setComputeUnitLimit + setComputeUnitPrice
 *   - First tx only: ATA-create (idempotent) for the user's destination ATA
 *
 * Packs into ~1100 bytes per tx (margin under the 1232 hard limit). When a
 * candidate ix overflows the current tx, we finalize it and start a fresh one.
 *
 * Returns: { transactions, plan, blockhash, lastValidBlockHeight }.
 * The blockhash is fetched JUST IN TIME (right before message compose)
 * because the Jupiter loop above can take 10–30s+ and Solana blockhashes
 * expire in ~60s — fetching it upfront caused "Blockhash not found" at
 * simulation time on slower scans.
 */
export async function buildSweepTransactions({
  connection,
  user,
  dustTokens, // [{ mint, ata, amount(BigInt), decimals, programId }]
  outputMint = USDC_MINT,    // PublicKey
  feeBps = 0,                // platform fee in basis points (0 disables)
  feeAuthority = null,       // PublicKey owning the fee ATA per output mint
}) {
  if (!dustTokens.length) {
    return { transactions: [], plan: [], blockhash: null, lastValidBlockHeight: null };
  }

  // Native SOL output: Jupiter handles WSOL wrap/unwrap when wrapAndUnwrapSol
  // is true, so we DON'T create or pass a destination ATA — leaving it null
  // tells Jupiter to deliver native SOL to the user.
  const isNativeSol = outputMint.equals(WSOL_MINT);

  const userDestAta = isNativeSol
    ? null
    : getAssociatedTokenAddressSync(outputMint, user, false, TOKEN_PROGRAM_ID);

  // Fee account: per-output-mint ATA owned by feeAuthority.
  //
  // We DO NOT pass feeAccount/platformFeeBps to Jupiter — their lite-api
  // fee-collection path is currently broken (HTTP 500 "out of range integral
  // type conversion attempted" across every route when feeAccount is set).
  // Instead we self-collect: after Jupiter's swap deposits the full output
  // into the user's ATA, we append our own SPL transferChecked ix that
  // siphons `feeBps` of the slippage-floor amount into our fee ATA. Same
  // atomic batch, single wallet prompt, exact fee math under our control.
  //
  // Skipped when:
  //   - feeAuthority is unset (no fee collection configured)
  //   - the fee ATA doesn't exist on-chain (operator hasn't initialised it)
  //   - output is native SOL (would require WSOL handling — deferred)
  let feeAccount = feeAuthority
    ? getAssociatedTokenAddressSync(outputMint, feeAuthority, false, TOKEN_PROGRAM_ID)
    : null;
  if (feeAccount) {
    const info = await connection.getAccountInfo(feeAccount, "confirmed");
    if (!info) {
      console.warn(
        `[sweep] feeAccount ${feeAccount.toBase58()} not initialised on-chain — ` +
        `skipping platform fee for this sweep. Create the ATA owned by FEE_AUTHORITY ` +
        `for output mint ${outputMint.toBase58()} to enable fee collection.`
      );
      feeAccount = null;
    }
  }
  const collectFee = !!feeAccount && !isNativeSol && feeBps > 0;
  let outputDecimals = null;
  if (collectFee) {
    const mintInfo = await getMint(connection, outputMint, "confirmed", TOKEN_PROGRAM_ID);
    outputDecimals = mintInfo.decimals;
  }

  // Step 1: per-token, fetch quote + swap-instructions, collect ALTs.
  // We do this before packing so we know each candidate's serialized size.
  const prepared = [];
  for (const t of dustTokens) {
    let swapJson;
    let quote;
    try {
      quote = await fetchQuote({
        inputMint: t.mint,
        amountRaw: t.amount,
        outputMint: outputMint.toBase58(),
        // Jupiter's fee path is broken (see comment above feeAccount block) —
        // we don't ask them to embed platform fee in the quote and we don't
        // pass feeAccount to swap-instructions. Self-collect after the swap.
        platformFeeBps: 0,
        slippageBps: undefined, // use default
      });
      swapJson = await fetchSwapInstructions({
        quoteResponse: quote,
        userPublicKey: user,
        destinationTokenAccount: userDestAta,
        feeAccount: null,
      });
    } catch (err) {
      // No route or rate-limited — surface to caller, skip this token.
      // Logged so we can diagnose post-hoc when the user reports a
      // sweep that produced 0 swaps.
      const msg = err?.message || String(err);
      console.warn("[sweep] Jupiter failed for", t.mint, "—", msg);
      prepared.push({ token: t, error: msg });
      continue;
    }

    const setupIxs = (swapJson.setupInstructions || []).map(deserializeIx);
    const swapIx = swapJson.swapInstruction
      ? deserializeIx(swapJson.swapInstruction)
      : null;
    const cleanupIx = swapJson.cleanupInstruction
      ? deserializeIx(swapJson.cleanupInstruction)
      : null;

    // Self-collected platform fee: transfer `feeBps` of the slippage-floor
    // output to our fee ATA. We charge on otherAmountThreshold (the worst
    // case Jupiter guarantees) so the transfer can never exceed the user's
    // actual received balance.
    let feeTransferIx = null;
    if (collectFee && quote?.otherAmountThreshold) {
      const minOut = BigInt(quote.otherAmountThreshold);
      const feeAmount = (minOut * BigInt(feeBps)) / BigInt(10000);
      if (feeAmount > 0n) {
        feeTransferIx = createTransferCheckedInstruction(
          userDestAta,     // source — user's destination ATA (just filled by Jupiter)
          outputMint,      // mint
          feeAccount,      // destination — fee collector's ATA
          user,            // owner (signs)
          feeAmount,
          outputDecimals,
          [],
          TOKEN_PROGRAM_ID
        );
      }
    }

    // Close the *emptied* source ATA so user reclaims rent. Programmed below
    // (after the swap) per token. The close authority is the wallet itself.
    const closeIx = createCloseAccountInstruction(
      new PublicKey(t.ata),
      user,                             // rent destination
      user,                             // close authority
      [],
      t.programId === TOKEN_2022_PROGRAM_ID.toBase58()
        ? TOKEN_2022_PROGRAM_ID
        : TOKEN_PROGRAM_ID
    );

    prepared.push({
      token: t,
      altAddresses: swapJson.addressLookupTableAddresses || [],
      // Order matters: setup → Jupiter swap → Jupiter cleanup → our fee
      // siphon → close source ATA. The fee transfer must run AFTER
      // Jupiter deposits output into userDestAta and BEFORE we close the
      // source ATA (source close doesn't depend on it, but keeping the
      // close last preserves the existing per-token bundle shape).
      ixs: [...setupIxs, swapIx, cleanupIx, feeTransferIx, closeIx].filter(Boolean),
    });
  }

  // Step 2: resolve ALT accounts (deduped across all tokens).
  const altSet = new Set();
  prepared.forEach((p) => p.altAddresses?.forEach((a) => altSet.add(a)));
  const lookupTables = await fetchAddressLookupTables(
    connection,
    Array.from(altSet)
  );
  const lookupByAddress = new Map(
    lookupTables.map((a) => [a.key.toBase58(), a])
  );

  // Step 2.5: fetch a fresh blockhash NOW. The Jupiter loop above can run
  // for tens of seconds; blockhashes expire after ~150 slots (~60s) so we
  // need this as close to the user's signature as possible. Packing below
  // is purely local (no network) so the blockhash is at most a few hundred
  // ms old when the wallet prompts.
  const { blockhash: recentBlockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");

  // Step 3: pack into v0 transactions.
  const transactions = [];
  const plan = [];
  let txIdx = 0;
  // Skip ATA-create entirely for native SOL output (Jupiter handles it).
  const includeAtaCreate = !isNativeSol;
  let currentIxs = baseInstructions({ user, userDestAta, outputMint, includeAtaCreate });
  let currentAltSet = new Set();
  // Track whether the CURRENT tx has at least one real swap+close packed in.
  // Without this, an all-errored batch would still produce a tx containing
  // only ComputeBudget + ATA-create — the user signs, pays the network fee
  // and the ATA rent, and nothing actually gets swept. We refuse to finalize
  // a no-op tx.
  let currentTxHasSwap = false;

  const finalize = () => {
    if (!currentTxHasSwap) return;
    const alts = Array.from(currentAltSet)
      .map((a) => lookupByAddress.get(a))
      .filter(Boolean);
    const message = new TransactionMessage({
      payerKey: user,
      recentBlockhash,
      instructions: currentIxs,
    }).compileToV0Message(alts);
    transactions.push(new VersionedTransaction(message));
    txIdx += 1;
  };

  for (const p of prepared) {
    if (p.error) {
      plan.push({ token: p.token, txIdx: null, error: p.error });
      continue;
    }
    // Try adding this token's ixs to the current tx; if oversized, flush.
    const candidateIxs = [...currentIxs, ...p.ixs];
    const candidateAltSet = new Set([...currentAltSet, ...p.altAddresses]);
    const size = estimateMessageSize({
      user,
      recentBlockhash,
      instructions: candidateIxs,
      lookupTables: Array.from(candidateAltSet)
        .map((a) => lookupByAddress.get(a))
        .filter(Boolean),
    });
    if (size > TX_PACK_BUDGET && currentTxHasSwap) {
      // Flush current, start fresh
      finalize();
      currentIxs = baseInstructions({ user, userDestAta, outputMint, includeAtaCreate: false });
      currentAltSet = new Set();
      currentTxHasSwap = false;
    }
    currentIxs.push(...p.ixs);
    p.altAddresses.forEach((a) => currentAltSet.add(a));
    currentTxHasSwap = true;
    plan.push({ token: p.token, txIdx });
  }
  finalize();

  return { transactions, plan, blockhash: recentBlockhash, lastValidBlockHeight };
}

function baseInstructions({ user, userDestAta, outputMint = USDC_MINT, includeAtaCreate = false } = {}) {
  const ixs = [
    ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: PRIORITY_FEE_MICROLAMPORTS,
    }),
  ];
  if (includeAtaCreate && user && userDestAta) {
    ixs.push(
      createAssociatedTokenAccountIdempotentInstruction(
        user,           // payer
        userDestAta,    // ata
        user,           // owner
        outputMint,
        TOKEN_PROGRAM_ID
      )
    );
  }
  return ixs;
}

function estimateMessageSize({ user, recentBlockhash, instructions, lookupTables }) {
  try {
    const msg = new TransactionMessage({
      payerKey: user,
      recentBlockhash,
      instructions,
    }).compileToV0Message(lookupTables);
    const tx = new VersionedTransaction(msg);
    // Reserve 64 bytes for the signature (1 signer × 64).
    return tx.serialize().length + 64;
  } catch {
    // If it doesn't compile (e.g., too many static accounts), call it overflowing.
    return Number.MAX_SAFE_INTEGER;
  }
}
