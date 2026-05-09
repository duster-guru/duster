import {
  ComputeBudgetProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import {
  PRIORITY_FEE_MICROLAMPORTS,
  TX_PACK_BUDGET,
  USDC_MINT,
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
 * Returns: { transactions: VersionedTransaction[], plan: [{ token, txIdx }] }
 */
export async function buildSweepTransactions({
  connection,
  user,
  dustTokens, // [{ mint, ata, amount(BigInt), decimals, programId }]
  recentBlockhash,
  outputMint = USDC_MINT, // PublicKey of destination
}) {
  if (!dustTokens.length) return { transactions: [], plan: [] };
  if (!recentBlockhash) {
    const { blockhash } = await connection.getLatestBlockhash("confirmed");
    recentBlockhash = blockhash;
  }

  // Compute the user's destination ATA once. Whether it exists yet or not,
  // we use createAssociatedTokenAccountIdempotent on the first tx so it's safe.
  const userDestAta = getAssociatedTokenAddressSync(
    outputMint,
    user,
    false,
    TOKEN_PROGRAM_ID
  );

  // Step 1: per-token, fetch quote + swap-instructions, collect ALTs.
  // We do this before packing so we know each candidate's serialized size.
  const prepared = [];
  for (const t of dustTokens) {
    let swapJson;
    try {
      const quote = await fetchQuote({
        inputMint: t.mint,
        amountRaw: t.amount,
        outputMint: outputMint.toBase58(),
        slippageBps: undefined, // use default
      });
      swapJson = await fetchSwapInstructions({
        quoteResponse: quote,
        userPublicKey: user,
        destinationTokenAccount: userDestAta,
      });
    } catch (err) {
      // No route or rate-limited — surface to caller, skip this token
      prepared.push({ token: t, error: err.message || String(err) });
      continue;
    }

    const setupIxs = (swapJson.setupInstructions || []).map(deserializeIx);
    const swapIx = swapJson.swapInstruction
      ? deserializeIx(swapJson.swapInstruction)
      : null;
    const cleanupIx = swapJson.cleanupInstruction
      ? deserializeIx(swapJson.cleanupInstruction)
      : null;

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
      ixs: [...setupIxs, swapIx, cleanupIx, closeIx].filter(Boolean),
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

  // Step 3: pack into v0 transactions.
  const transactions = [];
  const plan = [];
  let txIdx = 0;
  let currentIxs = baseInstructions({ user, userDestAta, outputMint, includeAtaCreate: true });
  let currentAltSet = new Set();

  const finalize = () => {
    if (currentIxs.length <= baseInstructions({}).length) return; // nothing added
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
    if (size > TX_PACK_BUDGET && currentIxs.length > baseInstructions({}).length) {
      // Flush current, start fresh
      finalize();
      currentIxs = baseInstructions({ user, userDestAta, outputMint, includeAtaCreate: false });
      currentAltSet = new Set();
    }
    currentIxs.push(...p.ixs);
    p.altAddresses.forEach((a) => currentAltSet.add(a));
    plan.push({ token: p.token, txIdx });
  }
  finalize();

  return { transactions, plan };
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
