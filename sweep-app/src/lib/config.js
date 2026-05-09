import { PublicKey } from "@solana/web3.js";

// RPC endpoint. Public mainnet by default; replace with Helius/Triton/QuickNode in prod
// (the public RPC is rate-limited and will be slow on heavy scans).
//   echo 'VITE_RPC_ENDPOINT=https://your-helius-or-triton-url' >> .env.local
export const RPC_ENDPOINT =
  import.meta.env.VITE_RPC_ENDPOINT?.trim() ||
  "https://api.mainnet-beta.solana.com";

export const COMMITMENT = "confirmed";

// On-chain reference constants — required infrastructure, not mock data.
export const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
export const WSOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");

// $SWEEP token mint — env-driven. Required to enable the SWEEP destination
// option in the UI; without it the picker only offers USDC and SOL.
export const SWEEP_MINT = (() => {
  const raw = import.meta.env.VITE_SWEEP_MINT?.trim();
  if (!raw) return null;
  try {
    return new PublicKey(raw);
  } catch {
    console.warn("[config] VITE_SWEEP_MINT is not a valid base58 pubkey:", raw);
    return null;
  }
})();

// Per-destination platform fee (basis points). Lower fee on $SWEEP is the
// loyalty incentive for holders.
export const FEE_BPS = {
  usdc:  500, // 5%
  sol:   400, // 4%
  sweep: 300, // 3%
};

// Wallet that owns the per-output-mint ATAs that collect Jupiter platform
// fees. When unset, the fee is displayed in the UI but NOT actually
// diverted (Jupiter ignores platformFeeBps without a feeAccount).
//   echo 'VITE_FEE_AUTHORITY=<base58 owner pubkey>' >> .env.local
export const FEE_AUTHORITY = (() => {
  const raw = import.meta.env.VITE_FEE_AUTHORITY?.trim();
  if (!raw) return null;
  try {
    return new PublicKey(raw);
  } catch {
    console.warn("[config] VITE_FEE_AUTHORITY is not a valid base58 pubkey:", raw);
    return null;
  }
})();

// Dust threshold: any token whose USD value is < this gets surfaced.
// Tunable per UX. Solana dust is typically <$5.
export const DUST_THRESHOLD_USD = 5;

// Don't bother sweeping tokens whose USD value is below this floor —
// not worth the priority fee + rounding.
export const MIN_SWEEPABLE_USD = 0.05;

// Swap slippage tolerance for dust (thin liquidity → wider band).
export const SLIPPAGE_BPS = 300; // 3%

// Priority fee tuning. We pay enough to land under congestion without overspending.
export const PRIORITY_FEE_MICROLAMPORTS = 50_000;

// Solana hard limit; we pack to ~1100 to leave headroom for signature + serialization variance.
export const TX_SIZE_LIMIT = 1232;
export const TX_PACK_BUDGET = 1100;

// Per-ATA rent. Closing an emptied SPL token account refunds this much
// native SOL to the wallet — it's user-owned SOL that was previously
// locked for rent exemption, NOT protocol revenue.
export const RENT_PER_ACCOUNT_SOL = 0.00203928;

// SOL/USD reference for surfacing rent reclaim in dollar terms in the UI.
// In production, swap to a live price feed (Pyth/Jupiter price API).
export const SOL_USD_REF = 150;

// Jupiter public endpoints.
//   Quote v6 + swap-instructions  — atomic-batch composition
//   Price v3                      — USD valuation (batched, lightweight)
//   Tokens v2 search              — symbol/icon/decimals lookup (chunked)
//
// (Old /price/v2 and token.jup.ag/strict are dead — removed in late 2024/2025.)
export const JUP_QUOTE_URL = "https://quote-api.jup.ag/v6/quote";
export const JUP_SWAP_IX_URL = "https://quote-api.jup.ag/v6/swap-instructions";
export const JUP_PRICE_URL = "https://lite-api.jup.ag/price/v3";
export const JUP_TOKENS_SEARCH_URL = "https://lite-api.jup.ag/tokens/v2/search";

// Native SOL is wrapped to WSOL by Jupiter when a swap input — we set the flag on requests.
export const WRAP_AND_UNWRAP_SOL = true;
