import { useWallet } from "@solana/wallet-adapter-react";
import { motion } from "framer-motion";
import { Check, Copy, Download } from "lucide-react";
import { useMemo, useState } from "react";
import HomeNav from "../components/HomeNav";
import { BackButton, GlassButton, MicroLabel } from "../components/UI";
import { ALL_GROUP_IDS, GROUPS, summarizeGroups } from "../lib/solana/groups";
import { getOutputAsset } from "../lib/solana/outputs";
import { RENT_PER_ACCOUNT_SOL, SOL_USD_REF } from "../lib/config";
import { SCREENS } from "../lib/screens";
import { haptic } from "../lib/haptics";

const ease = [0.16, 1, 0.3, 1];

const STYLES = [
  { id: "classic", name: "Classic", bg: "linear-gradient(160deg, #0E1119 0%, #06070D 100%)", accent: "#7CFFB2" },
  { id: "neon",    name: "Neon",    bg: "linear-gradient(160deg, #0a0f1f 0%, #001a2c 100%)", accent: "#5B8CFF" },
  { id: "gold",    name: "Gold",    bg: "linear-gradient(160deg, #1a1108 0%, #08060d 100%)", accent: "#FFD27A" },
  { id: "vapor",   name: "Vapor",   bg: "linear-gradient(160deg, #1a0820 0%, #08060d 100%)", accent: "#FF4FD8" },
];

export default function Share({ go, scan, exec, filteredDust, outputAsset }) {
  const { publicKey } = useWallet();
  const [styleIdx, setStyleIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const style = STYLES[styleIdx];
  const asset = getOutputAsset(outputAsset);
  const outputIsSol = asset.id === "sol";

  // Two accounting buckets — kept separate per architecture rules.
  const before = exec.destBefore ?? scan.usdcBefore ?? 0;
  const after = exec.destAfter ?? before;
  const destDelta = +(after - before).toFixed(6);

  const tokenCount = filteredDust.length;
  const rentReclaimSol = +(tokenCount * RENT_PER_ACCOUNT_SOL).toFixed(6);
  const rentReclaimUsd = +(rentReclaimSol * SOL_USD_REF).toFixed(2);

  const swapOutputAsset = outputIsSol ? +(destDelta - rentReclaimSol).toFixed(6) : destDelta;
  const swapOutputUsd = outputIsSol
    ? +(swapOutputAsset * SOL_USD_REF).toFixed(2)
    : swapOutputAsset;
  const totalUnlockedUsd = +(swapOutputUsd + rentReclaimUsd).toFixed(2);
  // Suppress unused for now; share variants might surface them later.
  void scan;
  const groupSummaries = useMemo(
    () => summarizeGroups(filteredDust, ALL_GROUP_IDS),
    [filteredDust]
  );
  const presentGroupIds = groupSummaries.map((g) => g.id);

  const walletShort = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}…${publicKey.toBase58().slice(-4)}`
    : "";

  const onCopy = async () => {
    haptic.medium?.();
    try {
      await navigator.clipboard.writeText("https://sweep.app/r/4F7K");
    } catch {
      // clipboard unavailable; fail silently
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const onPostX = () => {
    haptic.medium?.();
    const text = encodeURIComponent(
      `Just unlocked ~$${totalUnlockedUsd.toFixed(2)} hidden in my Solana wallet — ${outputIsSol ? `${(swapOutputAsset + rentReclaimSol).toFixed(4)} SOL` : `${asset.symbol} + ${rentReclaimSol.toFixed(4)} SOL rent`}. one signature, no approvals. only on solana ✨ try yours: sweep.app/r/4F7K`
    );
    window.open(`https://x.com/intent/post?text=${text}`, "_blank");
  };

  return (
    <div className="relative w-full h-full">
      <BackButton onClick={() => go(SCREENS.SUCCESS)} />
      <HomeNav go={go} />
      <div className="relative z-10 h-full flex flex-col pt-10 pb-6 px-5 overflow-y-auto no-scrollbar">
        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease }}
          className="font-display text-[22px] font-semibold text-text-primary text-center"
        >
          Share your clean
        </motion.h2>

        <motion.div
          key={style.id}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease }}
          className="mt-5 rounded-lg overflow-hidden relative"
          style={{
            aspectRatio: "1080 / 1350",
            background: style.bg,
            border: "1.5px solid rgba(255,255,255,0.1)",
            boxShadow: `0 0 60px ${style.accent}33`,
          }}
        >
          <div
            className="absolute inset-0 opacity-60"
            style={{
              backgroundImage: `radial-gradient(${style.accent}55 1px, transparent 1px), radial-gradient(${style.accent}33 1px, transparent 1px)`,
              backgroundSize: "32px 32px, 64px 64px",
              backgroundPosition: "0 0, 16px 16px",
            }}
          />
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] pointer-events-none"
            style={{
              background: `radial-gradient(circle, ${style.accent}40 0%, transparent 60%)`,
              filter: "blur(20px)",
            }}
          />

          <div className="relative h-full flex flex-col p-6 z-10">
            <div className="flex items-center justify-between">
              <span className="font-display text-[14px] font-bold tracking-[0.32em]" style={{ color: style.accent }}>
                DUSTER
              </span>
              <span className="font-mono text-[10px] text-white/40">{walletShort}</span>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center text-center -mt-2">
              <div className="text-[14px] tracking-wider uppercase text-white/60 font-semibold">
                I just found
              </div>
              <div
                className="font-bold tabular-nums my-3"
                style={{
                  fontSize: "70px",
                  lineHeight: 1,
                  color: style.accent,
                  textShadow: `0 0 40px ${style.accent}66`,
                  letterSpacing: "-0.02em",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                ${totalUnlockedUsd.toFixed(2)}
              </div>
              <div className="text-[15px] text-white/80 max-w-[240px]">
                hidden in my Solana wallet.
              </div>
              <div className="text-[10px] text-white/50 uppercase tracking-[0.2em] mt-1.5 font-semibold">
                {outputIsSol
                  ? `${(swapOutputAsset + rentReclaimSol).toFixed(4)} SOL total`
                  : `${asset.symbol} + ${rentReclaimSol.toFixed(4)} SOL rent`}
              </div>

              <div className="my-5 flex items-center gap-2 w-full">
                <div className="flex-1 h-px bg-white/15" />
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-semibold">
                  {tokenCount} tokens · 1 signature
                </div>
                <div className="flex-1 h-px bg-white/15" />
              </div>

              <div className="flex gap-3 justify-center items-center">
                {presentGroupIds.map((id) => {
                  const g = GROUPS[id];
                  return (
                    <div key={id} className="flex flex-col items-center gap-1">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold text-white"
                        style={{
                          background: `linear-gradient(135deg, ${g.color}, ${g.color}99)`,
                          boxShadow: `0 0 8px ${g.color}88`,
                        }}
                      >
                        {g.glyph}
                      </div>
                      <span className="text-[8px] uppercase tracking-wider text-white/60 font-semibold">
                        {g.short}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-1 justify-center flex-wrap mt-4 max-w-[220px]">
                {filteredDust.slice(0, 8).map((t) => (
                  <div
                    key={t.ata}
                    className="w-5 h-5 rounded-full"
                    style={{
                      background: t.logoURI ? `url(${t.logoURI}) center/cover` : `linear-gradient(135deg, ${t.color}, ${t.color}99)`,
                      boxShadow: `0 0 6px ${t.color}66`,
                      border: "1px solid rgba(255,255,255,0.15)",
                    }}
                  />
                ))}
                {filteredDust.length > 8 && (
                  <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[7px] font-mono text-white/70">
                    +{filteredDust.length - 8}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-[0.16em] text-white/40 font-semibold">
                duster.guru
              </span>
              <span className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: style.accent }}>
                Try yours →
              </span>
            </div>
          </div>
        </motion.div>

        <div className="mt-4">
          <MicroLabel className="block mb-2">Card style</MicroLabel>
          <div className="flex gap-2">
            {STYLES.map((s, i) => (
              <button
                key={s.id}
                onClick={() => { haptic.light?.(); setStyleIdx(i); }}
                className="flex-1 h-12 rounded-md flex items-center justify-center text-[12px] font-display font-semibold transition"
                style={{
                  background: s.bg,
                  border: i === styleIdx ? `1.5px solid ${s.accent}` : "1px solid rgba(255,255,255,0.08)",
                  color: i === styleIdx ? s.accent : "#A6ADBE",
                  boxShadow: i === styleIdx ? `0 0 12px ${s.accent}55` : "none",
                }}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button
            onClick={onPostX}
            className="h-14 rounded-full bg-text-primary text-void font-display font-bold text-[15px] flex items-center justify-center gap-2"
          >
            <span className="font-bold text-[18px]">𝕏</span>
            <span>Post</span>
          </button>
          <button
            onClick={onCopy}
            className="h-14 rounded-full glass text-text-primary font-display font-semibold text-[15px] flex items-center justify-center gap-2"
          >
            {copied ? <Check size={16} className="text-sweep" /> : <Copy size={16} />}
            <span>{copied ? "Copied!" : "Copy link"}</span>
          </button>
        </div>

        <div className="mt-2.5">
          <GlassButton onClick={() => { haptic.light?.(); }}>
            <Download size={16} />
            Save Image
          </GlassButton>
        </div>

        <div className="mt-3 flex justify-center">
          <button
            onClick={() => go(SCREENS.DASHBOARD)}
            className="text-text-muted text-[13px] py-2"
          >
            Skip → Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
