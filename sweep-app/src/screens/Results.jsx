import { useWallet } from "@solana/wallet-adapter-react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, ChevronDown, PenLine, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import Particles from "../components/Particles";
import CountUp from "../components/CountUp";
import { GhostButton, GlassButton, HeroGlassCard, MicroLabel, PrimaryButton, TokenIcon } from "../components/UI";
import { ALL_GROUP_IDS, GROUPS, summarizeGroups, totalsFor } from "../lib/solana/groups";
import { SCREENS } from "../lib/screens";
import { haptic } from "../lib/haptics";

const ease = [0.16, 1, 0.3, 1];

export default function Results({ go, scan, selectedGroups, setSelectedGroups }) {
  const { disconnect } = useWallet();
  const [revealDone, setRevealDone] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const allGroups = useMemo(() => summarizeGroups(scan.dust, ALL_GROUP_IDS), [scan.dust]);
  const presentGroupIds = allGroups.map((g) => g.id);
  const totals = useMemo(
    () => totalsFor(scan.dust, selectedGroups.filter((g) => presentGroupIds.includes(g))),
    [scan.dust, selectedGroups, presentGroupIds.join(",")]
  );

  const toggleGroup = (id) => {
    if (!presentGroupIds.includes(id)) return;
    haptic.light?.();
    setSelectedGroups((prev) => {
      const intersect = prev.filter((g) => presentGroupIds.includes(g));
      if (intersect.includes(id)) {
        return intersect.length > 1 ? intersect.filter((g) => g !== id) : intersect;
      }
      return [...intersect, id];
    });
  };

  const visibleTokens = expanded ? totals.tokens : totals.tokens.slice(0, 4);
  const remaining = totals.tokens.length - visibleTokens.length;
  const remainingValue = totals.tokens
    .slice(visibleTokens.length)
    .reduce((s, t) => s + (t.valueUsd || 0), 0);

  // Empty state — wallet has no dust under threshold
  if (scan.status === "empty" || (scan.status === "ready" && scan.dust.length === 0)) {
    return (
      <div className="relative w-full h-full">
        <Particles mode="ambient" count={40} className="opacity-50" />
        <div className="relative z-10 h-full flex flex-col items-center justify-center px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
          >
            <Sparkles size={36} className="mx-auto text-sweep mb-3" />
            <h1 className="font-display text-[30px] font-bold text-text-primary leading-tight">
              Wallet's already clean
            </h1>
            <p className="mt-3 text-[14px] text-text-secondary max-w-[280px] mx-auto">
              No SPL token under the dust threshold. Try another wallet or come back when you've collected some scraps.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <PrimaryButton onClick={() => { scan.refresh(); }}>Rescan</PrimaryButton>
              <GhostButton onClick={async () => { await disconnect(); go(SCREENS.SPLASH); }}>
                Disconnect
              </GhostButton>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      <Particles mode="burst" count={60} className="opacity-70" />

      <div className="relative z-10 h-full flex flex-col px-5 pt-10 pb-6 overflow-y-auto no-scrollbar">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1, ease }}
          className="text-center"
        >
          <MicroLabel color="gold">We found hidden money</MicroLabel>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
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
            <span className="font-mono tabular-nums">{totals.groupCount}</span>{" "}
            {totals.groupCount === 1 ? "tx" : "txs"}
          </div>
        </motion.div>

        {/* Groups (only ones the user actually has) */}
        {allGroups.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5, ease }}
            className="mt-5"
          >
            <div className="flex items-center justify-between mb-2 px-1">
              <MicroLabel>Token programs</MicroLabel>
              <span className="text-[11px] text-text-muted">1 sig per program</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {allGroups.map((g) => {
                const selected = selectedGroups.includes(g.id);
                return (
                  <motion.button
                    key={g.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => toggleGroup(g.id)}
                    className="relative flex items-center gap-2 min-h-[56px] py-2 px-2.5 rounded-md text-left transition-colors"
                    style={{
                      background: selected ? `${g.color}1A` : "rgba(255,255,255,0.03)",
                      border: `1.5px solid ${selected ? g.color : "rgba(255,255,255,0.06)"}`,
                      boxShadow: selected ? `0 0 16px ${g.color}33` : "none",
                    }}
                  >
                    <span
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0"
                      style={{
                        background: `linear-gradient(135deg, ${g.color}, ${g.color}99)`,
                        boxShadow: `0 0 8px ${g.color}55`,
                        opacity: selected ? 1 : 0.4,
                      }}
                    >
                      {g.glyph}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-display font-semibold text-text-primary leading-tight">
                        {g.name}
                      </div>
                      <div className="text-[11px] font-mono text-text-muted tabular-nums mt-0.5 whitespace-nowrap">
                        ${g.total.toFixed(2)} · {g.tokens.length}
                      </div>
                    </div>
                    <span
                      className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background: selected ? g.color : "transparent",
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
        )}

        {/* Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.65, ease }}
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
                {visibleTokens.map((t, i) => (
                  <motion.li
                    key={t.ata}
                    layout
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.28, delay: revealDone ? 0 : 0.85 + i * 0.05, ease }}
                    className="flex items-center gap-3 py-2"
                  >
                    {t.logoURI ? (
                      <img src={t.logoURI} alt="" className="w-7 h-7 rounded-full" />
                    ) : (
                      <TokenIcon symbol={t.symbol} color={t.color} size={28} />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-display font-semibold text-text-primary leading-none truncate">
                        {t.symbol}
                      </div>
                      <div className="text-[11px] mt-0.5 flex items-center gap-1 truncate">
                        <span className="text-text-muted truncate">
                          {t.uiAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })} {t.symbol}
                        </span>
                        {t.isUnverified && (
                          <span className="text-warn text-[10px] uppercase tracking-wider">unverified</span>
                        )}
                      </div>
                    </div>
                    <div className="font-mono text-[14px] text-text-primary tabular-nums">
                      ${t.valueUsd.toFixed(2)}
                    </div>
                  </motion.li>
                ))}
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
                Network + priority fee
              </span>
              <span className="font-mono text-[13px] text-text-muted tabular-nums">
                ~$0.01
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-[13px] text-text-secondary flex items-center gap-1.5">
                Rent reclaim
                <span className="text-[10px] uppercase tracking-wider text-sweep font-bold">free SOL</span>
              </span>
              <span className="font-mono text-[13px] text-sweep tabular-nums">
                +~${(totals.tokenCount * 0.31).toFixed(2)}
              </span>
            </div>
            <div className="h-px w-full bg-white/10 my-2" />
            <div className="flex items-center justify-between py-1">
              <span className="text-[13px] text-text-primary font-semibold">You receive (est.)</span>
              <span className="font-mono text-[14px] text-sweep font-bold tabular-nums">
                ~${(totals.total + totals.tokenCount * 0.31 - 0.01).toFixed(2)}
              </span>
            </div>
          </HeroGlassCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.95, ease }}
          className="mt-4 flex flex-col gap-2.5"
        >
          <PrimaryButton
            onClick={() => go(SCREENS.CLEANING)}
            icon={<PenLine size={18} strokeWidth={2.5} />}
            hapticType="medium"
          >
            Clean · 1 signature
          </PrimaryButton>
          <GlassButton onClick={() => go(SCREENS.CLEANING)}>
            Keep as USDC
          </GlassButton>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-text-muted">
            <ArrowRight size={11} className="-rotate-45 text-text-muted" />
            <span>Powered by Jupiter · {totals.groupCount} versioned {totals.groupCount === 1 ? "tx" : "txs"}</span>
          </div>
          <div className="flex justify-center">
            <GhostButton onClick={async () => { await disconnect(); go(SCREENS.SPLASH); }}>
              Disconnect
            </GhostButton>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
