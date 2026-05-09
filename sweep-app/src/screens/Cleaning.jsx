import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, PenLine } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ProgressBar } from "../components/UI";
import { ALL_GROUP_IDS, GROUPS } from "../lib/solana/groups";
import { SCREENS } from "../lib/screens";
import { SWEEP_MINT, USDC_MINT } from "../lib/config";
import { haptic } from "../lib/haptics";

const ease = [0.16, 1, 0.3, 1];

function getGroupLayout(n) {
  if (n <= 1) return [[50, 46]];
  if (n === 2) return [[32, 46], [68, 46]];
  if (n === 3) return [[30, 36], [70, 36], [50, 58]];
  return [[32, 36], [68, 36], [32, 58], [68, 58]];
}

/**
 * Cleaning screen — drives real sweep execution via the useSweepExecution hook
 * lifted in App.jsx. Visual phases are mapped from the hook's phase machine.
 *
 * Hook phase    → Visual phase  → Animation
 * --------------+----------------+--------------------------------
 * building      → gather         → tokens move to group centers
 * signing       → sign           → hold + 1-sig badge top
 * sending       → dissolve       → tokens fade to particles
 * confirming    → coalesce       → coins emerge with chain glow
 * success       → settle         → coins pulse, auto-advance
 * error         → error overlay  → user can retry or go back
 */
export default function Cleaning({ go, scan, exec, filteredDust, selectedGroups, sweepMode }) {
  const containerRef = useRef(null);
  const launched = useRef(false);

  const presentGroups = useMemo(() => {
    const set = new Set(filteredDust.map((d) => d.groupId));
    return ALL_GROUP_IDS.filter((id) => set.has(id));
  }, [filteredDust]);

  const layout = useMemo(() => getGroupLayout(presentGroups.length), [presentGroups]);
  const groupPos = useMemo(() => {
    const map = {};
    presentGroups.forEach((id, i) => {
      const [xp, yp] = layout[Math.min(i, layout.length - 1)];
      map[id] = { xp, yp };
    });
    return map;
  }, [presentGroups, layout]);

  const tokens = useMemo(() => {
    return filteredDust.map((t, i) => {
      const r = (seed) => ((Math.sin(seed * 12.9898) * 43758.5453) % 1 + 1) % 1;
      const xp = 14 + r(i + 1) * 72;
      const yp = 14 + r(i + 7) * 26;
      return { ...t, xp, yp, idx: i };
    });
  }, [filteredDust]);

  // Kick off the real sweep once on mount. Output mint depends on sweep mode:
  // SWEEP_MINT (configured) when sweepMode is on, USDC otherwise.
  useEffect(() => {
    if (launched.current) return;
    launched.current = true;
    const outputMint = sweepMode && SWEEP_MINT ? SWEEP_MINT : USDC_MINT;
    exec.sweep(filteredDust, { outputMint }).catch(() => {
      // Error is already on exec.error; UI handles via phase === 'error'.
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-advance on success.
  useEffect(() => {
    if (exec.phase === "success") {
      haptic.success?.();
      const t = setTimeout(() => go(SCREENS.SUCCESS), 600);
      return () => clearTimeout(t);
    }
  }, [exec.phase, go]);

  // Phase haptics.
  useEffect(() => {
    if (exec.phase === "signing") haptic.medium?.();
    if (exec.phase === "sending") haptic.medium?.();
  }, [exec.phase]);

  const phase = exec.phase;
  const isError = phase === "error";
  const showHalos = ["sending", "confirming", "success"].includes(phase);
  const showCoins = ["confirming", "success"].includes(phase);
  const showSignBadge = phase === "signing";

  return (
    <div className="relative w-full h-full overflow-hidden">
      <motion.div
        className="absolute inset-0"
        animate={{
          background: showHalos
            ? "radial-gradient(ellipse at center, rgba(255,210,122,0.15) 0%, rgba(6,7,13,1) 70%)"
            : "radial-gradient(ellipse at center, rgba(124,255,178,0.10) 0%, rgba(6,7,13,1) 70%)",
        }}
        transition={{ duration: 0.6 }}
      />

      <AnimatePresence>
        {showSignBadge && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.3, ease }}
            className="absolute top-[8%] left-1/2 -translate-x-1/2 px-4 py-2 rounded-full glass-strong flex items-center gap-2 z-30"
            style={{ boxShadow: "0 0 24px rgba(124,255,178,0.4)" }}
          >
            <PenLine size={14} className="text-sweep" />
            <span className="text-[12px] font-display font-semibold text-text-primary">
              Approve in your wallet · {exec.txCount} {exec.txCount === 1 ? "tx" : "txs"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={containerRef} className="relative w-full h-full">
        {/* Per-group halos */}
        {presentGroups.map((id) => {
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
              animate={{ opacity: showHalos ? 1 : 0, scale: showHalos ? 1 : 0.4 }}
              transition={{ duration: 0.6, ease }}
            />
          );
        })}

        {presentGroups.map((id) => {
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
                width: 100, height: 100, marginLeft: -50, marginTop: -50,
                borderRadius: "50%",
                border: `1.5px dashed ${g.color}55`,
              }}
              initial={{ opacity: 0, rotate: 0 }}
              animate={{
                opacity: ["building", "signing", "sending"].includes(phase) ? 0.9 : 0,
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
          {!["confirming", "success"].includes(phase) &&
            tokens.map((t, i) => {
              const target = groupPos[t.groupId];
              const isGathering = ["building", "signing", "sending"].includes(phase);
              const isDissolving = phase === "sending";
              const targetX = isGathering ? target?.xp ?? t.xp : t.xp;
              const targetY = isGathering ? target?.yp ?? t.yp : t.yp;
              const groupTokens = tokens.filter((x) => x.groupId === t.groupId);
              const innerIdx = groupTokens.findIndex((x) => x.ata === t.ata);

              return (
                <motion.div
                  key={t.ata}
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
                      ? { duration: 0.9, delay: innerIdx * 0.06, ease }
                      : isGathering
                        ? { duration: 0.9, delay: innerIdx * 0.05, ease }
                        : { duration: 0.5, delay: i * 0.05, ease }
                  }
                >
                  {t.logoURI ? (
                    <img
                      src={t.logoURI}
                      alt=""
                      className="w-[42px] h-[42px] rounded-full"
                      style={{ boxShadow: `0 0 16px ${t.color}80` }}
                    />
                  ) : (
                    <div
                      className="w-[42px] h-[42px] rounded-full flex items-center justify-center font-mono font-bold text-[10px] text-white"
                      style={{
                        background: `radial-gradient(circle at 30% 30%, ${t.color}ff, ${t.color}99)`,
                        boxShadow: `0 0 16px ${t.color}80, inset 0 1px 0 rgba(255,255,255,0.4)`,
                      }}
                    >
                      {(t.symbol || "?").slice(0, 3).toUpperCase()}
                    </div>
                  )}
                </motion.div>
              );
            })}
        </AnimatePresence>

        {/* Per-group final coins */}
        <AnimatePresence>
          {showCoins &&
            presentGroups.map((id, idx) => {
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
                      width: 72, height: 72,
                      border: `2px solid ${g.color}`,
                      boxShadow: `0 0 24px ${g.color}99`,
                    }}
                  />
                  <motion.div
                    className="w-[72px] h-[72px] rounded-full flex items-center justify-center font-display font-bold text-[12px] text-void"
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
                    {sweepMode ? "$SWEEP" : "USDC"}
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
      </div>

      {/* Status + progress */}
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
              {phase === "idle"       && "Preparing…"}
              {phase === "building"   && "Building batch transaction…"}
              {phase === "signing"    && "Awaiting your signature…"}
              {phase === "sending"    && "Routing through Jupiter…"}
              {phase === "confirming" && "Confirming on-chain…"}
              {phase === "success"    && "Done."}
              {phase === "error"      && "Sweep failed"}
            </motion.span>
          </AnimatePresence>
        </div>
        {!isError && <ProgressBar value={exec.progress} />}
        <div className="flex justify-between mt-2 text-[12px] font-mono text-text-muted">
          <span>
            {phase === "building"   && `${filteredDust.length} swaps · packing v0`}
            {phase === "signing"    && `${exec.txCount} tx · 1 signature`}
            {phase === "sending"    && `submitting ${exec.txCount} tx`}
            {phase === "confirming" && "polling getSignatureStatuses"}
            {phase === "success"    && "Confirmed"}
            {phase === "error"      && "see details below"}
          </span>
          <span>{!isError && `${Math.round(exec.progress)}%`}</span>
        </div>
      </div>

      <AnimatePresence>
        {isError && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-6 left-5 right-5 rounded-md p-4 flex flex-col gap-3 z-40"
            style={{ background: "rgba(255,107,122,0.10)", border: "1px solid rgba(255,107,122,0.3)" }}
          >
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-danger shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-display font-semibold text-text-primary">
                  Couldn't complete the sweep
                </div>
                <div className="text-[12px] text-text-secondary mt-1 leading-snug break-words">
                  {exec.error?.message || "Unknown error"}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { exec.reset(); go(SCREENS.RESULTS); }}
                className="h-10 rounded-full glass text-[13px] font-display font-semibold text-text-primary"
              >
                Back
              </button>
              <button
                onClick={() => {
                  exec.reset();
                  launched.current = false;
                  // Trigger a remount of the page to retry
                  go(SCREENS.CLEANING);
                }}
                className="h-10 rounded-full bg-sweep text-void text-[13px] font-display font-bold"
              >
                Retry
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
