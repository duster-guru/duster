import {
  AddressLookupTableAccount,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  JUP_QUOTE_URL,
  JUP_REQUEST_TIMEOUT_MS,
  JUP_SWAP_IX_URL,
  SLIPPAGE_BPS,
  USDC_MINT,
  WRAP_AND_UNWRAP_SOL,
} from "../config";

/**
 * fetch() wrapper that aborts after `timeoutMs`. Rethrows AbortError as a
 * regular Error so the build loop's per-token try/catch can surface a
 * useful message and skip the token instead of hanging forever.
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = JUP_REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (e) {
    if (e?.name === "AbortError") {
      const err = new Error(`Jupiter request timed out after ${timeoutMs}ms`);
      err.cause = "timeout";
      throw err;
    }
    throw e;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Get a Jupiter route quote (lite-api swap/v1 — same shape as the older v6).
 *   inputMint        — base58 mint string of the dust token
 *   amountRaw        — bigint of raw token amount (decimals NOT applied)
 *   outputMint       — base58 string; defaults to USDC
 *   platformFeeBps   — Jupiter referral fee in basis points (0 disables)
 */
export async function fetchQuote({
  inputMint,
  amountRaw,
  outputMint = USDC_MINT.toBase58(),
  slippageBps = SLIPPAGE_BPS,
  swapMode = "ExactIn",
  platformFeeBps = 0,
}) {
  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount: amountRaw.toString(),
    slippageBps: slippageBps.toString(),
    swapMode,
    onlyDirectRoutes: "false",
    asLegacyTransaction: "false",
  });
  if (platformFeeBps > 0) {
    params.set("platformFeeBps", String(platformFeeBps));
  }
  const r = await fetchWithTimeout(`${JUP_QUOTE_URL}?${params}`);
  if (!r.ok) {
    const body = await safeText(r);
    const err = new Error(`Jupiter quote ${r.status}: ${body || "no body"}`);
    err.status = r.status;
    err.input = inputMint;
    throw err;
  }
  return r.json();
}

/**
 * Get raw swap instructions from Jupiter.
 *   destinationTokenAccount — user's output ATA; pass null for native SOL output
 *   feeAccount              — fee recipient ATA owned by FEE_AUTHORITY,
 *                             matched to the output mint. null disables fee
 *                             collection (Jupiter ignores platformFeeBps).
 */
export async function fetchSwapInstructions({
  quoteResponse,
  userPublicKey,
  destinationTokenAccount = null,
  feeAccount = null,
}) {
  const body = {
    quoteResponse,
    userPublicKey: userPublicKey.toBase58(),
    wrapAndUnwrapSol: WRAP_AND_UNWRAP_SOL,
    // Shared-accounts mode trips a server-side 500 ("out of range integral
    // type conversion attempted") for Token-2022 routes and some CLMM
    // hops. Standard accounts work for every route at the cost of a
    // slightly larger tx — fine here since we're already packing multiple
    // swaps per tx.
    useSharedAccounts: false,
    asLegacyTransaction: false,
    dynamicComputeUnitLimit: false, // we set our own
  };
  if (destinationTokenAccount) {
    body.destinationTokenAccount = destinationTokenAccount.toBase58?.() || destinationTokenAccount;
  }
  if (feeAccount) {
    body.feeAccount = feeAccount.toBase58?.() || feeAccount;
  }
  const r = await fetchWithTimeout(JUP_SWAP_IX_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const text = await safeText(r);
    throw new Error(`Jupiter swap-instructions ${r.status}: ${text || "no body"}`);
  }
  return r.json();
}

/**
 * Convert Jupiter's JSON instruction shape into a web3.js TransactionInstruction.
 */
export function deserializeIx(jsonIx) {
  return new TransactionInstruction({
    programId: new PublicKey(jsonIx.programId),
    keys: jsonIx.accounts.map((a) => ({
      pubkey: new PublicKey(a.pubkey),
      isSigner: a.isSigner,
      isWritable: a.isWritable,
    })),
    data: Buffer.from(jsonIx.data, "base64"),
  });
}

/**
 * Resolve Address Lookup Table accounts referenced by a swap response.
 * These are required to deserialize a v0 message that uses ALT compression.
 */
export async function fetchAddressLookupTables(connection, addresses = []) {
  if (!addresses.length) return [];
  const pks = addresses.map((a) => new PublicKey(a));
  const infos = await connection.getMultipleAccountsInfo(pks, "confirmed");
  const out = [];
  for (let i = 0; i < pks.length; i++) {
    const info = infos[i];
    if (!info) continue;
    out.push(
      new AddressLookupTableAccount({
        key: pks[i],
        state: AddressLookupTableAccount.deserialize(info.data),
      })
    );
  }
  return out;
}

async function safeText(r) {
  try { return await r.text(); } catch { return ""; }
}
