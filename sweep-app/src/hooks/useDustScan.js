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
import { fetchTokenList, tokenInfo } from "../lib/solana/tokenList";

/**
 * Real dust scan hook. Reads token accounts, prices them via Jupiter, classifies
 * by program, and exposes a consistent shape to screens.
 *
 * Returns:
 *   status:    'idle' | 'scanning' | 'ready' | 'error' | 'empty'
 *   progress:  0-100  — coarse phase progress for UX
 *   message:   string  — current phase status text
 *   dust:      [{ mint, ata, amount, decimals, programId, symbol, name, logoURI,
 *                 priceUsd, valueUsd, color, groupId, isUnverified }]
 *   totals:    aggregated dust value, count, group count, fee/rent estimates
 *   usdcBefore: USDC balance at scan time (for post-tx delta on success)
 *   error:     Error | null
 *   refresh(): retrigger
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
      // Phase 1 — RPC: token accounts (parallel with USDC pre-balance)
      setProgress(10);
      const [accounts, usdc] = await Promise.all([
        fetchTokenAccounts(connection, publicKey),
        fetchUsdcBalance(connection, publicKey, USDC_MINT),
      ]);
      if (cancelled.current) return;
      setUsdcBefore(usdc);
      setProgress(35);

      // Phase 2 — token metadata (Jupiter strict list)
      setMessage("Loading token metadata…");
      const list = await fetchTokenList().catch(() => null);
      if (cancelled.current) return;
      setProgress(55);

      // Phase 3 — pricing (Jupiter price API)
      setMessage("Pricing via Jupiter…");
      const mints = accounts
        .filter((a) => a.uiAmount > 0)
        .map((a) => a.mint);
      const priceMap = await fetchPrices(mints);
      if (cancelled.current) return;
      setProgress(80);

      // Phase 4 — classify dust
      setMessage("Filtering routable dust…");
      const enriched = accounts
        .filter((a) => a.uiAmount > 0)
        .map((a) => {
          const info = tokenInfo(list, a.mint, a.decimals);
          const priceUsd = priceMap.get(a.mint) || 0;
          const valueUsd = priceUsd * a.uiAmount;
          return {
            mint: a.mint,
            ata: a.ata,
            amount: a.amount,
            decimals: a.decimals,
            programId: a.programId,
            uiAmount: a.uiAmount,
            symbol: info?.symbol || shortMint(a.mint),
            name: info?.name || "Unknown",
            logoURI: info?.logoURI || null,
            tags: info?.tags || [],
            isUnverified: !!info?.isUnverified,
            color: pickColor(a.mint),
            priceUsd,
            valueUsd,
            groupId: classifyGroup(a.programId),
          };
        });

      const sweepable = enriched
        .filter(
          (t) =>
            t.valueUsd > 0 &&
            t.valueUsd < DUST_THRESHOLD_USD &&
            t.valueUsd >= MIN_SWEEPABLE_USD &&
            // Skip USDC itself — sweeping into USDC means USDC is the destination, not input.
            t.mint !== USDC_MINT.toBase58()
        )
        .sort((a, b) => b.valueUsd - a.valueUsd);

      if (cancelled.current) return;
      setDust(sweepable);
      setProgress(100);
      setStatus(sweepable.length === 0 ? "empty" : "ready");
      setMessage(sweepable.length === 0 ? "Wallet is already clean" : "Dust ready to sweep");
    } catch (e) {
      if (cancelled.current) return;
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
    refresh: run,
  };
}

function shortMint(m) {
  return m ? `${m.slice(0, 4)}…${m.slice(-4)}` : "???";
}

// Stable color from mint hash for rows that lack a logo.
function pickColor(mint) {
  if (!mint) return "#5B8CFF";
  let h = 0;
  for (let i = 0; i < mint.length; i++) h = (h * 31 + mint.charCodeAt(i)) >>> 0;
  const palette = ["#7CFFB2", "#5B8CFF", "#FF4FD8", "#FFD27A", "#34E1A2", "#9945FF", "#14F195", "#FF8E5C", "#FF6B7A"];
  return palette[h % palette.length];
}
