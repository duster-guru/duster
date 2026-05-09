import { motion } from "framer-motion";
import { ArrowRight, Flame, Gift, Trophy } from "lucide-react";
import Particles from "../components/Particles";
import CountUp from "../components/CountUp";
import { Card, GlassCard, MicroLabel, PrimaryButton } from "../components/UI";
import { USER_STATS, WALLET_SHORT } from "../lib/data";
import { SCREENS } from "../lib/screens";

const ease = [0.16, 1, 0.3, 1];

// Tiny inline sparkline of cleaned value over time (mock series).
const SERIES = [12, 18, 16, 32, 28, 45, 47];
function Sparkline() {
  const max = Math.max(...SERIES);
  const w = 280;
  const h = 56;
  const step = w / (SERIES.length - 1);
  const points = SERIES.map((v, i) => `${i * step},${h - (v / max) * h * 0.85 - 4}`).join(" ");
  const area = `0,${h} ${points} ${w},${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7CFFB2" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#7CFFB2" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#sparkArea)" />
      <polyline points={points} fill="none" stroke="#7CFFB2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {SERIES.map((v, i) => (
        <circle key={i} cx={i * step} cy={h - (v / max) * h * 0.85 - 4} r={i === SERIES.length - 1 ? 3 : 1.5} fill="#7CFFB2" />
      ))}
    </svg>
  );
}

export default function Dashboard({ go, setSweepMode }) {
  return (
    <div className="relative w-full h-full">
      <Particles mode="ambient" count={40} className="opacity-40" />

      <div className="relative z-10 h-full flex flex-col px-5 pt-16 pb-6 overflow-y-auto no-scrollbar">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease }}
        >
          <div className="text-[15px] text-text-secondary">Hey, sweeper</div>
          <div className="font-mono text-[12px] text-text-muted tracking-wider mt-1">
            {WALLET_SHORT}
          </div>
        </motion.div>

        {/* Hero stat */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease }}
          className="mt-4"
        >
          <GlassCard padding="p-5">
            <MicroLabel>Total cleaned</MicroLabel>
            <div className="mt-1 font-display font-bold text-[42px] text-gradient-found leading-none tabular-nums">
              <CountUp to={USER_STATS.totalCleaned} duration={900} prefix="$" decimals={2} />
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-text-muted">
              <span
                className="w-3 h-3 rounded-full flex items-center justify-center text-[7px] text-void font-bold"
                style={{ background: "radial-gradient(circle, #FFD27A, #B58B3A)" }}
              >◎</span>
              <span>+<span className="font-mono text-gold font-semibold">${USER_STATS.rentReclaimed.toFixed(2)}</span> SOL rent reclaimed</span>
            </div>
            <div className="mt-3 -mx-2">
              <Sparkline />
            </div>
            <div className="mt-2 flex items-center justify-between text-[12px] text-text-muted">
              <span className="font-mono tabular-nums">{USER_STATS.sweeps} sweeps · {USER_STATS.signatures} signatures</span>
              <span className="font-mono tabular-nums">{USER_STATS.tokens} tokens cleaned</span>
            </div>
          </GlassCard>
        </motion.div>

        {/* Stat grid */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease }}
          className="mt-3 grid grid-cols-2 gap-3"
        >
          <Card className="p-4">
            <div className="flex items-center gap-1.5">
              <Flame size={12} className="text-warn" />
              <MicroLabel>Streak</MicroLabel>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="font-display font-bold text-[28px] text-text-primary tabular-nums">{USER_STATS.streak}</span>
              <span className="text-[12px] text-text-secondary">days</span>
            </div>
            <div className="text-[11px] text-text-muted mt-0.5">Don't break it</div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-1.5">
              <Trophy size={12} className="text-gold" />
              <MicroLabel>Rank</MicroLabel>
            </div>
            <div className="mt-2 font-display font-bold text-[28px] text-text-primary tabular-nums">
              #{USER_STATS.rank.toLocaleString()}
            </div>
            <div className="text-[11px] text-sweep mt-0.5 font-semibold">top {USER_STATS.topPercent}%</div>
          </Card>
        </motion.div>

        {/* Leaderboard teaser */}
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease }}
          className="mt-3 w-full flex items-center gap-3 p-4 rounded-md text-left bg-surface"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <span className="w-9 h-9 rounded-full bg-gold/15 flex items-center justify-center">
            <Trophy size={16} className="text-gold" />
          </span>
          <div className="flex-1">
            <div className="font-display font-semibold text-[14px] text-text-primary">Leaderboard</div>
            <div className="text-[12px] text-text-muted">This week's biggest sweep: $4,328</div>
          </div>
          <ArrowRight size={16} className="text-text-muted" />
        </motion.button>

        {/* Referral */}
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.36, ease }}
          className="mt-2.5 w-full flex items-center gap-3 p-4 rounded-md text-left"
          style={{
            background: "linear-gradient(135deg, rgba(124,255,178,0.1), rgba(91,140,255,0.06))",
            border: "1px solid rgba(124,255,178,0.25)",
          }}
        >
          <span className="w-9 h-9 rounded-full bg-sweep/15 flex items-center justify-center">
            <Gift size={16} className="text-sweep" />
          </span>
          <div className="flex-1">
            <div className="font-display font-semibold text-[14px] text-text-primary">Refer & earn</div>
            <div className="text-[12px] text-text-secondary">
              <span className="font-mono">{USER_STATS.referrals}</span> invited · <span className="font-mono">${USER_STATS.earned.toFixed(2)}</span> earned
            </div>
          </div>
          <ArrowRight size={16} className="text-sweep" />
        </motion.button>

        <div className="flex-1 min-h-3" />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45, ease }}
        >
          <PrimaryButton
            icon={<ArrowRight size={20} strokeWidth={2.5} />}
            hapticType="medium"
            onClick={() => { setSweepMode(false); go(SCREENS.SCAN); }}
          >
            Clean Again
          </PrimaryButton>
        </motion.div>
      </div>
    </div>
  );
}
