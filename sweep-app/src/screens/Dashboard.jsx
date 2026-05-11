import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { motion } from "framer-motion";
import { ArrowRight, Copy, ExternalLink, LogOut } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Particles from "../components/Particles";
import CountUp from "../components/CountUp";
import { Card, GlassCard, MicroLabel, PrimaryButton } from "../components/UI";
import { USDC_MINT } from "../lib/config";
import { fetchSolBalance, fetchUsdcBalance } from "../lib/solana/tokenAccounts";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { loadHistory, summarize } from "../lib/history";
import { SCREENS } from "../lib/screens";
import { haptic } from "../lib/haptics";

const ease = [0.16, 1, 0.3, 1];

const OUTPUT_LABEL = {
  usdc: { symbol: "USDC", color: "#7CFFB2" },
  sol:  { symbol: "SOL",  color: "#9945FF" },
  sweep:{ symbol: "SWEEP",color: "#FF4FD8" },
};

function relativeTime(ts) {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const d = Math.floor(s / 86400);
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

export default function Dashboard({ go }) {
  const { connection } = useConnection();
  const { publicKey, disconnect, connected } = useWallet();
  const [usdc, setUsdc] = useState(0);
  const [sol, setSol] = useState(0);
  const [copied, setCopied] = useState(false);

  // History is keyed by wallet pubkey — reconnecting the same wallet on
  // this device brings back the rows that Success.jsx wrote.
  const pubkeyStr = publicKey?.toBase58() ?? null;
  const records = useMemo(() => loadHistory(pubkeyStr), [pubkeyStr]);
  const stats = useMemo(() => summarize(records), [records]);

  // Live balances for the connected wallet — fetched in parallel.
  useEffect(() => {
    if (!connected || !publicKey) return;
    let cancelled = false;
    (async () => {
      try {
        const [usdcBal, lamports] = await Promise.all([
          fetchUsdcBalance(connection, publicKey, USDC_MINT),
          fetchSolBalance(connection, publicKey),
        ]);
        if (cancelled) return;
        setUsdc(usdcBal);
        setSol(lamports / LAMPORTS_PER_SOL);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [connected, publicKey, connection]);

  const walletShort = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}…${publicKey.toBase58().slice(-4)}`
    : "Not connected";

  const onCopyAddress = async () => {
    if (!publicKey) return;
    haptic.medium?.();
    try {
      await navigator.clipboard.writeText(publicKey.toBase58());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  return (
    <div className="relative w-full h-full">
      <Particles mode="ambient" count={40} className="opacity-40" />

      <div className="relative z-10 h-full flex flex-col px-5 pt-10 pb-6 overflow-y-auto no-scrollbar">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease }}
          className="flex items-start justify-between gap-2"
        >
          <div className="min-w-0 flex-1">
            <div className="text-[15px] text-text-secondary">Hey, duster</div>
            <button
              onClick={onCopyAddress}
              className="font-mono text-[12px] text-text-muted tracking-wider mt-1 inline-flex items-center gap-1.5"
            >
              <span>{walletShort}</span>
              {copied ? <span className="text-sweep text-[10px]">copied</span> : <Copy size={10} />}
            </button>
          </div>
          <button
            onClick={async () => { await disconnect(); go(SCREENS.SPLASH); }}
            className="w-9 h-9 rounded-full glass flex items-center justify-center text-text-secondary"
            aria-label="Disconnect"
            title="Disconnect"
          >
            <LogOut size={14} />
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease }}
          className="mt-4"
        >
          <GlassCard padding="p-5">
            <MicroLabel>Total cleaned</MicroLabel>
            <div className="mt-1 font-display font-bold text-[42px] text-gradient-found leading-none tabular-nums">
              <CountUp to={stats.totalCleaned} duration={900} prefix="$" decimals={2} />
            </div>
            <div className="mt-1 text-[11px] text-text-muted">
              local history — tracked on this device only
            </div>
            <div className="mt-3 flex items-center justify-between text-[12px] text-text-muted">
              <span className="font-mono tabular-nums">
                {stats.sweeps} sweep{stats.sweeps === 1 ? "" : "s"} · {stats.signatures} signature{stats.signatures === 1 ? "" : "s"}
              </span>
              <span className="font-mono tabular-nums">{stats.tokens} token{stats.tokens === 1 ? "" : "s"}</span>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease }}
          className="mt-3 grid grid-cols-2 gap-3"
        >
          <Card className="p-4">
            <MicroLabel>Live USDC</MicroLabel>
            <div className="mt-2 font-display font-bold text-[24px] text-text-primary tabular-nums">
              ${usdc.toFixed(2)}
            </div>
            <div className="text-[11px] text-text-muted mt-0.5">in your wallet now</div>
          </Card>

          <Card className="p-4">
            <MicroLabel>Live SOL</MicroLabel>
            <div className="mt-2 font-display font-bold text-[24px] text-text-primary tabular-nums">
              {sol.toFixed(4)}
            </div>
            <div className="text-[11px] text-text-muted mt-0.5">native balance</div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25, ease }}
          className="mt-3 flex items-center justify-between px-1"
        >
          <span className="text-[11px] text-text-muted font-mono uppercase tracking-wider">
            Mainnet
          </span>
          <a
            href={publicKey ? `https://solscan.io/account/${publicKey.toBase58()}` : "#"}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-sweep font-semibold inline-flex items-center gap-1"
          >
            View on Solscan <ExternalLink size={10} />
          </a>
        </motion.div>

        {/* History list — chronological per-wallet sweeps. */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease }}
          className="mt-4"
        >
          <div className="flex items-center justify-between mb-2">
            <MicroLabel>Sweep history</MicroLabel>
            {records.length > 0 && (
              <span className="text-[11px] text-text-muted font-mono">
                {records.length}
              </span>
            )}
          </div>
          {records.length === 0 ? (
            <div
              className="px-4 py-5 rounded-md text-center"
              style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px dashed rgba(255,255,255,0.10)",
              }}
            >
              <div className="text-[13px] text-text-secondary leading-snug">
                No sweeps yet.
              </div>
              <div className="text-[11px] text-text-muted mt-1">
                Your past cleans will show up here after the first sweep.
              </div>
            </div>
          ) : null}
          {records.length > 0 && (
            <div className="flex flex-col gap-2">
              {records.slice(0, 8).map((r) => {
                const label = OUTPUT_LABEL[r.outputAsset] ?? OUTPUT_LABEL.usdc;
                const sig = r.txSigs?.[0];
                return (
                  <a
                    key={(sig ?? "") + r.ts}
                    href={sig ? `https://solscan.io/tx/${sig}` : "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md"
                    style={{
                      background: "rgba(255,255,255,0.025)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center font-display font-bold text-[9px] text-void shrink-0"
                      style={{
                        background: `radial-gradient(circle at 30% 30%, ${label.color}, ${label.color}aa)`,
                      }}
                    >
                      {label.symbol === "SWEEP" ? "✦" : label.symbol[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-display font-semibold text-text-primary leading-none">
                        +${(r.totalUnlockedUsd ?? 0).toFixed(2)}
                        <span className="text-text-muted font-mono text-[11px] ml-1.5">
                          → {label.symbol}
                        </span>
                      </div>
                      <div className="text-[11px] text-text-muted mt-1 font-mono tabular-nums">
                        {r.tokenCount} token{r.tokenCount === 1 ? "" : "s"}
                        {r.skippedCount ? ` · ${r.skippedCount} skipped` : ""}
                        {" · "}{relativeTime(r.ts)}
                      </div>
                    </div>
                    {sig && <ExternalLink size={12} className="text-text-muted shrink-0" />}
                  </a>
                );
              })}
            </div>
          )}
        </motion.div>

        <div className="flex-1 min-h-3" />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4, ease }}
          className="mt-4"
        >
          <PrimaryButton
            icon={<ArrowRight size={20} strokeWidth={2.5} />}
            hapticType="medium"
            onClick={() => go(SCREENS.SCAN)}
          >
            {records.length > 0 ? "Scan again" : "Scan wallet"}
          </PrimaryButton>
        </motion.div>
      </div>
    </div>
  );
}
