import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  DUST_THRESHOLD_USD,
  MIN_SWEEPABLE_USD,
  USDC_MINT,
} from "../lib/config";
import { fetchPrices } from "../lib/solana/pricing";
import { classifyGroup } from "../lib/solana/groups";
import {
  fetchTokenAccounts,
  fetchUsdcBalance,
} from "../lib/solana/tokenAccounts";
import { fetchTokenInfos, tokenInfo } from "../lib/solana/tokenList";

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
  const [diag, setDiag] = useState({
    accountCount: 0,
    nonZeroCount: 0,
    pricedCount: 0,
    aboveThresholdCount: 0,
    belowMinCount: 0,
    usdcSelf: 0,
  });
  const cancelled = useRef(false);

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
      const [accounts, usdc] = await Promise.all([
        fetchTokenAccounts(connection, publicKey),
        fetchUsdcBalance(connection, publicKey, USDC_MINT),
      ]);
      if (cancelled.current) return;
      setUsdcBefore(usdc);

      const nonZero = accounts.filter((a) => a.uiAmount > 0);
      console.log("[scan] accounts:", accounts.length, "non-zero:", nonZero.length);
      setProgress(35);

      setMessage("Pricing via Jupiter…");
      const mints = nonZero.map((a) => a.mint);
      const priceMap = await fetchPrices(mints);
      if (cancelled.current) return;
      console.log("[scan] priced:", priceMap.size, "/", mints.length);
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

      // Metadata for the dust subset only — saves bandwidth.
      setMessage("Loading token metadata…");
      setProgress(80);
      const tokenInfoMap = await fetchTokenInfos(sweepable.map((t) => t.mint));
      if (cancelled.current) return;

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
          groupId: classifyGroup(t.programId),
        };
      });

      setDust(enriched);
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

  return {
    status,
    progress,
    message,
    dust,
    usdcBefore,
    error,
    diag,
    refresh: run,
  };
}

function pickColor(mint) {
  if (!mint) return "#5B8CFF";
  let h = 0;
  for (let i = 0; i < mint.length; i++) h = (h * 31 + mint.charCodeAt(i)) >>> 0;
  const palette = ["#7CFFB2", "#5B8CFF", "#FF4FD8", "#FFD27A", "#34E1A2", "#9945FF", "#14F195", "#FF8E5C", "#FF6B7A"];
  return palette[h % palette.length];
}
