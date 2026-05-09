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
 * Convert a USD amount to the output asset's token amount using its usdRef.
 * Pure UI estimate — Jupiter's actual quote determines the real outAmount.
 */
export function usdToTokenAmount(usdAmount, asset) {
  if (!asset || !asset.usdRef || asset.usdRef <= 0) return 0;
  return usdAmount / asset.usdRef;
}

/**
 * Format a token amount with the asset's display decimals + locale separators.
 * Returns "1,234.56" style. Pair with the symbol externally.
 */
export function formatTokenAmount(amount, asset) {
  if (!asset) return "0";
  const dec = asset.displayDecimals ?? 4;
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
