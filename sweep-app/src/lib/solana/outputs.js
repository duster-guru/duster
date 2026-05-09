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
    symbol: "$SWEEP",
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
      { icon: "✧", title: "Bonus airdrops", text: "Eligible for monthly $SWEEP rewards based on volume." },
      { icon: "◈", title: "Priority routing", text: "Jupiter route boost for $SWEEP holders." },
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
 * Sensible display decimals based on the actual price magnitude. Low-priced
 * tokens (<$0.01) need many decimals to be meaningful; high-priced tokens
 * (>$100) only need 4.
 */
export function decimalsForPrice(price, fallback = 4) {
  if (!price || price <= 0) return fallback;
  if (price >= 100) return 4;     // SOL-like
  if (price >= 1)   return 2;     // USDC-like / SWEEP at $1+
  if (price >= 0.01) return 2;    // SWEEP at cents
  if (price >= 0.0001) return 0;  // SWEEP at fractions of a cent
  return 0;                       // ultra-low — show whole units
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

/**
 * Format a token amount with decimals chosen from the live (or fallback)
 * price magnitude. Returns "1,234.56" style.
 */
export function formatTokenAmount(amount, asset, livePrices) {
  if (!asset) return "0";
  const price = getEffectivePrice(asset, livePrices);
  const dec = livePrices && livePrices[asset.id]
    ? decimalsForPrice(price, asset.displayDecimals)
    : (asset.displayDecimals ?? 4);
  return Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
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
