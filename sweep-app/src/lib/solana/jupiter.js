import {
  AddressLookupTableAccount,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  JUP_QUOTE_URL,
  JUP_SWAP_IX_URL,
  SLIPPAGE_BPS,
  USDC_MINT,
  WRAP_AND_UNWRAP_SOL,
} from "../config";

/**
 * Get a Jupiter v6 route quote.
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
  const r = await fetch(`${JUP_QUOTE_URL}?${params}`);
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
    useSharedAccounts: true,
    asLegacyTransaction: false,
    dynamicComputeUnitLimit: false, // we set our own
  };
  if (destinationTokenAccount) {
    body.destinationTokenAccount = destinationTokenAccount.toBase58?.() || destinationTokenAccount;
  }
  if (feeAccount) {
    body.feeAccount = feeAccount.toBase58?.() || feeAccount;
  }
  const r = await fetch(JUP_SWAP_IX_URL, {
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
