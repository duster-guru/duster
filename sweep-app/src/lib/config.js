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

// $SWEEP token — opt-in destination for the "+10% bonus" mode. The bonus
// itself is a protocol-funded airdrop paid post-sweep (Jupiter only delivers
// market price). Set VITE_SWEEP_MINT to enable the toggle in the UI.
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
export const SWEEP_BONUS_BPS = 1000; // 10% display bonus; settled off-band

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
