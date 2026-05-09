import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { ProgressBar } from "../components/UI";
import { CHAINS, DUST_TOKENS, getTotalsFor } from "../lib/data";
import { SCREENS } from "../lib/screens";
import { haptic } from "../lib/haptics";

const ease = [0.16, 1, 0.3, 1];
const TOTAL_MS = 4800;

// Layout returns chain center positions in % of container.
// Per-chain mini-vortexes are arranged adaptively for 1-4 chains.
function getChainLayout(n) {
  if (n <= 1) return [[50, 46]];
  if (n === 2) return [[32, 46], [68, 46]];
  if (n === 3) return [[30, 36], [70, 36], [50, 58]];
  return [[32, 36], [68, 36], [32, 58], [68, 58]]; // 4
}

export default function Cleaning({ go, sweepMode, selectedChains }) {
  const containerRef = useRef(null);
  const [size, setSize] = useState({ w: 390, h: 700 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(() => requestAnimationFrame(measure));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // phase: materialize → gather → dissolve → coalesce → settle
  const [phase, setPhase] = useState("materialize");
  const [progress, setProgress] = useState(0);
  const [cleanedCount, setCleanedCount] = useState(0);

  const totals = useMemo(() => getTotalsFor(selectedChains), [selectedChains]);
  const layout = useMemo(() => getChainLayout(selectedChains.length), [selectedChains]);

  // Map chain id → percent center, assigned in fixed order
  const chainPos = useMemo(() => {
    const map = {};
    selectedChains.forEach((id, i) => {
      const [xp, yp] = layout[Math.min(i, layout.length - 1)];
      map[id] = { xp, yp };
    });
    return map;
  }, [selectedChains, layout]);

  // Token start positions: scattered in upper portion, grouped subtly by chain.
  const tokens = useMemo(() => {
    const filtered = DUST_TOKENS.filter((t) => selectedChains.includes(t.chain));
    // scatter using deterministic pseudo-random based on index
    return filtered.map((t, i) => {
      const r = (seed) => ((Math.sin(seed * 12.9898) * 43758.5453) % 1 + 1) % 1;
      const xp = 14 + r(i + 1) * 72;          // 14% – 86%
      const yp = 14 + r(i + 7) * 26;          // 14% – 40%  (upper area)
      return { ...t, xp, yp, idx: i };
    });
  }, [selectedChains]);

  useEffect(() => {
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / TOTAL_MS);
      setProgress(t * 100);

      if (elapsed < 800)        setPhase("materialize");
      else if (elapsed < 2000)  setPhase("gather");
      else if (elapsed < 3000)  setPhase("dissolve");
      else if (elapsed < 3900)  setPhase("coalesce");
      else                      setPhase("settle");

      const cleanRatio = Math.max(0, Math.min(1, (elapsed - 800) / 2200));
      setCleanedCount(Math.floor(cleanRatio * tokens.length));

      if (t < 1) raf = requestAnimationFrame(tick);
      else {
        haptic.success?.();
        setTimeout(() => go(SCREENS.SUCCESS), 350);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [go, tokens.length]);

  // Phase haptics
  useEffect(() => {
    if (phase === "gather")    haptic.light?.();
    if (phase === "dissolve")  haptic.medium?.();
    if (phase === "coalesce")  haptic.medium?.();
  }, [phase]);

  const showHalos = phase === "dissolve" || phase === "coalesce" || phase === "settle";
  const showCoins = phase === "coalesce" || phase === "settle";

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Background tint shifts gold/magenta during vortex */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: showHalos
            ? sweepMode
              ? "radial-gradient(ellipse at center, rgba(255,79,216,0.15) 0%, rgba(6,7,13,1) 70%)"
              : "radial-gradient(ellipse at center, rgba(255,210,122,0.15) 0%, rgba(6,7,13,1) 70%)"
            : "radial-gradient(ellipse at center, rgba(124,255,178,0.10) 0%, rgba(6,7,13,1) 70%)",
        }}
        transition={{ duration: 0.6 }}
      />

      <div ref={containerRef} className="relative w-full h-full">
        {/* Per-chain halos — appear during dissolve/coalesce */}
        {selectedChains.map((id) => {
          const c = CHAINS[id];
          const pos = chainPos[id];
          if (!pos) return null;
          return (
            <motion.div
              key={`halo-${id}`}
              className="absolute pointer-events-none"
              style={{
                left: `${pos.xp}%`,
                top: `${pos.yp}%`,
                width: 200,
                height: 200,
                marginLeft: -100,
                marginTop: -100,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${c.color}55 0%, transparent 60%)`,
                filter: "blur(14px)",
              }}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{
                opacity: showHalos ? 1 : 0,
                scale: showHalos ? 1 : 0.4,
              }}
              transition={{ duration: 0.6, ease }}
            />
          );
        })}

        {/* Per-chain spinning rings — visual anchor for each vortex */}
        {selectedChains.map((id) => {
          const c = CHAINS[id];
          const pos = chainPos[id];
          if (!pos) return null;
          return (
            <motion.div
              key={`ring-${id}`}
              className="absolute pointer-events-none"
              style={{
                left: `${pos.xp}%`,
                top: `${pos.yp}%`,
                width: 100,
                height: 100,
                marginLeft: -50,
                marginTop: -50,
                borderRadius: "50%",
                border: `1.5px dashed ${c.color}55`,
              }}
              initial={{ opacity: 0, rotate: 0 }}
              animate={{
                opacity: phase === "gather" || phase === "dissolve" ? 0.9 : 0,
                rotate: 360,
              }}
              transition={{
                opacity: { duration: 0.4 },
                rotate: { duration: 4, repeat: Infinity, ease: "linear" },
              }}
            />
          );
        })}

        {/* Tokens */}
        <AnimatePresence>
          {phase !== "settle" && phase !== "coalesce" &&
            tokens.map((t, i) => {
              const target = chainPos[t.chain];
              const isGathering = phase === "gather" || phase === "dissolve";
              const isDissolving = phase === "dissolve";

              // Position: in materialize/early phases use scattered start; later use chain center
              const targetX = isGathering ? target?.xp ?? t.xp : t.xp;
              const targetY = isGathering ? target?.yp ?? t.yp : t.yp;

              // Stagger dissolve based on token index within its chain
              const chainTokens = tokens.filter((x) => x.chain === t.chain);
              const innerIdx = chainTokens.findIndex((x) => x.symbol === t.symbol);

              return (
                <motion.div
                  key={`${t.chain}-${t.symbol}`}
                  className="absolute"
                  style={{
                    left: `${targetX}%`,
                    top: `${targetY}%`,
                    marginLeft: -21,
                    marginTop: -21,
                  }}
                  initial={{ scale: 0, opacity: 0, rotate: -45 }}
                  animate={
                    isDissolving
                      ? { scale: [1, 1.2, 0], opacity: [1, 1, 0], rotate: 0 }
                      : { scale: 1, opacity: 1, rotate: 0 }
                  }
                  transition={
                    isDissolving
                      ? { duration: 0.9, delay: innerIdx * 0.08, ease }
                      : phase === "gather"
                        ? { duration: 0.9, delay: innerIdx * 0.05, ease }
                        : { duration: 0.5, delay: i * 0.05, ease }
                  }
                >
                  <div
                    className="w-[42px] h-[42px] rounded-full flex items-center justify-center font-mono font-bold text-[10px] text-white"
                    style={{
                      background: `radial-gradient(circle at 30% 30%, ${t.color}ff, ${t.color}99)`,
                      boxShadow: `0 0 16px ${t.color}80, inset 0 1px 0 rgba(255,255,255,0.4)`,
                    }}
                  >
                    {t.symbol.slice(0, 3)}
                  </div>
                </motion.div>
              );
            })}
        </AnimatePresence>

        {/* Per-chain final coins — emerge at each vortex */}
        <AnimatePresence>
          {showCoins &&
            selectedChains.map((id, idx) => {
              const c = CHAINS[id];
              const pos = chainPos[id];
              if (!pos) return null;
              return (
                <motion.div
                  key={`coin-${id}`}
                  className="absolute"
                  style={{
                    left: `${pos.xp}%`,
                    top: `${pos.yp}%`,
                    marginLeft: -36,
                    marginTop: -36,
                  }}
                  initial={{ scale: 0, opacity: 0, rotate: -90 }}
                  animate={{ scale: [0, 1.15, 1], opacity: 1, rotate: 0 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  transition={{ duration: 0.6, delay: idx * 0.08, ease }}
                >
                  {/* outer chain-colored ring */}
                  <div
                    className="absolute inset-0 rounded-full pointer-events-none"
                    style={{
                      width: 72,
                      height: 72,
                      border: `2px solid ${c.color}`,
                      boxShadow: `0 0 24px ${c.color}99`,
                    }}
                  />
                  {/* inner USDC / SWEEP coin */}
                  <motion.div
                    className="w-[72px] h-[72px] rounded-full flex items-center justify-center font-display font-bold text-[14px] text-void"
                    style={{
                      background: sweepMode
                        ? "radial-gradient(circle at 30% 30%, #FF4FD8, #B5208F)"
                        : "radial-gradient(circle at 30% 30%, #7CFFB2, #4DA877)",
                      boxShadow: sweepMode
                        ? "0 0 24px rgba(255,79,216,0.7), inset 0 2px 0 rgba(255,255,255,0.4)"
                        : "0 0 24px rgba(124,255,178,0.7), inset 0 2px 0 rgba(255,255,255,0.4)",
                    }}
                    animate={{ scale: [1, 1.04, 1] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                  >
                    {sweepMode ? "SWEEP" : "USDC"}
                  </motion.div>
                  {/* chain badge */}
                  <div
                    className="absolute left-1/2 -translate-x-1/2 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-display font-bold uppercase tracking-wider whitespace-nowrap"
                    style={{
                      top: 76,
                      background: `${c.color}26`,
                      color: c.color,
                      border: `1px solid ${c.color}55`,
                    }}
                  >
                    {c.short}
                  </div>
                </motion.div>
              );
            })}
        </AnimatePresence>
      </div>

      {/* Status copy + progress (fixed bottom) */}
      <div className="absolute bottom-[12%] left-0 right-0 px-8">
        <div className="text-center font-display text-[20px] font-semibold text-text-primary mb-3 h-7 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.span
              key={phase}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
            >
              {phase === "materialize" && "Gathering your dust…"}
              {phase === "gather"     && `Sorting ${selectedChains.length} ${selectedChains.length === 1 ? "chain" : "chains"}…`}
              {phase === "dissolve"   && "Sweeping each network…"}
              {phase === "coalesce"   && (sweepMode ? "Forging $SWEEP…" : "Converting to USDC…")}
              {phase === "settle"     && "Almost there…"}
            </motion.span>
          </AnimatePresence>
        </div>
        <ProgressBar value={progress} color={sweepMode ? "magenta" : "sweep"} />
        <div className="flex justify-between mt-2 text-[12px] font-mono text-text-muted">
          <span>Cleaning {cleanedCount}/{tokens.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
      </div>
    </div>
  );
}
