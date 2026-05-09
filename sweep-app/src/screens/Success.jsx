import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { ArrowRight, PenLine, Sparkles } from "lucide-react";
import { useEffect, useMemo } from "react";
import Particles from "../components/Particles";
import { GhostButton, HeroGlassCard, MicroLabel, PrimaryButton } from "../components/UI";
import { getGroupSummary, getTotalsFor } from "../lib/data";
import { SCREENS } from "../lib/screens";
import { haptic } from "../lib/haptics";

const ease = [0.16, 1, 0.3, 1];

export default function Success({ go, sweepMode, selectedGroups }) {
  const totals = useMemo(() => getTotalsFor(selectedGroups), [selectedGroups]);
  const groupSummaries = useMemo(() => getGroupSummary(selectedGroups), [selectedGroups]);
  const finalAsset = sweepMode ? "$SWEEP" : "USDC";

  useEffect(() => {
    haptic.success?.();
    const colors = sweepMode ? ["#FF4FD8", "#FFD27A", "#7CFFB2"] : ["#7CFFB2", "#FFD27A", "#5B8CFF"];
    const fire = (origin, particleCount) =>
      confetti({
        particleCount,
        spread: 80,
        startVelocity: 45,
        origin,
        colors,
        gravity: 0.8,
        ticks: 200,
        scalar: 0.9,
      });
    fire({ x: 0.5, y: 0.4 }, 80);
    setTimeout(() => fire({ x: 0.3, y: 0.5 }, 40), 200);
    setTimeout(() => fire({ x: 0.7, y: 0.5 }, 40), 350);
  }, [sweepMode]);

  // Per-group amounts — apply sweep mode 10% bonus uniformly across groups
  const finals = groupSummaries.map((g) => ({
    ...g,
    finalAmount: sweepMode ? +(g.net * 1.1).toFixed(2) : g.net,
  }));

  const gridCols = totals.groupCount === 1 ? "grid-cols-1"
    : totals.groupCount === 3 ? "grid-cols-3"
    : "grid-cols-2";

  const totalReceived = finals.reduce((s, f) => s + f.finalAmount, 0).toFixed(2);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <Particles mode="ambient" count={50} color={sweepMode ? "#FF4FD8" : "#7CFFB2"} />

      <div
        className="absolute left-1/2 top-[16%] -translate-x-1/2 w-[260px] h-[260px] pointer-events-none"
        style={{
          background: sweepMode
            ? "radial-gradient(circle, rgba(255,79,216,0.3) 0%, transparent 60%)"
            : "radial-gradient(circle, rgba(124,255,178,0.3) 0%, transparent 60%)",
          filter: "blur(20px)",
        }}
      />

      <div className="relative z-10 h-full flex flex-col px-5 pt-16 pb-6 overflow-y-auto no-scrollbar">
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
              <span className="font-mono tabular-nums text-text-primary font-semibold">{totals.tokenCount}</span> tokens · swept in 1 signature
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
            {/* BEFORE */}
            <div className="flex items-center justify-between mb-2">
              <MicroLabel>Before</MicroLabel>
              <span className="font-mono text-[12px] text-text-muted tabular-nums">
                ${totals.total.toFixed(2)} dust
              </span>
            </div>

            <div className="space-y-1.5">
              {groupSummaries.map((g) => (
                <div key={g.id} className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 w-[78px] shrink-0">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: g.color, boxShadow: `0 0 4px ${g.color}` }}
                    />
                    <span className="text-[10px] font-display font-semibold text-text-secondary uppercase tracking-wider">
                      {g.short}
                    </span>
                  </div>
                  <div className="flex gap-1 flex-1 opacity-60">
                    {g.tokens.map((t) => (
                      <div
                        key={t.symbol}
                        className="w-6 h-6 rounded-md flex items-center justify-center font-mono font-bold text-[8px] text-white shrink-0"
                        style={{
                          background: `linear-gradient(135deg, ${t.color}cc, ${t.color}66)`,
                          boxShadow: `0 0 6px ${t.color}55`,
                        }}
                      >
                        {t.symbol.slice(0, 3)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
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

            {/* AFTER — per-group final coins */}
            <div className="flex items-center justify-between mb-3">
              <MicroLabel color="mint">After</MicroLabel>
              <span className="font-mono text-[12px] text-sweep font-bold tabular-nums">
                ${totalReceived} {finalAsset}
              </span>
            </div>

            <div className={`grid ${gridCols} gap-2`}>
              {finals.map((f, i) => (
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
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        width: 48,
                        height: 48,
                        border: `1.5px solid ${f.color}`,
                      }}
                    />
                    <motion.div
                      className="w-[48px] h-[48px] rounded-full flex items-center justify-center font-display font-bold text-[10px] text-void"
                      style={{
                        background: sweepMode
                          ? "radial-gradient(circle at 30% 30%, #FF4FD8, #B5208F)"
                          : "radial-gradient(circle at 30% 30%, #7CFFB2, #4DA877)",
                        boxShadow: sweepMode
                          ? "0 0 16px rgba(255,79,216,0.6)"
                          : "0 0 16px rgba(124,255,178,0.6)",
                      }}
                      animate={{ scale: [1, 1.04, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
                    >
                      {sweepMode ? "SWP" : "USDC"}
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

            {/* Rent line — Solana bonus */}
            <div className="h-px w-full bg-white/10 my-3" />
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-text-secondary flex items-center gap-1.5">
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-void font-bold"
                  style={{ background: "radial-gradient(circle, #FFD27A, #B58B3A)" }}
                >◎</span>
                SOL rent reclaimed
              </span>
              <span className="font-mono text-[13px] text-gold font-bold tabular-nums">
                +${totals.rent.toFixed(2)}
              </span>
            </div>
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
            onClick={() => { haptic.light?.(); go(SCREENS.DASHBOARD); }}
            className="text-center text-[13px] text-sweep font-semibold py-2"
          >
            Invite a friend, earn $1 →
          </button>

          <div className="flex justify-center">
            <GhostButton onClick={() => go(SCREENS.DASHBOARD)}>Done</GhostButton>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
