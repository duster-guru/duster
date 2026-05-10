import { FEE_BPS, SOL_USD_REF, SWEEP_MINT, SWEEP_USD_REF, USDC_MINT, WSOL_MINT } from "../config";

/**
 * Sweep output destinations. Each entry resolves a user-facing label
 * to (a) the on-chain mint we route to via Jupiter, (b) the platform
 * fee tier, and (c) the visual treatment used by all downstream screens.
 *
 * SOL is delivered as native SOL — Jupiter handles WSOL wrap/unwrap
 * internally when wrapAndUnwrapSol=true and outputMint=WSOL.
 *
 * SWEEP is gated on VITE_SWEEP_MINT being set (returns null entry otherwise).
 */
export const OUTPUT_ASSETS = {
  usdc: {
    id: "usdc",
    symbol: "USDC",
    name: "USDC stable",
    blurb: "The boring choice. Always 1:1 with the dollar.",
    mint: USDC_MINT,
    feeBps: FEE_BPS.usdc,
    color: "#7CFFB2",
    accent: "rgba(124,255,178",
    isNative: false,
    usdRef: 1,
    displayDecimals: 2,
    benefits: null,
  },
  sol: {
    id: "sol",
    symbol: "SOL",
    name: "Native SOL",
    blurb: "Stay in the ecosystem. Lower fee than USDC.",
    mint: WSOL_MINT,
    feeBps: FEE_BPS.sol,
    color: "#9945FF",
    accent: "rgba(153,69,255",
    isNative: true,
    usdRef: SOL_USD_REF,
    displayDecimals: 4,
    benefits: null,
  },
  sweep: {
    id: "sweep",
    symbol: "SWEEP",
    name: "SWEEP",
    blurb: "Lowest fee + holder rewards.",
    mint: SWEEP_MINT,
    feeBps: FEE_BPS.sweep,
    color: "#FF4FD8",
    accent: "rgba(255,79,216",
    isNative: false,
    usdRef: SWEEP_USD_REF,
    displayDecimals: SWEEP_USD_REF >= 1 ? 2 : 0,
    benefits: [
      { icon: "✦", title: "Lowest fee", text: "3% vs 5% USDC — save 40% per sweep." },
      { icon: "✧", title: "Bonus airdrops", text: "Eligible for monthly SWEEP rewards based on volume." },
      { icon: "◈", title: "Priority routing", text: "Jupiter route boost for SWEEP holders." },
      { icon: "◊", title: "Governance + staking", text: "Vote on dust threshold + earn yield (coming soon)." },
    ],
  },
};

/**
 * Resolve the effective USD/token price for an output asset.
 * Live price (from useDustScan.outputPrices) wins when available; otherwise
 * falls back to the env/static usdRef baked into the asset entry.
 */
export function getEffectivePrice(asset, livePrices) {
  if (!asset) return 1;
  const live = livePrices?.[asset.id];
  if (typeof live === "number" && live > 0) return live;
  return asset.usdRef ?? 1;
}

/**
 * Convert a USD amount to the output asset's token amount using a live or
 * fallback price.
 */
export function usdToTokenAmount(usdAmount, asset, livePrices) {
  const price = getEffectivePrice(asset, livePrices);
  if (!price || price <= 0) return 0;
  return usdAmount / price;
}

// Uniform decimal precision for all "you get" token amounts. Mixing
// per-asset precision (USDC 2, SOL 4, SWEEP variable) made the output
// cards visually inconsistent — every row now shows 4 decimals.
const TOKEN_AMOUNT_DECIMALS = 4;

/**
 * Format a token amount for the "you get" displays. Always 4 decimals so
 * USDC/SOL/SWEEP sit in the same visual column.
 */
export function formatTokenAmount(amount /* asset, livePrices */) {
  return Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: TOKEN_AMOUNT_DECIMALS,
    maximumFractionDigits: TOKEN_AMOUNT_DECIMALS,
  });
}

/**
 * Returns only the assets we can actually route to right now.
 * Filters out SWEEP if VITE_SWEEP_MINT is not configured.
 */
export function getAvailableOutputs() {
  return Object.values(OUTPUT_ASSETS).filter((a) => a.mint !== null);
}

export function getOutputAsset(id) {
  const a = OUTPUT_ASSETS[id];
  return a && a.mint ? a : OUTPUT_ASSETS.usdc;
}
