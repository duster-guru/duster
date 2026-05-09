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

// Jupiter v6 endpoints (public). Quote / swap-instructions for atomic-batch composition,
// price for USD valuation. Token list (strict/verified) for symbols + logos + tags.
export const JUP_QUOTE_URL = "https://quote-api.jup.ag/v6/quote";
export const JUP_SWAP_IX_URL = "https://quote-api.jup.ag/v6/swap-instructions";
export const JUP_PRICE_URL = "https://lite-api.jup.ag/price/v2";
export const JUP_TOKEN_LIST_URL = "https://token.jup.ag/strict";

// Native SOL is wrapped to WSOL by Jupiter when a swap input — we set the flag on requests.
export const WRAP_AND_UNWRAP_SOL = true;
