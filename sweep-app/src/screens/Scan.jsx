import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import Particles from "../components/Particles";
import { ProgressBar } from "../components/UI";
import { SCREENS } from "../lib/screens";

const ease = [0.16, 1, 0.3, 1];
const MIN_SHOW_MS = 2200;

const STATUS_FALLBACK = [
  "Reading token accounts…",
  "Loading token metadata…",
  "Pricing via Jupiter…",
  "Filtering routable dust…",
];

/**
 * Real scan screen — driven by useDustScan hook (lifted in App.jsx).
 * We blend the hook's coarse progress with a minimum-display timer so the
 * suspense beat lands even when the network is fast.
 */
export default function Scan({ go, scan }) {
  const [displayProgress, setDisplayProgress] = useState(0);
  const [statusIdx, setStatusIdx] = useState(0);
  const startedAt = useRef(performance.now());
  const advanced = useRef(false);

  // Drive a minimum 2.2s ramp; merge with hook progress so we never overshoot.
  useEffect(() => {
    let raf;
    const tick = (now) => {
      const elapsed = now - startedAt.current;
      const minRamp = Math.min(100, (elapsed / MIN_SHOW_MS) * 100);
      const merged = Math.max(displayProgress, Math.min(scan.progress || 0, minRamp));
      setDisplayProgress(merged);

      const ready = scan.status === "ready" || scan.status === "empty" || scan.status === "error";
      if (elapsed >= MIN_SHOW_MS && ready && !advanced.current) {
        advanced.current = true;
        // tiny delay for the bar to visually fill
        setTimeout(() => {
          if (scan.status === "error") go(SCREENS.SPLASH);
          else go(SCREENS.RESULTS);
        }, 220);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [scan.progress, scan.status, displayProgress, go]);

  // Status copy rotation (independent of hook message — we want narrative variety)
  useEffect(() => {
    const id = setInterval(() => setStatusIdx((i) => (i + 1) % STATUS_FALLBACK.length), 900);
    return () => clearInterval(id);
  }, []);

  const status = scan.message || STATUS_FALLBACK[statusIdx];

  return (
    <div className="relative w-full h-full">
      <Particles mode="inward" count={90} intensity={1.2} />

      <div className="relative z-10 h-full flex flex-col items-center pt-[16%] px-5 pb-10">
        <div className="relative w-[260px] h-[260px] flex items-center justify-center">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="absolute rounded-full border border-sweep/40"
              style={{
                width: 260,
                height: 260,
                animation: "ringOut 2.4s ease-out infinite",
                animationDelay: `${i * 0.66}s`,
                boxShadow: "0 0 24px rgba(124,255,178,0.3)",
              }}
            />
          ))}
          <motion.div
            className="absolute w-[260px] h-[260px] rounded-full"
            style={{
              background:
                "conic-gradient(from 0deg, rgba(124,255,178,0.55) 0deg, rgba(124,255,178,0.0) 60deg)",
              maskImage: "radial-gradient(circle, transparent 0%, transparent 8%, black 12%, black 100%)",
              WebkitMaskImage: "radial-gradient(circle, transparent 0%, transparent 8%, black 12%, black 100%)",
              filter: "blur(0.5px)",
            }}
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.4, ease: "linear" }}
          />
          <div className="relative w-3 h-3 rounded-full bg-sweep" style={{ boxShadow: "0 0 24px #7CFFB2" }} />
          <div className="absolute inset-0 rounded-full border border-white/5" />
          <div className="absolute w-[180px] h-[180px] rounded-full border border-white/5" />
          <div className="absolute w-[100px] h-[100px] rounded-full border border-white/5" />
        </div>

        <div className="mt-12 h-7 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={status}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.32, ease }}
              className="font-display text-[20px] font-semibold text-text-primary text-center"
            >
              {status}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="w-full mt-6 px-2 flex flex-col gap-2">
          <ProgressBar value={displayProgress} />
          <div className="flex items-center justify-between text-[12px] font-mono text-text-muted">
            <span>Solana mainnet</span>
            <span>{Math.round(displayProgress)}%</span>
          </div>
        </div>

        <div className="flex-1" />

        {scan.error && (
          <div className="text-[12px] text-danger text-center px-4 pb-2 max-w-[280px]">
            {scan.error.message}
          </div>
        )}
      </div>
    </div>
  );
}
