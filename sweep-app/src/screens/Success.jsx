import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { ArrowRight, ExternalLink, PenLine, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import Particles from "../components/Particles";
import { HeroGlassCard, MicroLabel, PrimaryButton } from "../components/UI";
import { ALL_GROUP_IDS, summarizeGroups } from "../lib/solana/groups";
import { formatTokenAmount, getEffectivePrice, getOutputAsset } from "../lib/solana/outputs";
import { RENT_PER_ACCOUNT_SOL } from "../lib/config";
import { addRecord } from "../lib/history";
import { SCREENS } from "../lib/screens";
import { haptic } from "../lib/haptics";

const ease = [0.16, 1, 0.3, 1];

export default function Success({ go, scan, exec, filteredDust, outputAsset }) {
  const { publicKey } = useWallet();
  const asset = getOutputAsset(outputAsset);
  const outputIsSol = asset.id === "sol";
  const livePrices = scan.outputPrices;
  const livePriceSol = getEffectivePrice(getOutputAsset("sol"), livePrices);
  const livePriceAsset = getEffectivePrice(asset, livePrices);

  // Real on-chain delta on the destination mint.
  const before = exec.destBefore ?? 0;
  const after = exec.destAfter ?? before;
  const destDelta = +(after - before).toFixed(6);

  // Rent reclaim is independent of the swap. Value comes from closing
  // emptied SPL token ATAs — user-owned SOL, not protocol revenue.
  // Count only the tokens that actually swept on-chain. Anything Jupiter
  // refused stayed in the wallet, its ATA was NOT closed, and pretending
  // otherwise would be lying to the user (we used to count every selected
  // dust token here regardless of skipped status).
  const tokenCount = filteredDust.length;
  const skippedCount = exec.skipped?.length ?? 0;
  const closedAtaCount = Math.max(0, tokenCount - skippedCount);
  const rentReclaimSol = +(closedAtaCount * RENT_PER_ACCOUNT_SOL).toFixed(6);
  const rentReclaimUsd = +(rentReclaimSol * livePriceSol).toFixed(2);

  // Swap output isolated (subtracting rent only when output IS SOL).
  const swapOutputAsset = outputIsSol
    ? +(destDelta - rentReclaimSol).toFixed(6)
    : destDelta;
  const swapOutputUsd = outputIsSol
    ? +(swapOutputAsset * livePriceSol).toFixed(2)
    : +(swapOutputAsset * livePriceAsset).toFixed(2);
  const totalUnlockedUsd = +(swapOutputUsd + rentReclaimUsd).toFixed(2);

  // Group breakdown from the dust we actually swept.
  const groupSummaries = useMemo(
    () => summarizeGroups(filteredDust, ALL_GROUP_IDS),
    [filteredDust]
  );

  const groupCount = groupSummaries.length;
  const dustTotal = +filteredDust.reduce((s, t) => s + (t.valueUsd || 0), 0).toFixed(2);

  useEffect(() => {
    haptic.success?.();
    const colors = ["#7CFFB2", "#FFD27A", "#5B8CFF"];
    const fire = (origin, n) =>
      confetti({
        particleCount: n, spread: 80, startVelocity: 45, origin, colors,
        gravity: 0.8, ticks: 200, scalar: 0.9,
      });
    fire({ x: 0.5, y: 0.4 }, 80);
    setTimeout(() => fire({ x: 0.3, y: 0.5 }, 40), 200);
    setTimeout(() => fire({ x: 0.7, y: 0.5 }, 40), 350);
  }, []);

  // Persist this sweep into the per-wallet local history exactly once.
  // The addRecord() helper de-dupes on the primary tx signature, so even
  // if this effect fires twice (StrictMode) we won't double-write — but
  // we also gate it with a ref so we don't recompute the record body on
  // every render.
  const persisted = useRef(false);
  useEffect(() => {
    if (persisted.current) return;
    if (!publicKey) return;
    if (!exec.signatures?.length) return;
    persisted.current = true;
    addRecord(publicKey.toBase58(), {
      outputAsset: asset.id,
      // For USDC/SWEEP this is just the swap output; for SOL it also
      // includes rent reclaim because both arrive in native SOL.
      outputAmount: destDelta,
      outputUsd: swapOutputUsd,
      rentSol: rentReclaimSol,
      rentUsd: rentReclaimUsd,
      totalUnlockedUsd,
      tokenCount: closedAtaCount,
      skippedCount,
      txSigs: exec.signatures,
      dust: filteredDust.map((t) => ({
        symbol: t.symbol,
        valueUsd: t.valueUsd,
        logoURI: t.logoURI || null,
      })),
    });
  }, [
    publicKey,
    exec.signatures,
    asset.id,
    destDelta,
    swapOutputUsd,
    rentReclaimSol,
    rentReclaimUsd,
    totalUnlockedUsd,
    closedAtaCount,
    skippedCount,
    filteredDust,
  ]);

  const gridCols = groupCount === 1 ? "grid-cols-1" : "grid-cols-2";

  // Per-group share of the SWAP OUTPUT only (USD), proportional to dust
  // value swept. Rent reclaim is shown separately, never split per group.
  const groupShares = groupSummaries.map((g) => {
    const share = dustTotal > 0 ? (g.total / dustTotal) * swapOutputUsd : 0;
    return { ...g, finalAmount: +share.toFixed(2) };
  });

  const txCount = exec.signatures?.length || 0;
  const firstSig = exec.signatures?.[0];

  return (
    <div className="relative w-full h-full overflow-hidden">
      <Particles mode="ambient" count={50} color="#7CFFB2" />

      <div
        className="absolute left-1/2 top-[16%] -translate-x-1/2 w-[260px] h-[260px] pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(124,255,178,0.3) 0%, transparent 60%)",
          filter: "blur(20px)",
        }}
      />

      <div className="relative z-10 h-full flex flex-col px-5 pt-10 pb-6 overflow-y-auto no-scrollbar">
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
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full glass">
            <PenLine size={11} className="text-sweep" />
            <span className="text-[11px] text-text-secondary">
              <span className="font-mono tabular-nums text-text-primary font-semibold">{tokenCount}</span> tokens · {txCount} signed {txCount === 1 ? "tx" : "txs"}
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25, ease }}
          className="mt-5"
        >
          <HeroGlassCard>
            {/* HEADLINE — total value unlocked in USD, not asset-specific */}
            <div className="text-center mb-3">
              <MicroLabel color="mint">Total value unlocked</MicroLabel>
              <div className="font-display font-bold text-[40px] text-gradient-found tabular-nums leading-none mt-1">
                ~${totalUnlockedUsd.toFixed(2)}
              </div>
            </div>

            {/* DUST SWAP — output asset only, NEVER conflated with rent */}
            <div
              className="rounded-md p-3 mb-2"
              style={{
                background: `${asset.accent},0.08)`,
                border: `1px solid ${asset.accent},0.30)`,
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] uppercase tracking-[0.16em] font-semibold opacity-90" style={{ color: asset.color }}>
                  Dust swapped → {asset.symbol}
                </span>
                <span className="font-mono text-[10px] text-text-muted tabular-nums">
                  {before.toFixed(outputIsSol ? 4 : 2)} → {after.toFixed(outputIsSol ? 4 : 2)}
                </span>
              </div>
              <div className="flex items-baseline justify-center gap-1.5">
                <span className="font-display font-bold text-[28px] tabular-nums" style={{ color: asset.color }}>
                  +{formatTokenAmount(swapOutputAsset, asset, livePrices)}
                </span>
                <span className="text-[12px] opacity-80" style={{ color: asset.color }}>
                  {asset.symbol}
                </span>
              </div>
              <div className="text-center text-[11px] font-mono text-text-muted mt-0.5">
                ≈ ${swapOutputUsd.toFixed(2)}
              </div>
            </div>

            {/* RENT RECLAIM — separate, native SOL, never merged for non-SOL output */}
            <div
              className="rounded-md p-3 mb-3"
              style={{
                background: "rgba(255,210,122,0.08)",
                border: "1px solid rgba(255,210,122,0.30)",
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] uppercase tracking-[0.16em] font-semibold text-gold opacity-90">
                  Rent reclaimed → SOL
                </span>
                <span className="font-mono text-[10px] text-text-muted tabular-nums">
                  {closedAtaCount} ATA{closedAtaCount === 1 ? "" : "s"} closed
                </span>
              </div>
              <div className="flex items-baseline justify-center gap-1.5">
                <span className="font-display font-bold text-[22px] text-gold tabular-nums">
                  +{rentReclaimSol.toFixed(4)}
                </span>
                <span className="text-[11px] text-gold opacity-80">SOL</span>
                <span className="text-[10px] text-text-muted ml-1">
                  ≈ ${rentReclaimUsd.toFixed(2)}
                </span>
              </div>
              <div className="text-[10px] text-text-muted text-center mt-1.5 leading-snug">
                User-owned SOL previously locked for rent exemption.<br/>
                Returned directly to your wallet — not protocol revenue.
              </div>
            </div>

            <div className="flex items-center justify-between mb-3">
              <MicroLabel color="mint">Per program</MicroLabel>
              <span className="font-mono text-[12px] text-sweep font-bold tabular-nums">
                {groupCount} program{groupCount === 1 ? "" : "s"}
              </span>
            </div>

            <div className={`grid ${gridCols} gap-2`}>
              {groupShares.map((f, i) => (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, y: 8, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.4 + i * 0.07, ease }}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-md"
                  style={{
                    background: `${f.color}10`,
                    border: `1px solid ${f.color}40`,
                  }}
                >
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full" style={{ width: 48, height: 48, border: `1.5px solid ${f.color}` }} />
                    <motion.div
                      className="w-[48px] h-[48px] rounded-full flex items-center justify-center font-display font-bold text-[9px] text-void"
                      style={{
                        background: `radial-gradient(circle at 30% 30%, ${asset.color}, ${asset.color}aa)`,
                        boxShadow: `0 0 16px ${asset.accent},0.6)`,
                      }}
                      animate={{ scale: [1, 1.04, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
                    >
                      {asset.symbol.replace("$", "")}
                    </motion.div>
                  </div>
                  <div className="text-[9px] font-display font-bold uppercase tracking-wider" style={{ color: f.color }}>
                    {f.short}
                  </div>
                  <div className="text-[12px] font-mono font-bold text-text-primary tabular-nums leading-none">
                    ${f.finalAmount.toFixed(2)}
                  </div>
                </motion.div>
              ))}
            </div>

            {firstSig && (
              <a
                href={`https://solscan.io/tx/${firstSig}`}
                target="_blank"
                rel="noreferrer"
                className="mt-4 flex items-center justify-center gap-1.5 text-[12px] text-sweep font-mono"
              >
                <span className="truncate max-w-[180px]">{firstSig.slice(0, 8)}…{firstSig.slice(-8)}</span>
                <ExternalLink size={12} />
              </a>
            )}

            {exec.skipped && exec.skipped.length > 0 && (
              <div className="mt-3 px-3 py-2 rounded-sm" style={{ background: "rgba(255,178,87,0.08)", border: "1px solid rgba(255,178,87,0.25)" }}>
                <div className="text-[11px] text-warn font-display font-semibold uppercase tracking-wider">
                  {exec.skipped.length} skipped
                </div>
                <div className="text-[11px] text-text-muted mt-0.5">
                  No Jupiter route or quote failed. These tokens were left in your wallet.
                </div>
              </div>
            )}
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
            Share Your Clean
          </PrimaryButton>

          <button
            onClick={() => { haptic.light?.(); scan.refresh(); go(SCREENS.RESULTS); }}
            className="text-center text-[13px] text-sweep font-semibold py-2"
          >
            Scan again →
          </button>

          <button
            onClick={() => { haptic.light?.(); go(SCREENS.DASHBOARD); }}
            className="text-center text-[13px] text-text-secondary font-semibold py-2"
          >
            View history →
          </button>
        </motion.div>
      </div>
    </div>
  );
}
