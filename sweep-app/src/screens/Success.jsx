import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { ArrowRight, ExternalLink, PenLine, Sparkles } from "lucide-react";
import { useEffect, useMemo } from "react";
import Particles from "../components/Particles";
import { GhostButton, HeroGlassCard, MicroLabel, PrimaryButton } from "../components/UI";
import { ALL_GROUP_IDS, summarizeGroups } from "../lib/solana/groups";
import { SCREENS } from "../lib/screens";
import { haptic } from "../lib/haptics";

const ease = [0.16, 1, 0.3, 1];

export default function Success({ go, scan, exec, filteredDust }) {
  // Real before/after USDC delta from RPC re-fetch.
  const usdcBefore = scan.usdcBefore || 0;
  const usdcAfter = exec.usdcAfter ?? usdcBefore;
  const delta = +(usdcAfter - usdcBefore).toFixed(2);

  // Group breakdown from the dust we actually swept.
  const groupSummaries = useMemo(
    () => summarizeGroups(filteredDust, ALL_GROUP_IDS),
    [filteredDust]
  );

  const groupCount = groupSummaries.length;
  const tokenCount = filteredDust.length;
  const dustTotal = +filteredDust.reduce((s, t) => s + (t.valueUsd || 0), 0).toFixed(2);

  useEffect(() => {
    haptic.success?.();
    const colors = ["#7CFFB2", "#FFD27A", "#5B8CFF"];
    const fire = (origin, n) =>
      confetti({
        particleCount: n, spread: 80, startVelocity: 45, origin, colors,
        gravity: 0.8, ticks: 200, scalar: 0.9,
      });
    fire({ x: 0.5, y: 0.4 }, 80);
    setTimeout(() => fire({ x: 0.3, y: 0.5 }, 40), 200);
    setTimeout(() => fire({ x: 0.7, y: 0.5 }, 40), 350);
  }, []);

  const gridCols = groupCount === 1 ? "grid-cols-1" : "grid-cols-2";

  // Per-group share of the swept value (proportional to dust value swept)
  const groupShares = groupSummaries.map((g) => {
    const share = dustTotal > 0 ? (g.total / dustTotal) * delta : 0;
    return { ...g, finalAmount: +share.toFixed(2) };
  });

  const txCount = exec.signatures?.length || 0;
  const firstSig = exec.signatures?.[0];

  return (
    <div className="relative w-full h-full overflow-hidden">
      <Particles mode="ambient" count={50} color="#7CFFB2" />

      <div
        className="absolute left-1/2 top-[16%] -translate-x-1/2 w-[260px] h-[260px] pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(124,255,178,0.3) 0%, transparent 60%)",
          filter: "blur(20px)",
        }}
      />

      <div className="relative z-10 h-full flex flex-col px-5 pt-10 pb-6 overflow-y-auto no-scrollbar">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="text-center"
        >
          <Sparkles size={28} className="mx-auto text-sweep mb-3" />
          <h1 className="font-display text-[34px] font-bold text-text-primary leading-tight">
            Wallet Cleaned
          </h1>
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full glass">
            <PenLine size={11} className="text-sweep" />
            <span className="text-[11px] text-text-secondary">
              <span className="font-mono tabular-nums text-text-primary font-semibold">{tokenCount}</span> tokens · {txCount} signed {txCount === 1 ? "tx" : "txs"}
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25, ease }}
          className="mt-5"
        >
          <HeroGlassCard>
            <div className="flex items-center justify-between mb-2">
              <MicroLabel>USDC balance</MicroLabel>
              <span className="font-mono text-[12px] text-text-muted tabular-nums">
                ${usdcBefore.toFixed(2)} → ${usdcAfter.toFixed(2)}
              </span>
            </div>

            <div className="flex items-baseline justify-center gap-2 my-3">
              <span className="font-display font-bold text-[40px] text-gradient-found tabular-nums">
                +${delta.toFixed(2)}
              </span>
              <span className="text-[14px] text-text-secondary">USDC</span>
            </div>

            <div className="flex flex-col items-center my-3">
              <motion.div
                animate={{ y: [0, 4, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                className="text-sweep"
              >
                <ArrowRight size={20} className="rotate-90" />
              </motion.div>
              <span className="text-[10px] tracking-[0.2em] uppercase text-sweep font-bold mt-0.5">SWEPT</span>
            </div>

            <div className="flex items-center justify-between mb-3">
              <MicroLabel color="mint">Per program</MicroLabel>
              <span className="font-mono text-[12px] text-sweep font-bold tabular-nums">
                {groupCount} program{groupCount === 1 ? "" : "s"}
              </span>
            </div>

            <div className={`grid ${gridCols} gap-2`}>
              {groupShares.map((f, i) => (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, y: 8, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.4 + i * 0.07, ease }}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-md"
                  style={{
                    background: `${f.color}10`,
                    border: `1px solid ${f.color}40`,
                  }}
                >
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full" style={{ width: 48, height: 48, border: `1.5px solid ${f.color}` }} />
                    <motion.div
                      className="w-[48px] h-[48px] rounded-full flex items-center justify-center font-display font-bold text-[10px] text-void"
                      style={{
                        background: "radial-gradient(circle at 30% 30%, #7CFFB2, #4DA877)",
                        boxShadow: "0 0 16px rgba(124,255,178,0.6)",
                      }}
                      animate={{ scale: [1, 1.04, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
                    >
                      USDC
                    </motion.div>
                  </div>
                  <div className="text-[9px] font-display font-bold uppercase tracking-wider" style={{ color: f.color }}>
                    {f.short}
                  </div>
                  <div className="text-[12px] font-mono font-bold text-text-primary tabular-nums leading-none">
                    ${f.finalAmount.toFixed(2)}
                  </div>
                </motion.div>
              ))}
            </div>

            {firstSig && (
              <a
                href={`https://solscan.io/tx/${firstSig}`}
                target="_blank"
                rel="noreferrer"
                className="mt-4 flex items-center justify-center gap-1.5 text-[12px] text-sweep font-mono"
              >
                <span className="truncate max-w-[180px]">{firstSig.slice(0, 8)}…{firstSig.slice(-8)}</span>
                <ExternalLink size={12} />
              </a>
            )}

            {exec.skipped && exec.skipped.length > 0 && (
              <div className="mt-3 px-3 py-2 rounded-sm" style={{ background: "rgba(255,178,87,0.08)", border: "1px solid rgba(255,178,87,0.25)" }}>
                <div className="text-[11px] text-warn font-display font-semibold uppercase tracking-wider">
                  {exec.skipped.length} skipped
                </div>
                <div className="text-[11px] text-text-muted mt-0.5">
                  No Jupiter route or quote failed. These tokens were left in your wallet.
                </div>
              </div>
            )}
          </HeroGlassCard>
        </motion.div>

        <div className="flex-1 min-h-3" />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5, ease }}
          className="flex flex-col gap-2.5"
        >
          <PrimaryButton
            glow="magenta"
            icon={<Sparkles size={18} />}
            onClick={() => go(SCREENS.SHARE)}
            hapticType="medium"
          >
            Share Your Sweep
          </PrimaryButton>

          <button
            onClick={() => { haptic.light?.(); scan.refresh(); go(SCREENS.RESULTS); }}
            className="text-center text-[13px] text-sweep font-semibold py-2"
          >
            Scan again →
          </button>

          <div className="flex justify-center">
            <GhostButton onClick={() => go(SCREENS.DASHBOARD)}>Done</GhostButton>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
