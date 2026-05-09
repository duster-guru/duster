import { useWallet } from "@solana/wallet-adapter-react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, ChevronDown, ChevronUp, Info, PenLine, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import Particles from "../components/Particles";
import CountUp from "../components/CountUp";
import { GhostButton, HeroGlassCard, MicroLabel, PrimaryButton, TokenIcon } from "../components/UI";
import { ALL_GROUP_IDS, summarizeGroups, totalsFor } from "../lib/solana/groups";
import { formatTokenAmount, getAvailableOutputs, getEffectivePrice, getOutputAsset, usdToTokenAmount } from "../lib/solana/outputs";
import { DUST_THRESHOLD_USD, FEE_AUTHORITY, RENT_PER_ACCOUNT_SOL, SOL_USD_REF } from "../lib/config";
import { SCREENS } from "../lib/screens";
import { haptic } from "../lib/haptics";

const ease = [0.16, 1, 0.3, 1];

const VIEW_KEY = "sweep:ui:advanced";

export default function Results({ go, scan, selectedGroups, setSelectedGroups, outputAsset, setOutputAsset }) {
  const { disconnect } = useWallet();
  const [revealDone, setRevealDone] = useState(false);
  const [expanded, setExpanded] = useState(false);
  // Simple = default for new users. Power users can flip to advanced once
  // and we'll remember the preference across sessions.
  const [simpleMode, setSimpleMode] = useState(() => {
    try {
      return localStorage.getItem(VIEW_KEY) !== "1";
    } catch { return true; }
  });
  const toggleMode = () => {
    haptic.light?.();
    setSimpleMode((prev) => {
      const next = !prev;
      try { localStorage.setItem(VIEW_KEY, next ? "0" : "1"); } catch { /* ignore */ }
      return next;
    });
  };
  const [hintOpen, setHintOpen] = useState(false);
  const hintRef = useRef(null);
  const hintTriggerRef = useRef(null);

  const [perksOpen, setPerksOpen] = useState(false);
  const perksRef = useRef(null);
  const perksTriggerRef = useRef(null);

  // Click anywhere outside the popover (and the trigger button) to dismiss.
  useEffect(() => {
    if (!hintOpen) return;
    const onPointerDown = (e) => {
      const inPopover = hintRef.current?.contains(e.target);
      const inTrigger = hintTriggerRef.current?.contains(e.target);
      if (!inPopover && !inTrigger) setHintOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [hintOpen]);

  useEffect(() => {
    if (!perksOpen) return;
    const onPointerDown = (e) => {
      const inPopover = perksRef.current?.contains(e.target);
      const inTrigger = perksTriggerRef.current?.contains(e.target);
      if (!inPopover && !inTrigger) setPerksOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [perksOpen]);

  const allGroups = useMemo(() => summarizeGroups(scan.dust, ALL_GROUP_IDS), [scan.dust]);
  const presentGroupIds = useMemo(() => allGroups.map((g) => g.id), [allGroups]);
  const presentGroupKey = presentGroupIds.join(",");
  const totals = useMemo(
    () => totalsFor(scan.dust, selectedGroups.filter((g) => presentGroupIds.includes(g))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scan.dust, selectedGroups, presentGroupKey]
  );

  const availableOutputs = useMemo(() => getAvailableOutputs(), []);
  const asset = getOutputAsset(outputAsset);
  const livePrices = scan.outputPrices;
  const livePriceSol = getEffectivePrice(getOutputAsset("sol"), livePrices);

  // -----------------------------------------------------------------------
  // Two independent accounting buckets — DO NOT merge unless output is SOL.
  //
  //   1. SWAP MATH  (Jupiter side)
  //        gross dust value − platform fee − network fee = swap output
  //        Output unit = the selected asset (USDC, SOL, or $SWEEP).
  //
  //   2. RENT RECLAIM  (close-account side, ALWAYS native SOL)
  //        N closed ATAs × 0.00203928 SOL each = reclaimed SOL
  //        This is user-owned SOL previously locked for rent exemption.
  //        Goes back to the wallet as native SOL regardless of output asset.
  // -----------------------------------------------------------------------
  const platformFeeUsd = +(totals.total * (asset.feeBps / 10_000)).toFixed(2);
  const networkFeeUsd = 0.01;
  const swapOutputUsd = +(totals.total - platformFeeUsd - networkFeeUsd).toFixed(2);

  const rentReclaimSol = +(totals.tokenCount * RENT_PER_ACCOUNT_SOL).toFixed(6);
  const rentReclaimUsd = +(rentReclaimSol * livePriceSol).toFixed(2);

  // SOL output: rent SOL aggregates with swap-output SOL into one balance.
  // USDC / SWEEP output: rent SOL stays separate as a native-SOL line.
  const outputIsSol = asset.id === "sol";
  const swapOutputAsset = +usdToTokenAmount(swapOutputUsd, asset, livePrices).toFixed(6);
  const totalSolReceived = outputIsSol ? +(swapOutputAsset + rentReclaimSol).toFixed(6) : null;
  const totalUnlockedUsd = +(swapOutputUsd + rentReclaimUsd).toFixed(2);
  void SOL_USD_REF;

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

  // Empty state
  if (scan.status === "empty" || (scan.status === "ready" && scan.dust.length === 0)) {
    const d = scan.diag || {};
    const hasAccounts = (d.nonZeroCount || 0) > 0;
    const headline = !hasAccounts
      ? "No tokens to clean"
      : d.aboveThresholdCount > 0
      ? "Nothing in the dust range"
      : "Wallet's already clean";
    const reason = !hasAccounts
      ? "This wallet has no non-zero SPL token balances."
      : d.aboveThresholdCount > 0 && d.pricedCount === d.aboveThresholdCount
      ? `All ${d.aboveThresholdCount} priced tokens are above the $5 dust threshold — those are real positions, not dust.`
      : d.pricedCount === 0
      ? `Found ${d.nonZeroCount} token accounts but Jupiter couldn't price any of them (no liquid market).`
      : `Found ${d.nonZeroCount} accounts · priced ${d.pricedCount} · ${d.aboveThresholdCount} above $5 · ${d.belowMinCount} below $0.05.`;

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
              {headline}
            </h1>
            <p className="mt-3 text-[14px] text-text-secondary max-w-[300px] mx-auto leading-snug">
              {reason}
            </p>
            <div className="mt-5 inline-grid grid-cols-2 gap-x-5 gap-y-1 text-[11px] font-mono text-text-muted">
              <span className="text-left">accounts</span><span className="text-right tabular-nums">{d.accountCount ?? 0}</span>
              <span className="text-left">non-zero</span><span className="text-right tabular-nums">{d.nonZeroCount ?? 0}</span>
              <span className="text-left">priced</span><span className="text-right tabular-nums">{d.pricedCount ?? 0}</span>
              <span className="text-left">{">$5"}</span><span className="text-right tabular-nums">{d.aboveThresholdCount ?? 0}</span>
            </div>
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
          className="relative w-full flex items-center justify-center gap-1.5"
        >
          <button
            ref={hintTriggerRef}
            onClick={() => { haptic.light?.(); setHintOpen((v) => !v); }}
            className="flex items-center gap-1"
            title={`Dust = tokens valued under $${DUST_THRESHOLD_USD}.`}
          >
            <span
              className="text-[11px] font-display font-semibold uppercase tracking-[0.16em] text-gold"
              style={{ borderBottom: "1px dashed rgba(255,210,122,0.45)", paddingBottom: 1 }}
            >
              We found hidden money
            </span>
            <Info size={10} className="text-gold opacity-70" />
          </button>

          {/* Hint popover — Framer Motion's `motion.div` manages the
              `transform` style directly, which clobbers Tailwind's
              `-translate-x-1/2`. Centering via motion's own `x` prop
              instead so they don't collide. */}
          <AnimatePresence>
            {hintOpen && (
              <motion.div
                ref={hintRef}
                initial={{ opacity: 0, y: -4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.96 }}
                transition={{ duration: 0.2 }}
                className="text-[11px] text-text-secondary text-center leading-snug px-3 py-2 rounded-md"
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  left: "50%",
                  x: "-50%",                // motion-aware translateX
                  width: 260,
                  zIndex: 40,
                  background: "#161A26",
                  border: "1px solid rgba(255,210,122,0.35)",
                  boxShadow: "0 12px 32px rgba(0,0,0,0.75), 0 0 0 1px rgba(0,0,0,0.4)",
                }}
              >
                Dust = tokens valued under{" "}
                <span className="text-gold font-semibold">${DUST_THRESHOLD_USD}</span>.
                Anything above is a real position and skipped.
              </motion.div>
            )}
          </AnimatePresence>
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
          <div className="mt-1.5 text-[12px] text-text-muted uppercase tracking-[0.16em] font-semibold">
            gross dust value
          </div>
          <div className="mt-1 text-[12px] text-text-secondary">
            <span className="font-mono tabular-nums">{totals.tokenCount}</span> tokens ·{" "}
            <span className="font-mono tabular-nums">{totals.groupCount}</span>{" "}
            {totals.groupCount === 1 ? "tx" : "txs"}
          </div>

          {/* Net receivable pills.
                SOL output: ONE pill — swap output + rent reclaim aggregate.
                USDC/SWEEP: TWO pills — swap output (in asset) + rent (SOL),
                because these arrive as different assets and must not be
                conflated as a single number. */}
          <motion.div
            key={`pills-${asset.id}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease }}
            className="mt-3 flex flex-wrap items-center justify-center gap-1.5"
          >
            {(simpleMode || outputIsSol) ? (
              // Single pill — total value as one number
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{
                  background: `${asset.accent},0.12)`,
                  border: `1px solid ${asset.accent},0.45)`,
                  boxShadow: `0 0 14px ${asset.accent},0.30)`,
                }}
              >
                <ArrowRight size={12} style={{ color: asset.color }} strokeWidth={2.5} />
                <span className="text-[10px] uppercase tracking-wider font-bold opacity-70" style={{ color: asset.color }}>
                  you get
                </span>
                <span className="text-[12px] font-display font-bold" style={{ color: asset.color }}>
                  {outputIsSol
                    ? `~${formatTokenAmount(totalSolReceived, asset, livePrices)} SOL`
                    : `~$${totalUnlockedUsd.toFixed(2)}`}
                </span>
                <span
                  className="text-[10px] uppercase tracking-wider font-bold opacity-70"
                  style={{ color: asset.color }}
                >
                  {outputIsSol ? `~$${totalUnlockedUsd.toFixed(2)}` : "total"}
                </span>
              </span>
            ) : (
              // Advanced two-pill split — surfaces dual-asset arrival
              <>
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                  style={{
                    background: `${asset.accent},0.12)`,
                    border: `1px solid ${asset.accent},0.45)`,
                    boxShadow: `0 0 14px ${asset.accent},0.30)`,
                  }}
                >
                  <ArrowRight size={12} style={{ color: asset.color }} strokeWidth={2.5} />
                  <span className="text-[10px] uppercase tracking-wider font-bold opacity-70" style={{ color: asset.color }}>
                    you get
                  </span>
                  <span className="text-[12px] font-display font-bold" style={{ color: asset.color }}>
                    ~{formatTokenAmount(swapOutputAsset, asset, livePrices)} {asset.symbol}
                  </span>
                  <span
                    className="text-[10px] uppercase tracking-wider font-bold opacity-70"
                    style={{ color: asset.color }}
                  >
                    ~${swapOutputUsd.toFixed(2)}
                  </span>
                </span>
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                  style={{
                    background: "rgba(255,210,122,0.10)",
                    border: "1px solid rgba(255,210,122,0.40)",
                  }}
                >
                  <span className="text-gold text-[11px] font-bold">+</span>
                  <span className="text-[12px] font-display font-bold text-gold tabular-nums">
                    {rentReclaimSol.toFixed(4)} SOL
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-gold opacity-70 font-bold">
                    rent
                  </span>
                </span>
              </>
            )}
          </motion.div>
        </motion.div>

        {/* Group chips — advanced only (most wallets have one program) */}
        {!simpleMode && allGroups.length > 1 && (
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

        {/* Output destination — 3-card picker */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6, ease }}
          className="mt-4 relative"
        >
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="flex items-center gap-2">
              <MicroLabel>Convert to</MicroLabel>
              <button
                onClick={() => { haptic.light?.(); scan.refreshPrices?.(); }}
                disabled={scan.pricesRefreshing}
                className="flex items-center gap-1 text-[10px] text-text-muted hover:text-text-secondary disabled:opacity-50"
                title="Auto-refreshes every 30s · tap to refresh now"
              >
                <RefreshCw
                  size={10}
                  className={scan.pricesRefreshing ? "animate-spin" : ""}
                />
                <span className="lowercase tracking-normal">prices live</span>
              </button>
            </div>
            {asset.id === "sweep" && (
              <button
                ref={perksTriggerRef}
                onClick={() => { haptic.light?.(); setPerksOpen((v) => !v); }}
                className="text-[10px] uppercase tracking-wider font-bold flex items-center gap-1"
                title="Tap to see SWEEP holder benefits"
              >
                <span className="text-magenta">lowest fee</span>
                <span
                  className="text-magenta opacity-70"
                  style={{ borderBottom: "1px dashed rgba(255,79,216,0.5)", paddingBottom: 1 }}
                >
                  + perks
                </span>
                <Info size={10} className="text-magenta opacity-70" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {availableOutputs.map((a) => {
              const isSelected = a.id === outputAsset;
              const cardLivePrice = getEffectivePrice(a, livePrices);
              const cardLiveOk = !!(livePrices && livePrices[a.id]);
              return (
                <motion.button
                  key={a.id}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => { haptic.light?.(); setOutputAsset(a.id); }}
                  className="relative flex flex-col items-center gap-1 px-2 py-3 rounded-md transition-colors"
                  style={{
                    background: isSelected ? `${a.accent},0.14)` : "rgba(255,255,255,0.03)",
                    border: `1.5px solid ${isSelected ? a.color : "rgba(255,255,255,0.06)"}`,
                    boxShadow: isSelected ? `0 0 18px ${a.accent},0.35)` : "none",
                  }}
                >
                  {scan.outputIcons?.[a.id] ? (
                    <img
                      src={scan.outputIcons[a.id]}
                      alt={a.symbol}
                      className="w-8 h-8 rounded-full mb-0.5 object-cover"
                      style={{
                        boxShadow: `0 0 10px ${a.accent},0.45)`,
                        opacity: isSelected ? 1 : 0.55,
                        background: `radial-gradient(circle at 30% 30%, ${a.color}33, transparent)`,
                      }}
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center font-display font-bold text-[10px] text-void mb-0.5"
                      style={{
                        background: `radial-gradient(circle at 30% 30%, ${a.color}, ${a.color}aa)`,
                        boxShadow: `0 0 10px ${a.accent},0.45)`,
                        opacity: isSelected ? 1 : 0.55,
                      }}
                    >
                      {a.symbol === "SWEEP" ? "✦" : a.symbol[0]}
                    </div>
                  )}
                  <div className="text-[12px] font-display font-bold text-text-primary leading-none">
                    {a.symbol}
                  </div>
                  <div
                    className="text-[10px] font-mono tabular-nums leading-none"
                    style={{ color: isSelected ? a.color : "#5A6175" }}
                  >
                    {(a.feeBps / 100).toFixed(0)}% fee
                  </div>
                  {/* Price line — render on EVERY card in advanced mode so
                      heights stay equal regardless of which is selected.
                      USDC shows $1.00 (it's a stablecoin; pinned). */}
                  {!simpleMode && (
                    <div
                      className="flex items-center gap-1 mt-0.5"
                      style={{ opacity: isSelected ? 1 : 0.55 }}
                    >
                      <span
                        className={`w-1 h-1 rounded-full ${scan.pricesRefreshing ? "animate-pulse" : ""}`}
                        style={{
                          background: cardLiveOk ? "#34E1A2" : "#FFB257",
                          boxShadow: cardLiveOk ? "0 0 4px #34E1A2" : "0 0 4px #FFB257",
                        }}
                        title={cardLiveOk ? "Live price from Jupiter" : "Using env fallback price (Jupiter unreachable)"}
                      />
                      <span
                        className="text-[9px] font-mono tabular-nums"
                        style={{ color: a.color }}
                      >
                        ${cardLivePrice >= 1
                          ? cardLivePrice.toFixed(2)
                          : cardLivePrice >= 0.01
                            ? cardLivePrice.toFixed(2)
                            : cardLivePrice.toFixed(6)}
                      </span>
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
          {/* SWEEP perks popover — appears when user taps the
              "+ PERKS" badge above. Same content as the advanced-mode
              benefits panel, just delivered as a tooltip. */}
          <AnimatePresence>
            {perksOpen && asset.id === "sweep" && asset.benefits && (
              <motion.div
                ref={perksRef}
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                transition={{ duration: 0.22 }}
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  left: "50%",
                  x: "-50%",
                  width: "calc(100% - 8px)",
                  zIndex: 40,
                  background: "#161A26",
                  border: "1px solid rgba(255,79,216,0.45)",
                  boxShadow: "0 12px 32px rgba(0,0,0,0.75), 0 0 24px rgba(255,79,216,0.18)",
                }}
                className="rounded-md p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={14} className="text-magenta" />
                  <span className="text-[11px] uppercase tracking-[0.16em] font-bold text-magenta">
                    SWEEP holder benefits
                  </span>
                </div>
                <ul className="flex flex-col gap-2">
                  {asset.benefits.map((b, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="text-magenta text-[14px] leading-none mt-0.5">{b.icon}</span>
                      <div className="flex-1">
                        <div className="text-[12px] font-display font-semibold text-text-primary leading-tight">
                          {b.title}
                        </div>
                        <div className="text-[11px] text-text-secondary mt-0.5 leading-snug">
                          {b.text}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* SWEEP holder benefits — advanced mode only.
            Animation: simple opacity+y fade, no height-auto (avoids the
            mid-animation clipping bug when user toggles between cards). */}
        <AnimatePresence mode="wait">
          {!simpleMode && asset.id === "sweep" && asset.benefits && (
            <motion.div
              key="sweep-benefits"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28, ease }}
              className="mt-3"
            >
              <div
                className="rounded-md p-4"
                style={{
                  background: "linear-gradient(135deg, rgba(255,79,216,0.12), rgba(91,140,255,0.06))",
                  border: "1px solid rgba(255,79,216,0.30)",
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={14} className="text-magenta" />
                  <span className="text-[11px] uppercase tracking-[0.16em] font-bold text-magenta">
                    SWEEP holder benefits
                  </span>
                </div>
                <ul className="flex flex-col gap-2">
                  {asset.benefits.map((b, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.06 }}
                      className="flex items-start gap-2.5"
                    >
                      <span className="text-magenta text-[14px] leading-none mt-0.5">{b.icon}</span>
                      <div className="flex-1">
                        <div className="text-[12px] font-display font-semibold text-text-primary leading-tight">
                          {b.title}
                        </div>
                        <div className="text-[11px] text-text-secondary mt-0.5 leading-snug">
                          {b.text}
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Single card — token list always; math detail varies by mode.
            Simple mode adds the compact 3-line summary at the bottom.
            Advanced mode adds the full DUST SWAP + RENT RECLAIM itemization. */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.75, ease }}
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

            {/* SIMPLE-MODE SUMMARY — compact 3-line outcome */}
            {simpleMode && (
              <>
                <div className="h-px w-full bg-white/10 my-3" />
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-text-secondary">You'll receive</span>
                    <span className="font-mono text-[14px] font-bold tabular-nums" style={{ color: asset.color }}>
                      {outputIsSol
                        ? `~${formatTokenAmount(totalSolReceived, asset, livePrices)} SOL`
                        : `~${formatTokenAmount(swapOutputAsset, asset, livePrices)} ${asset.symbol}`}
                    </span>
                  </div>
                  {!outputIsSol && (
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-text-secondary flex items-center gap-1.5">
                        + reclaimed rent
                        <span className="text-[9px] uppercase tracking-wider text-gold font-bold">free SOL</span>
                      </span>
                      <span className="font-mono text-[13px] font-bold text-gold tabular-nums">
                        +{rentReclaimSol.toFixed(4)} SOL
                      </span>
                    </div>
                  )}
                  <div className="h-px w-full bg-white/10" />
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-text-primary font-semibold">Total value</span>
                    <span className="font-mono text-[16px] font-bold text-gradient-found tabular-nums">
                      ~${totalUnlockedUsd.toFixed(2)}
                    </span>
                  </div>
                  <button
                    onClick={toggleMode}
                    className="mt-1 mx-auto flex items-center gap-1 text-[11px] text-text-muted hover:text-text-secondary"
                  >
                    <span>show details</span>
                    <ChevronDown size={12} />
                  </button>
                </div>
              </>
            )}

            {/* ADVANCED-MODE FULL BREAKDOWN — only visible when simpleMode is off */}
            {!simpleMode && (<>
            {/* SWAP MATH — output asset side */}
            <div className="h-px w-full bg-white/10 my-3" />
            <div className="flex items-center gap-1.5 mb-1">
              <MicroLabel>Dust swap</MicroLabel>
              <span
                className="text-[9px] font-mono uppercase tracking-wider font-bold ml-auto opacity-80"
                style={{ color: asset.color }}
              >
                → {asset.symbol}
              </span>
            </div>
            <div className="flex items-center justify-between py-0.5">
              <span className="text-[12px] text-text-secondary">Gross dust value</span>
              <span className="font-mono text-[12px] text-text-secondary tabular-nums">
                ${totals.total.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between py-0.5">
              <span className="text-[12px] text-text-secondary flex items-center gap-1.5">
                Platform fee
                <span
                  className="text-[9px] font-mono tabular-nums uppercase tracking-wider font-bold"
                  style={{ color: asset.color }}
                >
                  {(asset.feeBps / 100).toFixed(0)}%
                </span>
              </span>
              <span className="font-mono text-[12px] text-warn tabular-nums">
                −${platformFeeUsd.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between py-0.5">
              <span className="text-[12px] text-text-secondary">Network + priority fee</span>
              <span className="font-mono text-[12px] text-text-muted tabular-nums">
                ~${networkFeeUsd.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between py-0.5 mt-0.5">
              <span className="text-[12px] text-text-primary font-semibold">Swap output</span>
              <span className="font-mono text-[13px] font-bold tabular-nums text-right" style={{ color: asset.color }}>
                ~{formatTokenAmount(swapOutputAsset, asset, livePrices)}{" "}
                <span className="text-[10px] uppercase tracking-wider opacity-80">{asset.symbol}</span>
                <span className="block text-[10px] font-mono opacity-70 leading-none mt-0.5">
                  ≈ ${swapOutputUsd.toFixed(2)}
                </span>
              </span>
            </div>

            {/* RENT RECLAIM — separate accounting, ALWAYS native SOL */}
            <div className="h-px w-full bg-white/10 my-3" />
            <div className="flex items-center gap-1.5 mb-1">
              <MicroLabel color="gold">Rent reclaim</MicroLabel>
              <span className="text-[9px] font-mono uppercase tracking-wider font-bold text-gold opacity-80 ml-auto">
                → SOL
              </span>
            </div>
            <div className="flex items-center justify-between py-0.5">
              <span className="text-[12px] text-text-secondary">
                Closing {totals.tokenCount} ATA{totals.tokenCount === 1 ? "" : "s"}
              </span>
              <span className="font-mono text-[12px] text-gold tabular-nums">
                +{rentReclaimSol.toFixed(4)} SOL
              </span>
            </div>
            <div className="flex items-center justify-between py-0.5">
              <span className="text-[11px] text-text-muted leading-snug max-w-[200px]">
                User-owned SOL previously locked for rent. Returned to your wallet.
              </span>
              <span className="font-mono text-[11px] text-text-muted tabular-nums">
                ≈ +${rentReclaimUsd.toFixed(2)}
              </span>
            </div>

            {/* TOTAL — clearly labeled as USD aggregate of two assets */}
            <div className="h-px w-full bg-white/10 my-2" />
            {outputIsSol ? (
              <div className="flex items-center justify-between py-1">
                <span className="text-[13px] text-text-primary font-semibold">
                  You receive (est.)
                </span>
                <span className="font-mono text-[14px] font-bold tabular-nums text-right" style={{ color: asset.color }}>
                  ~{formatTokenAmount(totalSolReceived, asset, livePrices)} SOL
                  <span className="block text-[10px] font-mono opacity-70 leading-none mt-0.5">
                    ≈ ${totalUnlockedUsd.toFixed(2)}
                  </span>
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between py-1">
                <span className="text-[13px] text-text-primary font-semibold">
                  Total value unlocked
                </span>
                <span className="font-mono text-[14px] font-bold text-sweep tabular-nums">
                  ~${totalUnlockedUsd.toFixed(2)}
                </span>
              </div>
            )}
            {!FEE_AUTHORITY && (
              <div className="mt-2 text-[10px] text-text-muted leading-snug">
                Fee account not configured — set <span className="font-mono">VITE_FEE_AUTHORITY</span> to actually collect the platform fee. Display only for now.
              </div>
            )}
            <button
              onClick={toggleMode}
              className="mt-3 mx-auto flex items-center gap-1 text-[11px] text-text-muted hover:text-text-secondary"
            >
              <ChevronUp size={12} />
              <span>show less</span>
            </button>
            </>)}
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
            glow={asset.id === "sweep" ? "magenta" : "mint"}
            icon={asset.id === "sweep" ? <Sparkles size={18} /> : <PenLine size={18} strokeWidth={2.5} />}
            hapticType="medium"
          >
            {asset.id === "sweep"
              ? "Sweep into SWEEP"
              : asset.id === "sol"
              ? "Sweep into SOL"
              : "Clean · 1 signature"}
          </PrimaryButton>
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

