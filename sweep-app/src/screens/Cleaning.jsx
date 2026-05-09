import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import Particles from "../components/Particles";
import { ProgressBar } from "../components/UI";
import { DUST_TOKENS } from "../lib/data";
import { SCREENS } from "../lib/screens";
import { haptic } from "../lib/haptics";

const ease = [0.16, 1, 0.3, 1];
const TOTAL_MS = 4500;

export default function Cleaning({ go, sweepMode }) {
  const [phase, setPhase] = useState("materialize"); // materialize → dissolve → vortex → coalesce → settle
  const [progress, setProgress] = useState(0);
  const [cleanedCount, setCleanedCount] = useState(0);

  // Token positions: scattered around upper half
  const positions = useMemo(() => {
    return DUST_TOKENS.map((t, i) => {
      const cols = 4;
      const row = Math.floor(i / cols);
      const col = i % cols;
      const jitter = (seed) => ((Math.sin(seed * 12.9898) * 43758.5453) % 1 + 1) % 1;
      return {
        x: 32 + col * 86 + jitter(i + 1) * 20 - 10,
        y: 110 + row * 90 + jitter(i + 7) * 18 - 9,
        ...t,
      };
    });
  }, []);

  useEffect(() => {
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / TOTAL_MS);
      setProgress(t * 100);

      // phases
      if (elapsed < 800) setPhase("materialize");
      else if (elapsed < 2400) setPhase("dissolve");
      else if (elapsed < 3600) setPhase("vortex");
      else if (elapsed < 4200) setPhase("coalesce");
      else setPhase("settle");

      // Update cleaned count
      const ratio = Math.min(1, Math.max(0, (elapsed - 800) / 1600));
      setCleanedCount(Math.floor(ratio * DUST_TOKENS.length));

      if (t < 1) raf = requestAnimationFrame(tick);
      else {
        haptic.success?.();
        setTimeout(() => go(SCREENS.SUCCESS), 350);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [go]);

  // haptic on each phase transition
  useEffect(() => {
    if (phase === "dissolve") haptic.light?.();
    if (phase === "vortex") haptic.medium?.();
    if (phase === "coalesce") haptic.medium?.();
  }, [phase]);

  const showVortex = phase === "vortex" || phase === "coalesce" || phase === "settle";
  const showFinalCoin = phase === "coalesce" || phase === "settle";

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Background tint shifts gold during vortex */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: showVortex
            ? "radial-gradient(ellipse at center, rgba(255,210,122,0.18) 0%, rgba(6,7,13,1) 70%)"
            : "radial-gradient(ellipse at center, rgba(124,255,178,0.10) 0%, rgba(6,7,13,1) 70%)",
        }}
        transition={{ duration: 0.6 }}
      />

      {showVortex && <Particles mode="vortex" count={120} color={sweepMode ? "#FF4FD8" : "#FFD27A"} intensity={1.5} />}

      {/* Token coins */}
      <div className="absolute inset-0">
        <AnimatePresence>
          {(phase === "materialize" || phase === "dissolve") &&
            positions.map((p, i) => (
              <motion.div
                key={p.symbol}
                initial={{ scale: 0, opacity: 0, rotate: -45 }}
                animate={
                  phase === "dissolve"
                    ? {
                        scale: [1, 1.15, 0],
                        opacity: [1, 1, 0],
                        x: [0, 0, 210 - p.x],
                        y: [0, 0, 380 - p.y],
                        rotate: 0,
                      }
                    : { scale: 1, opacity: 1, rotate: 0 }
                }
                transition={
                  phase === "dissolve"
                    ? { duration: 1.1, delay: i * 0.045, ease }
                    : { duration: 0.5, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }
                }
                className="absolute"
                style={{ left: p.x, top: p.y }}
              >
                <div
                  className="w-[42px] h-[42px] rounded-full flex items-center justify-center font-mono font-bold text-[10px] text-white"
                  style={{
                    background: `radial-gradient(circle at 30% 30%, ${p.color}ff, ${p.color}99)`,
                    boxShadow: `0 0 20px ${p.color}80, inset 0 1px 0 rgba(255,255,255,0.4)`,
                    animationName: phase === "materialize" ? "float" : "none",
                    animationDuration: "2.4s",
                    animationTimingFunction: "ease-in-out",
                    animationIterationCount: "infinite",
                    animationDelay: `${i * 0.1}s`,
                  }}
                >
                  {p.symbol.slice(0, 3)}
                </div>
              </motion.div>
            ))}
        </AnimatePresence>
      </div>

      {/* Final coin */}
      <AnimatePresence>
        {showFinalCoin && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.15, 1], opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.6, ease }}
            className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2"
          >
            <div className="relative">
              <div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  width: 220,
                  height: 220,
                  left: -50,
                  top: -50,
                  background: sweepMode
                    ? "radial-gradient(circle, rgba(255,79,216,0.4) 0%, transparent 65%)"
                    : "radial-gradient(circle, rgba(255,210,122,0.4) 0%, transparent 65%)",
                  filter: "blur(12px)",
                  animation: "pulseGlow 1.6s ease-in-out infinite",
                }}
              />
              <div
                className="relative w-[120px] h-[120px] rounded-full flex items-center justify-center font-display font-bold text-[20px] text-void"
                style={{
                  background: sweepMode
                    ? "radial-gradient(circle at 30% 30%, #FF4FD8, #B5208F)"
                    : "radial-gradient(circle at 30% 30%, #7CFFB2, #4DA877)",
                  boxShadow: sweepMode
                    ? "0 0 48px rgba(255,79,216,0.7), inset 0 2px 0 rgba(255,255,255,0.5)"
                    : "0 0 48px rgba(124,255,178,0.7), inset 0 2px 0 rgba(255,255,255,0.5)",
                }}
              >
                {sweepMode ? "$SWEEP" : "USDC"}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status copy */}
      <div className="absolute bottom-[18%] left-0 right-0 px-8">
        <div className="text-center font-display text-[20px] font-semibold text-text-primary mb-3">
          <AnimatePresence mode="wait">
            <motion.span
              key={phase}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
            >
              {phase === "materialize" && "Gathering your dust…"}
              {phase === "dissolve" && "Sweeping your wallet…"}
              {phase === "vortex" && "Merging into one…"}
              {phase === "coalesce" && (sweepMode ? "Forging $SWEEP…" : "Converting to USDC…")}
              {phase === "settle" && "Almost there…"}
            </motion.span>
          </AnimatePresence>
        </div>
        <ProgressBar value={progress} color={sweepMode ? "magenta" : "sweep"} />
        <div className="flex justify-between mt-2 text-[12px] font-mono text-text-muted">
          <span>Cleaning {cleanedCount}/{DUST_TOKENS.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
      </div>
    </div>
  );
}
