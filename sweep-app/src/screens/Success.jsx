import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { useEffect } from "react";
import Particles from "../components/Particles";
import { GhostButton, HeroGlassCard, MicroLabel, PrimaryButton } from "../components/UI";
import { DUST_TOKENS, NET_RECEIVED, TOTAL_FOUND } from "../lib/data";
import { SCREENS } from "../lib/screens";
import { haptic } from "../lib/haptics";

const ease = [0.16, 1, 0.3, 1];

export default function Success({ go, sweepMode }) {
  useEffect(() => {
    haptic.success?.();
    // Confetti burst
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

  const finalAsset = sweepMode ? "$SWEEP" : "USDC";
  const finalAmount = sweepMode ? (NET_RECEIVED * 1.1).toFixed(2) : NET_RECEIVED.toFixed(2);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <Particles mode="ambient" count={50} color={sweepMode ? "#FF4FD8" : "#7CFFB2"} />

      {/* Top halo */}
      <div
        className="absolute left-1/2 top-[18%] -translate-x-1/2 w-[260px] h-[260px] pointer-events-none"
        style={{
          background: sweepMode
            ? "radial-gradient(circle, rgba(255,79,216,0.3) 0%, transparent 60%)"
            : "radial-gradient(circle, rgba(124,255,178,0.3) 0%, transparent 60%)",
          filter: "blur(20px)",
        }}
      />

      <div className="relative z-10 h-full flex flex-col px-5 pt-20 pb-6 overflow-y-auto no-scrollbar">
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
          <p className="text-[15px] text-text-secondary mt-2">
            Your dust is one clean coin.
          </p>
        </motion.div>

        {/* Before / After */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25, ease }}
          className="mt-6"
        >
          <HeroGlassCard>
            {/* BEFORE */}
            <div className="flex items-center justify-between mb-2">
              <MicroLabel>Before</MicroLabel>
              <span className="font-mono text-[12px] text-text-muted tabular-nums">
                ${TOTAL_FOUND.toFixed(2)} in dust
              </span>
            </div>
            <div className="grid grid-cols-6 gap-1.5 opacity-60">
              {DUST_TOKENS.slice(0, 6).map((t) => (
                <div
                  key={t.symbol}
                  className="aspect-square rounded-md flex items-center justify-center font-mono font-bold text-[9px] text-white"
                  style={{
                    background: `linear-gradient(135deg, ${t.color}cc, ${t.color}66)`,
                    boxShadow: `0 0 8px ${t.color}55`,
                  }}
                >
                  {t.symbol.slice(0, 3)}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-6 gap-1.5 opacity-40 mt-1.5">
              {DUST_TOKENS.slice(6).map((t) => (
                <div
                  key={t.symbol}
                  className="aspect-square rounded-md flex items-center justify-center font-mono font-bold text-[9px] text-white"
                  style={{
                    background: `linear-gradient(135deg, ${t.color}aa, ${t.color}44)`,
                  }}
                >
                  {t.symbol.slice(0, 3)}
                </div>
              ))}
            </div>

            <div className="flex flex-col items-center my-4">
              <motion.div
                animate={{ y: [0, 4, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                className="text-sweep"
              >
                <ArrowRight size={20} className="rotate-90" />
              </motion.div>
              <span className="text-[10px] tracking-[0.2em] uppercase text-sweep font-bold mt-1">SWEPT</span>
            </div>

            {/* AFTER */}
            <div className="flex items-center justify-between mb-2">
              <MicroLabel color="mint">After</MicroLabel>
              <span className="font-mono text-[12px] text-sweep font-bold tabular-nums">
                ${finalAmount} {finalAsset}
              </span>
            </div>
            <div className="flex items-center justify-center py-3">
              <motion.div
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className={`w-20 h-20 rounded-full flex items-center justify-center font-display font-bold text-[16px] text-void`}
                style={{
                  background: sweepMode
                    ? "radial-gradient(circle at 30% 30%, #FF4FD8, #B5208F)"
                    : "radial-gradient(circle at 30% 30%, #7CFFB2, #4DA877)",
                  boxShadow: sweepMode
                    ? "0 0 32px rgba(255,79,216,0.7), inset 0 2px 0 rgba(255,255,255,0.4)"
                    : "0 0 32px rgba(124,255,178,0.7), inset 0 2px 0 rgba(255,255,255,0.4)",
                }}
              >
                {finalAsset}
              </motion.div>
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
