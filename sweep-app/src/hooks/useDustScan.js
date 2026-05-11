import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  CLOSE_ONLY_THRESHOLD_USD,
  DUST_THRESHOLD_USD,
  MIN_SWEEPABLE_USD,
  SWEEP_MINT,
  USDC_MINT,
  WSOL_MINT,
} from "../lib/config";
import { fetchPrices } from "../lib/solana/pricing";
import { classifyGroup } from "../lib/solana/groups";
import {
  fetchSolBalance,
  fetchTokenAccounts,
  fetchUsdcBalance,
} from "../lib/solana/tokenAccounts";
import { fetchTokenInfos, tokenInfo } from "../lib/solana/tokenList";

// How many of the priced token mints we ask Jupiter for full metadata on.
// Top 30 holdings cover the portfolio chart (top-5 + other) AND the dust
// list; beyond that, fallbacks (mint-derived symbol/colour) are fine.
const PORTFOLIO_METADATA_LIMIT = 30;

/**
 * Real dust scan hook.
 *
 * Pipeline:
 *   1. RPC: getParsedTokenAccountsByOwner × Token + Token-2022 (parallel
 *      with USDC pre-balance fetch)
 *   2. Jupiter Price v3: batched USD prices for every mint with >0 balance
 *   3. Filter to dust (USD ∈ [MIN, THRESHOLD], not USDC, has price)
 *   4. Jupiter Tokens v2/search: symbols + icons for the dust subset only
 *   5. Build enriched records for the UI
 *
 * Diagnostics counters are exposed in `diag` so empty states can show *why*
 * a wallet looked empty (no accounts vs no priceable tokens vs all > $5).
 */
export default function useDustScan() {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();

  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [dust, setDust] = useState([]);
  const [usdcBefore, setUsdcBefore] = useState(0);
  const [error, setError] = useState(null);
  // Live USD prices for the swap-output assets (USDC/SOL/SWEEP), snapshotted
  // at scan time. Each component reads its asset's id and falls back to the
  // env-derived usdRef if Jupiter didn't return a price.
  const [outputPrices, setOutputPrices] = useState({});
  const [outputIcons, setOutputIcons] = useState({});
  const [pricesRefreshing, setPricesRefreshing] = useState(false);
  const [lastPriceUpdateAt, setLastPriceUpdateAt] = useState(null);
  // Full portfolio (NOT just dust): every priced holding the wallet
  // owns, including native SOL as a synthetic entry. Sorted by USD value
  // desc. Dashboard uses this for the total-balance card + top-5 chart.
  const [holdings, setHoldings] = useState([]);
  const [portfolioUsd, setPortfolioUsd] = useState(0);
  const [dustableUsd, setDustableUsd] = useState(0);
  const [diag, setDiag] = useState({
    accountCount: 0,
    nonZeroCount: 0,
    pricedCount: 0,
    aboveThresholdCount: 0,
    belowMinCount: 0,
    usdcSelf: 0,
  });
  const cancelled = useRef(false);
  // Refs so the periodic refresher reads the latest dust list without
  // re-creating the interval every render.
  const dustRef = useRef([]);
  useEffect(() => { dustRef.current = dust; }, [dust]);

  const run = useCallback(async () => {
    if (!publicKey) {
      setStatus("idle");
      return;
    }
    cancelled.current = false;
    setStatus("scanning");
    setProgress(0);
    setError(null);
    setMessage("Reading token accounts…");

    try {
      setProgress(10);
      const [accounts, usdc, solLamports] = await Promise.all([
        fetchTokenAccounts(connection, publicKey),
        fetchUsdcBalance(connection, publicKey, USDC_MINT),
        fetchSolBalance(connection, publicKey),
      ]);
      if (cancelled.current) return;
      setUsdcBefore(usdc);
      const solUi = solLamports / LAMPORTS_PER_SOL;

      const nonZero = accounts.filter((a) => a.uiAmount > 0);
      console.log("[scan] accounts:", accounts.length, "non-zero:", nonZero.length);
      setProgress(35);

      setMessage("Pricing via Jupiter…");
      // Add the swap-output mints to the same price call so we can show
      // accurate "you'll get N TOKEN" estimates without a separate request.
      const dustMints = nonZero.map((a) => a.mint);
      const outputMints = [
        USDC_MINT.toBase58(),
        WSOL_MINT.toBase58(),
        SWEEP_MINT?.toBase58(),
      ].filter(Boolean);
      const priceMap = await fetchPrices([
        ...new Set([...dustMints, ...outputMints]),
      ]);
      if (cancelled.current) return;

      // Snapshot output-asset prices for downstream screens.
      const outPrices = {
        usdc: priceMap.get(USDC_MINT.toBase58()) ?? 1,
        sol: priceMap.get(WSOL_MINT.toBase58()) ?? null,
        sweep: SWEEP_MINT ? (priceMap.get(SWEEP_MINT.toBase58()) ?? null) : null,
      };
      setOutputPrices(outPrices);
      setLastPriceUpdateAt(Date.now());
      console.log("[scan] priced dust:", priceMap.size - outputMints.filter(m => priceMap.has(m)).length, "/", dustMints.length, "outputs:", outPrices);
      setProgress(60);

      // Compute USD value for each non-zero account
      const valued = nonZero.map((a) => ({
        ...a,
        priceUsd: priceMap.get(a.mint) || 0,
        valueUsd: (priceMap.get(a.mint) || 0) * a.uiAmount,
      }));

      // Dust filter
      const sweepable = valued
        .filter(
          (t) =>
            t.valueUsd > 0 &&
            t.valueUsd < DUST_THRESHOLD_USD &&
            t.valueUsd >= MIN_SWEEPABLE_USD &&
            t.mint !== USDC_MINT.toBase58()
        )
        .sort((a, b) => b.valueUsd - a.valueUsd);

      const aboveThresholdCount = valued.filter(
        (t) => t.valueUsd >= DUST_THRESHOLD_USD
      ).length;
      const belowMinCount = valued.filter(
        (t) => t.valueUsd > 0 && t.valueUsd < MIN_SWEEPABLE_USD
      ).length;
      const pricedCount = valued.filter((t) => t.valueUsd > 0).length;

      console.log(
        "[scan] sweepable:", sweepable.length,
        "above $5:", aboveThresholdCount,
        "below $0.05:", belowMinCount,
        "unpriced:", nonZero.length - pricedCount
      );

      setDiag({
        accountCount: accounts.length,
        nonZeroCount: nonZero.length,
        pricedCount,
        aboveThresholdCount,
        belowMinCount,
        usdcSelf: usdc,
      });

      // Metadata for the dust subset + the wallet's top priced holdings
      // (so the dashboard chart can render real logos for the top-5
      // portfolio slices) + output mints (destination picker icons).
      // Bounded at PORTFOLIO_METADATA_LIMIT to keep the Jupiter token
      // search payload reasonable on whale wallets.
      setMessage("Loading token metadata…");
      setProgress(80);
      const topByValue = [...valued]
        .filter((t) => t.valueUsd > 0)
        .sort((a, b) => b.valueUsd - a.valueUsd)
        .slice(0, PORTFOLIO_METADATA_LIMIT)
        .map((t) => t.mint);
      const metadataMints = [
        ...sweepable.map((t) => t.mint),
        ...topByValue,
        USDC_MINT.toBase58(),
        WSOL_MINT.toBase58(),
        SWEEP_MINT?.toBase58(),
      ].filter(Boolean);
      const tokenInfoMap = await fetchTokenInfos([...new Set(metadataMints)]);
      if (cancelled.current) return;

      // Output icon URLs for the destination picker.
      setOutputIcons({
        usdc: tokenInfoMap.get(USDC_MINT.toBase58())?.icon || null,
        sol: tokenInfoMap.get(WSOL_MINT.toBase58())?.icon || null,
        sweep: SWEEP_MINT
          ? tokenInfoMap.get(SWEEP_MINT.toBase58())?.icon || null
          : null,
      });

      const enriched = sweepable.map((t) => {
        const info = tokenInfo(tokenInfoMap, t.mint, t.decimals);
        return {
          mint: t.mint,
          ata: t.ata,
          amount: t.amount,
          decimals: t.decimals,
          programId: t.programId,
          uiAmount: t.uiAmount,
          symbol: info.symbol,
          name: info.name,
          logoURI: info.logoURI,
          tags: info.tags,
          isUnverified: info.isUnverified,
          color: pickColor(t.mint),
          priceUsd: t.priceUsd,
          valueUsd: t.valueUsd,
          // Sub-cent dust where the swap output is negligible — user is
          // really sweeping for rent reclaim. UI badges these rows.
          closeOnly: t.valueUsd < CLOSE_ONLY_THRESHOLD_USD,
          groupId: classifyGroup(t.programId),
        };
      });

      setDust(enriched);

      // Full portfolio: every priced holding + a synthetic native-SOL row.
      // Sorted desc by USD so the chart's top-5 selection is trivial.
      const solPrice = priceMap.get(WSOL_MINT.toBase58()) ?? 0;
      const tokenHoldings = valued
        .filter((t) => t.valueUsd > 0)
        .map((t) => {
          const info = tokenInfo(tokenInfoMap, t.mint, t.decimals);
          return {
            mint: t.mint,
            symbol: info.symbol,
            name: info.name,
            logoURI: info.logoURI,
            uiAmount: t.uiAmount,
            priceUsd: t.priceUsd,
            valueUsd: t.valueUsd,
            color: pickColor(t.mint),
            isNative: false,
          };
        });
      const portfolio = [
        ...(solPrice > 0 && solUi > 0
          ? [{
              mint: WSOL_MINT.toBase58(),
              symbol: "SOL",
              name: "Solana",
              logoURI: tokenInfoMap.get(WSOL_MINT.toBase58())?.icon || null,
              uiAmount: solUi,
              priceUsd: solPrice,
              valueUsd: solUi * solPrice,
              color: "#9945FF",
              isNative: true,
            }]
          : []),
        ...tokenHoldings,
      ].sort((a, b) => b.valueUsd - a.valueUsd);
      setHoldings(portfolio);
      setPortfolioUsd(+portfolio.reduce((s, h) => s + h.valueUsd, 0).toFixed(2));
      setDustableUsd(+sweepable.reduce((s, t) => s + (t.valueUsd || 0), 0).toFixed(2));

      setProgress(100);
      setStatus(enriched.length === 0 ? "empty" : "ready");
      setMessage(enriched.length === 0 ? "No sweepable dust" : "Dust ready to sweep");
    } catch (e) {
      if (cancelled.current) return;
      console.error("[scan] error:", e);
      setError(e);
      setStatus("error");
      setMessage(e.message || "Scan failed");
    }
  }, [connection, publicKey]);

  useEffect(() => {
    if (connected && publicKey) run();
    return () => { cancelled.current = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey?.toBase58()]);

  /**
   * Re-price the existing dust list + output mints without re-reading
   * token accounts from RPC. Cheap (one Jupiter call). Used by the
   * periodic refresher and the manual refresh button.
   */
  const refreshPrices = useCallback(async () => {
    const currentDust = dustRef.current;
    if (!publicKey || currentDust.length === 0) return;
    setPricesRefreshing(true);
    try {
      const dustMints = currentDust.map((d) => d.mint);
      const outputMints = [
        USDC_MINT.toBase58(),
        WSOL_MINT.toBase58(),
        SWEEP_MINT?.toBase58(),
      ].filter(Boolean);
      const newPriceMap = await fetchPrices([
        ...new Set([...dustMints, ...outputMints]),
      ]);

      setOutputPrices({
        usdc: newPriceMap.get(USDC_MINT.toBase58()) ?? 1,
        sol: newPriceMap.get(WSOL_MINT.toBase58()) ?? null,
        sweep: SWEEP_MINT ? (newPriceMap.get(SWEEP_MINT.toBase58()) ?? null) : null,
      });
      setLastPriceUpdateAt(Date.now());

      setDust((prev) =>
        prev.map((d) => {
          const newPrice = newPriceMap.get(d.mint);
          if (newPrice == null || !Number.isFinite(newPrice)) return d;
          const valueUsd = newPrice * d.uiAmount;
          return {
            ...d,
            priceUsd: newPrice,
            valueUsd,
            closeOnly: valueUsd < CLOSE_ONLY_THRESHOLD_USD,
          };
        })
      );
      console.log("[scan] prices refreshed");
    } catch (e) {
      console.warn("[scan] price refresh failed:", e?.message);
    } finally {
      setPricesRefreshing(false);
    }
  }, [publicKey]);

  // Auto-refresh prices every 30s while in 'ready' state.
  useEffect(() => {
    if (status !== "ready") return;
    const id = setInterval(refreshPrices, 30_000);
    return () => clearInterval(id);
  }, [status, refreshPrices]);

  return {
    status,
    progress,
    message,
    dust,
    usdcBefore,
    error,
    diag,
    outputPrices,
    outputIcons,
    pricesRefreshing,
    lastPriceUpdateAt,
    // Full portfolio breakdown for the dashboard's total + chart cards.
    holdings,
    portfolioUsd,
    dustableUsd,
    refresh: run,
    refreshPrices,
  };
}

function pickColor(mint) {
  if (!mint) return "#5B8CFF";
  let h = 0;
  for (let i = 0; i < mint.length; i++) h = (h * 31 + mint.charCodeAt(i)) >>> 0;
  const palette = ["#7CFFB2", "#5B8CFF", "#FF4FD8", "#FFD27A", "#34E1A2", "#9945FF", "#14F195", "#FF8E5C", "#FF6B7A"];
  return palette[h % palette.length];
}
