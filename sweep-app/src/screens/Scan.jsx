import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import Particles from "../components/Particles";
import { ProgressBar } from "../components/UI";
import { WALLET_SHORT } from "../lib/data";
import { SCREENS } from "../lib/screens";

const STATUSES = [
  "Reading token accounts…",
  "Checking Token-2022 mints…",
  "Pricing via Jupiter…",
  "Calculating reclaimable rent…",
  "Filtering routable dust…",
];
const ease = [0.16, 1, 0.3, 1];
const TOTAL_MS = 3800;

export default function Scan({ go }) {
  const [progress, setProgress] = useState(0);
  const [statusIdx, setStatusIdx] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / TOTAL_MS);
      // simulated easing — slow to 0.7, slight pause, jump to 1
      const eased = t < 0.7 ? (t / 0.7) * 0.78 : 0.78 + Math.pow((t - 0.7) / 0.3, 0.5) * 0.22;
      setProgress(eased * 100);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setTimeout(() => go(SCREENS.RESULTS), 200);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [go]);

  useEffect(() => {
    const id = setInterval(() => setStatusIdx((i) => (i + 1) % STATUSES.length), 900);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative w-full h-full">
      <Particles mode="inward" count={90} intensity={1.2} />

      <div className="relative z-10 h-full flex flex-col items-center pt-[16%] px-5 pb-10">
        {/* Radar */}
        <div className="relative w-[260px] h-[260px] flex items-center justify-center">
          {/* concentric rings */}
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
          {/* sweep arm */}
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
          {/* center dot */}
          <div className="relative w-3 h-3 rounded-full bg-sweep" style={{ boxShadow: "0 0 24px #7CFFB2" }} />
          {/* faint grid lines */}
          <div className="absolute inset-0 rounded-full border border-white/5" />
          <div className="absolute w-[180px] h-[180px] rounded-full border border-white/5" />
          <div className="absolute w-[100px] h-[100px] rounded-full border border-white/5" />
        </div>

        <div className="mt-12 h-7 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={statusIdx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.32, ease }}
              className="font-display text-[20px] font-semibold text-text-primary"
            >
              {STATUSES[statusIdx]}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="w-full mt-6 px-2 flex flex-col gap-2">
          <ProgressBar value={progress} />
          <div className="flex items-center justify-between text-[12px] font-mono text-text-muted">
            <span>Solana mainnet</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>

        <div className="flex-1" />

        <div className="font-mono text-[13px] text-text-muted tracking-wider">
          {WALLET_SHORT}
        </div>
      </div>
    </div>
  );
}
