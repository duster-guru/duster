import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, ChevronDown, Sparkles, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import Particles from "../components/Particles";
import CountUp from "../components/CountUp";
import { GhostButton, GlassButton, HeroGlassCard, MicroLabel, PrimaryButton, TokenIcon } from "../components/UI";
import {
  ALL_CHAIN_IDS,
  CHAINS,
  DUST_TOKENS,
  getChainSummary,
  getTotalsFor,
} from "../lib/data";
import { SCREENS } from "../lib/screens";
import { haptic } from "../lib/haptics";

const ease = [0.16, 1, 0.3, 1];

export default function Results({ go, sweepMode, setSweepMode, selectedChains, setSelectedChains }) {
  const [revealDone, setRevealDone] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const chainSummaries = useMemo(() => getChainSummary(ALL_CHAIN_IDS), []);
  const totals = useMemo(() => getTotalsFor(selectedChains), [selectedChains]);

  const toggleChain = (id) => {
    haptic.light?.();
    setSelectedChains((prev) =>
      prev.includes(id)
        ? prev.length > 1
          ? prev.filter((c) => c !== id)
          : prev // never let user deselect everything
        : [...prev, id]
    );
  };

  const visibleTokens = expanded ? totals.tokens : totals.tokens.slice(0, 4);
  const remaining = totals.tokens.length - visibleTokens.length;
  const remainingValue = totals.tokens
    .slice(visibleTokens.length)
    .reduce((s, t) => s + t.value, 0);

  const noneSelected = selectedChains.length === 0;

  return (
    <div className="relative w-full h-full overflow-hidden">
      <Particles mode="burst" count={60} className="opacity-70" />

      <div className="relative z-10 h-full flex flex-col px-5 pt-16 pb-6 overflow-y-auto no-scrollbar">
        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.15, ease }}
          className="text-center"
        >
          <MicroLabel color="gold">We found hidden money</MicroLabel>
        </motion.div>

        {/* Big number */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
          className="mt-3 text-center"
        >
          <div className="text-[64px] leading-none font-display font-bold text-gradient-found tracking-tight">
            <CountUp
              to={totals.total}
              duration={revealDone ? 380 : 1100}
              prefix="$"
              decimals={2}
              onDone={() => { if (!revealDone) { haptic.medium?.(); setRevealDone(true); } }}
            />
          </div>
          <div className="mt-2 text-[14px] text-text-secondary">
            <span className="font-mono tabular-nums">{totals.tokenCount}</span> tokens ·{" "}
            <span className="font-mono tabular-nums">{totals.chainCount}</span>{" "}
            {totals.chainCount === 1 ? "chain" : "chains"}
          </div>
        </motion.div>

        {/* Chain chips — tap to include/exclude */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.55, ease }}
          className="mt-5"
        >
          <div className="flex items-center justify-between mb-2 px-1">
            <MicroLabel>Networks</MicroLabel>
            <span className="text-[11px] text-text-muted">
              tap to include
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {chainSummaries.map((c) => {
              const selected = selectedChains.includes(c.id);
              return (
                <motion.button
                  key={c.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => toggleChain(c.id)}
                  className="relative flex items-center gap-2.5 h-12 px-3 rounded-md text-left transition-colors"
                  style={{
                    background: selected ? `${c.color}1A` : "rgba(255,255,255,0.03)",
                    border: `1.5px solid ${selected ? c.color : "rgba(255,255,255,0.06)"}`,
                    boxShadow: selected ? `0 0 16px ${c.color}33` : "none",
                  }}
                >
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${c.color}, ${c.color}99)`,
                      boxShadow: `0 0 8px ${c.color}55`,
                      opacity: selected ? 1 : 0.4,
                    }}
                  >
                    {c.glyph}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-display font-semibold text-text-primary leading-none truncate">
                      {c.name}
                    </div>
                    <div className="text-[11px] font-mono text-text-muted tabular-nums mt-0.5">
                      ${c.total.toFixed(2)}
                    </div>
                  </div>
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: selected ? c.color : "transparent",
                      border: selected ? "none" : "1.5px solid rgba(255,255,255,0.2)",
                    }}
                  >
                    {selected && <Check size={10} className="text-void" strokeWidth={3.5} />}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7, ease }}
          className="mt-4"
        >
          <HeroGlassCard animated={revealDone}>
            <div className="flex items-center justify-between mb-3">
              <MicroLabel>Token</MicroLabel>
              <MicroLabel>Value</MicroLabel>
            </div>
            <div className="h-px w-full bg-white/10 mb-2" />

            <ul className="flex flex-col">
              <AnimatePresence initial={false} mode="popLayout">
                {visibleTokens.map((t, i) => {
                  const chain = CHAINS[t.chain];
                  return (
                    <motion.li
                      key={`${t.symbol}-${t.chain}`}
                      layout
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.28, delay: revealDone ? 0 : 0.85 + i * 0.05, ease }}
                      className="flex items-center gap-3 py-2"
                    >
                      <TokenIcon symbol={t.symbol} color={t.color} size={28} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-display font-semibold text-text-primary leading-none">
                          {t.symbol}
                        </div>
                        <div className="text-[11px] mt-0.5 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: chain.color }} />
                          <span className="text-text-muted">{chain.name}</span>
                        </div>
                      </div>
                      <div className="font-mono text-[14px] text-text-primary tabular-nums">
                        ${t.value.toFixed(2)}
                      </div>
                    </motion.li>
                  );
                })}
              </AnimatePresence>

              {!expanded && remaining > 0 && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: revealDone ? 0 : 1.2 }}
                  onClick={() => { haptic.light?.(); setExpanded(true); }}
                  className="flex items-center gap-3 py-2 text-left"
                >
                  <div className="w-7 h-7 rounded-full bg-white/8 flex items-center justify-center text-text-muted">
                    <span className="text-[10px] font-mono">+{remaining}</span>
                  </div>
                  <div className="flex-1 text-[14px] text-text-secondary">
                    {remaining} more tokens
                  </div>
                  <div className="font-mono text-[14px] text-text-secondary tabular-nums">
                    ${remainingValue.toFixed(2)}
                  </div>
                  <ChevronDown size={16} className="text-text-muted" />
                </motion.button>
              )}
            </ul>

            <div className="h-px w-full bg-white/10 my-3" />
            <div className="flex items-center justify-between py-1">
              <span className="text-[13px] text-text-secondary">
                Est. gas · {totals.chainCount} {totals.chainCount === 1 ? "chain" : "chains"}
              </span>
              <span className="font-mono text-[13px] text-warn tabular-nums">
                −${totals.gas.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-[13px] text-text-primary font-semibold">You receive</span>
              <span className="font-mono text-[14px] text-sweep font-bold tabular-nums">
                ${totals.net.toFixed(2)}
              </span>
            </div>
          </HeroGlassCard>
        </motion.div>

        {/* Sweep mode */}
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 1.0, ease }}
          onClick={() => { haptic.light?.(); setSweepMode((s) => !s); }}
          className="mt-3 w-full flex items-center gap-3 px-4 py-3 rounded-md text-left"
          style={{
            border: `1px solid ${sweepMode ? "rgba(255,79,216,0.6)" : "rgba(255,79,216,0.3)"}`,
            background: sweepMode
              ? "linear-gradient(135deg, rgba(255,79,216,0.18), rgba(91,140,255,0.10))"
              : "rgba(255,79,216,0.06)",
            boxShadow: sweepMode ? "0 0 24px rgba(255,79,216,0.35)" : "none",
          }}
        >
          <span className="w-9 h-9 rounded-full bg-magenta/20 flex items-center justify-center">
            <Zap size={18} className="text-magenta" fill="#FF4FD8" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-display font-semibold text-[14px] text-text-primary">
                +10% SWEEP MODE
              </span>
              <span className="text-[10px] uppercase tracking-wider text-magenta font-bold">Bonus</span>
            </div>
            <div className="text-[12px] text-text-secondary leading-snug mt-0.5">
              Convert to <span className="text-magenta font-semibold">$SWEEP</span> token instead.
            </div>
          </div>
          <span className={`relative w-10 h-6 rounded-full transition-colors ${sweepMode ? "bg-magenta" : "bg-white/15"}`}>
            <motion.span
              className="absolute top-0.5 w-5 h-5 rounded-full bg-white"
              animate={{ left: sweepMode ? 18 : 2 }}
              transition={{ duration: 0.2, ease }}
            />
          </span>
        </motion.button>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.15, ease }}
          className="mt-4 flex flex-col gap-2.5"
        >
          <PrimaryButton
            onClick={() => go(SCREENS.CLEANING)}
            glow={sweepMode ? "magenta" : "mint"}
            icon={sweepMode ? <Sparkles size={18} /> : <ArrowRight size={20} strokeWidth={2.5} />}
            hapticType="medium"
            className={noneSelected ? "opacity-60 pointer-events-none" : ""}
          >
            {sweepMode
              ? `Sweep into $SWEEP · ${totals.chainCount}`
              : `Clean ${totals.chainCount === 1 ? "1 chain" : `${totals.chainCount} chains`}`}
          </PrimaryButton>
          {!sweepMode && (
            <GlassButton onClick={() => go(SCREENS.CLEANING)}>
              Keep as USDC
            </GlassButton>
          )}
          <div className="flex justify-center">
            <GhostButton onClick={() => go(SCREENS.SPLASH)}>Cancel</GhostButton>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
