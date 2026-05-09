import { AnimatePresence, motion } from "framer-motion";
import { PenLine } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ProgressBar } from "../components/UI";
import { DUST_TOKENS, GROUPS, getTotalsFor } from "../lib/data";
import { SCREENS } from "../lib/screens";
import { haptic } from "../lib/haptics";

const ease = [0.16, 1, 0.3, 1];
const TOTAL_MS = 4800;

// Each group → one v0 transaction → its own vortex on screen.
function getGroupLayout(n) {
  if (n <= 1) return [[50, 46]];
  if (n === 2) return [[32, 46], [68, 46]];
  if (n === 3) return [[30, 36], [70, 36], [50, 58]];
  return [[32, 36], [68, 36], [32, 58], [68, 58]];
}

export default function Cleaning({ go, sweepMode, selectedGroups }) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Phase order matches the actual Solana flow:
  //   build  — compose v0 transactions (off-chain)
  //   sign   — wallet adapter prompt → user taps Approve once
  //   route  — Jupiter v6 swaps execute, atomic per group
  //   reclaim — close emptied token accounts, refund SOL rent
  //   settle  — done state
  const [phase, setPhase] = useState("build");
  const [progress, setProgress] = useState(0);

  const totals = useMemo(() => getTotalsFor(selectedGroups), [selectedGroups]);
  const layout = useMemo(() => getGroupLayout(selectedGroups.length), [selectedGroups]);

  const groupPos = useMemo(() => {
    const map = {};
    selectedGroups.forEach((id, i) => {
      const [xp, yp] = layout[Math.min(i, layout.length - 1)];
      map[id] = { xp, yp };
    });
    return map;
  }, [selectedGroups, layout]);

  const tokens = useMemo(() => {
    const filtered = DUST_TOKENS.filter((t) => selectedGroups.includes(t.group));
    return filtered.map((t, i) => {
      const r = (seed) => ((Math.sin(seed * 12.9898) * 43758.5453) % 1 + 1) % 1;
      const xp = 14 + r(i + 1) * 72;
      const yp = 14 + r(i + 7) * 26;
      return { ...t, xp, yp, idx: i };
    });
  }, [selectedGroups]);

  useEffect(() => {
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / TOTAL_MS);
      setProgress(t * 100);

      // Phase boundaries chosen so each beat lands with the right haptic
      if (elapsed < 800)        setPhase("build");
      else if (elapsed < 1600)  setPhase("sign");
      else if (elapsed < 3200)  setPhase("route");
      else if (elapsed < 4100)  setPhase("reclaim");
      else                      setPhase("settle");

      if (t < 1) raf = requestAnimationFrame(tick);
      else {
        haptic.success?.();
        setTimeout(() => go(SCREENS.SUCCESS), 350);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [go]);

  useEffect(() => {
    if (phase === "sign")    haptic.medium?.();
    if (phase === "route")   haptic.medium?.();
    if (phase === "reclaim") haptic.light?.();
  }, [phase]);

  const showHalos = phase === "route" || phase === "reclaim" || phase === "settle";
  const showCoins = phase === "reclaim" || phase === "settle";
  const showRentBurst = phase === "reclaim" || phase === "settle";
  const isSigning = phase === "sign";

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Background tint shifts gold/magenta during route */}
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

      {/* 1-signature badge during sign phase */}
      <AnimatePresence>
        {isSigning && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.3, ease }}
            className="absolute top-[14%] left-1/2 -translate-x-1/2 px-4 py-2 rounded-full glass-strong flex items-center gap-2 z-30"
            style={{ boxShadow: "0 0 24px rgba(124,255,178,0.4)" }}
          >
            <PenLine size={14} className="text-sweep" />
            <span className="text-[12px] font-display font-semibold text-text-primary">
              1 signature · {totals.txCount} {totals.txCount === 1 ? "tx" : "txs"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={containerRef} className="relative w-full h-full">
        {/* Per-group halos */}
        {selectedGroups.map((id) => {
          const g = GROUPS[id];
          const pos = groupPos[id];
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
                background: `radial-gradient(circle, ${g.color}55 0%, transparent 60%)`,
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

        {/* Per-group dashed rings during route */}
        {selectedGroups.map((id) => {
          const g = GROUPS[id];
          const pos = groupPos[id];
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
                border: `1.5px dashed ${g.color}55`,
              }}
              initial={{ opacity: 0, rotate: 0 }}
              animate={{
                opacity: phase === "sign" || phase === "route" ? 0.9 : 0,
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
          {phase !== "settle" && phase !== "reclaim" &&
            tokens.map((t, i) => {
              const target = groupPos[t.group];
              const isGathering = phase === "sign" || phase === "route";
              const isDissolving = phase === "route";

              const targetX = isGathering ? target?.xp ?? t.xp : t.xp;
              const targetY = isGathering ? target?.yp ?? t.yp : t.yp;

              const groupTokens = tokens.filter((x) => x.group === t.group);
              const innerIdx = groupTokens.findIndex((x) => x.symbol === t.symbol);

              return (
                <motion.div
                  key={`${t.group}-${t.symbol}`}
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
                      : phase === "sign"
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

        {/* Per-group final coins */}
        <AnimatePresence>
          {showCoins &&
            selectedGroups.map((id, idx) => {
              const g = GROUPS[id];
              const pos = groupPos[id];
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
                  <div
                    className="absolute inset-0 rounded-full pointer-events-none"
                    style={{
                      width: 72,
                      height: 72,
                      border: `2px solid ${g.color}`,
                      boxShadow: `0 0 24px ${g.color}99`,
                    }}
                  />
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
                  <div
                    className="absolute left-1/2 -translate-x-1/2 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-display font-bold uppercase tracking-wider whitespace-nowrap"
                    style={{
                      top: 76,
                      background: `${g.color}26`,
                      color: g.color,
                      border: `1px solid ${g.color}55`,
                    }}
                  >
                    {g.short}
                  </div>
                </motion.div>
              );
            })}
        </AnimatePresence>

        {/* Rent reclaim sparkles — small SOL coins fly out from each group */}
        <AnimatePresence>
          {showRentBurst &&
            selectedGroups.map((id) => {
              const pos = groupPos[id];
              if (!pos) return null;
              return [0, 1, 2].map((j) => {
                const angle = (j / 3) * Math.PI * 2 + Math.PI / 4;
                const dx = Math.cos(angle) * 60;
                const dy = Math.sin(angle) * 60;
                return (
                  <motion.div
                    key={`rent-${id}-${j}`}
                    className="absolute pointer-events-none"
                    style={{
                      left: `${pos.xp}%`,
                      top: `${pos.yp}%`,
                      marginLeft: -8,
                      marginTop: -8,
                    }}
                    initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                    animate={{ x: dx, y: dy, scale: 1, opacity: [0, 1, 0] }}
                    transition={{ duration: 1.0, delay: 0.1 + j * 0.08, ease: "easeOut" }}
                  >
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center font-mono font-bold text-[7px] text-void"
                      style={{
                        background: "radial-gradient(circle at 30% 30%, #FFD27A, #B58B3A)",
                        boxShadow: "0 0 8px rgba(255,210,122,0.8)",
                      }}
                    >
                      ◎
                    </div>
                  </motion.div>
                );
              });
            })}
        </AnimatePresence>
      </div>

      {/* Status copy + progress */}
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
              {phase === "build"   && "Building batch transaction…"}
              {phase === "sign"    && "Awaiting your signature…"}
              {phase === "route"   && "Routing through Jupiter…"}
              {phase === "reclaim" && "Reclaiming SOL rent…"}
              {phase === "settle"  && "Done."}
            </motion.span>
          </AnimatePresence>
        </div>
        <ProgressBar value={progress} color={sweepMode ? "magenta" : "sweep"} />
        <div className="flex justify-between mt-2 text-[12px] font-mono text-text-muted">
          <span>
            {phase === "build" && `${totals.txCount} v0 ${totals.txCount === 1 ? "tx" : "txs"} · ALTs`}
            {phase === "sign" && "Signing in wallet"}
            {phase === "route" && `${totals.tokenCount} swaps · atomic`}
            {phase === "reclaim" && `+$${totals.rent.toFixed(2)} SOL`}
            {phase === "settle" && "Confirmed"}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
      </div>
    </div>
  );
}
