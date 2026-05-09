import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { motion } from "framer-motion";
import { ArrowRight, Copy, ExternalLink, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import Particles from "../components/Particles";
import CountUp from "../components/CountUp";
import { Card, GlassCard, MicroLabel, PrimaryButton } from "../components/UI";
import { USDC_MINT } from "../lib/config";
import { fetchUsdcBalance } from "../lib/solana/tokenAccounts";
import { SCREENS } from "../lib/screens";
import { haptic } from "../lib/haptics";

const ease = [0.16, 1, 0.3, 1];

// Real local-only stats tracked in localStorage. No backend, no mocking — just
// counters incremented on every successful sweep.
const STATS_KEY = "sweep:stats:v1";

function loadStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { totalCleaned: 0, sweeps: 0, signatures: 0, tokens: 0 };
    return { totalCleaned: 0, sweeps: 0, signatures: 0, tokens: 0, ...JSON.parse(raw) };
  } catch {
    return { totalCleaned: 0, sweeps: 0, signatures: 0, tokens: 0 };
  }
}

export default function Dashboard({ go, scan, exec }) {
  const { connection } = useConnection();
  const { publicKey, disconnect, connected } = useWallet();
  const [usdc, setUsdc] = useState(0);
  const [stats, setStats] = useState(loadStats);
  const [copied, setCopied] = useState(false);

  // Persist sweep into local stats once exec finishes successfully.
  useEffect(() => {
    if (exec.phase === "success" && exec.usdcAfter != null) {
      const before = scan.usdcBefore || 0;
      const delta = Math.max(0, +(exec.usdcAfter - before).toFixed(2));
      const sweepCount = (exec.signatures || []).length;
      const tokensCount = (scan.dust || []).length;
      const next = {
        totalCleaned: +(stats.totalCleaned + delta).toFixed(2),
        sweeps: stats.sweeps + 1,
        signatures: stats.signatures + sweepCount,
        tokens: stats.tokens + tokensCount,
      };
      try {
        localStorage.setItem(STATS_KEY, JSON.stringify(next));
        setStats(next);
      } catch { /* ignore quota errors */ }
      // reset exec so we don't double-count on remount
      exec.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exec.phase]);

  // Live USDC balance for the connected wallet.
  useEffect(() => {
    if (!connected || !publicKey) return;
    let cancelled = false;
    (async () => {
      try {
        const v = await fetchUsdcBalance(connection, publicKey, USDC_MINT);
        if (!cancelled) setUsdc(v);
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
            <div className="text-[15px] text-text-secondary">Hey, sweeper</div>
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
                {stats.sweeps} sweeps · {stats.signatures} signatures
              </span>
              <span className="font-mono tabular-nums">{stats.tokens} tokens</span>
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
            <MicroLabel>Network</MicroLabel>
            <div className="mt-2 font-display font-bold text-[18px] text-text-primary">
              Mainnet
            </div>
            <a
              href={publicKey ? `https://solscan.io/account/${publicKey.toBase58()}` : "#"}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-sweep mt-0.5 font-semibold inline-flex items-center gap-1"
            >
              Solscan <ExternalLink size={10} />
            </a>
          </Card>
        </motion.div>

        <div className="flex-1 min-h-3" />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease }}
        >
          <PrimaryButton
            icon={<ArrowRight size={20} strokeWidth={2.5} />}
            hapticType="medium"
            onClick={() => go(SCREENS.SCAN)}
          >
            Clean Again
          </PrimaryButton>
        </motion.div>
      </div>
    </div>
  );
}
