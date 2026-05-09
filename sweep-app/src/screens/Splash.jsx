import { motion } from "framer-motion";
import { ArrowRight, Lock } from "lucide-react";
import Particles from "../components/Particles";
import { PrimaryButton } from "../components/UI";
import { SCREENS } from "../lib/screens";

const ease = [0.16, 1, 0.3, 1];

export default function Splash({ go }) {
  return (
    <div className="relative w-full h-full">
      <Particles mode="ambient" count={70} />

      {/* Center halo */}
      <div
        className="absolute left-1/2 top-[34%] -translate-x-1/2 -translate-y-1/2 w-[360px] h-[360px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(124,255,178,0.18) 0%, rgba(124,255,178,0) 60%)",
          filter: "blur(20px)",
        }}
      />

      <div className="relative z-10 h-full flex flex-col items-center pt-[18%] px-5 pb-10">
        {/* Logo hex */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, ease, delay: 0.1 }}
          className="relative"
        >
          <div
            className="w-[112px] h-[124px] flex items-center justify-center"
            style={{
              clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
              background: "linear-gradient(135deg, rgba(124,255,178,0.25), rgba(91,140,255,0.1))",
            }}
          >
            <div
              className="w-[104px] h-[116px] flex items-center justify-center bg-surface"
              style={{
                clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
              }}
            >
              <BroomGlyph />
            </div>
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease, delay: 0.35 }}
          className="mt-7 font-display text-[40px] font-bold tracking-[0.32em] text-text-primary"
        >
          SWEEP
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease, delay: 0.5 }}
          className="mt-4 text-[17px] leading-6 text-text-secondary text-center max-w-[260px]"
        >
          Find the hidden money<br />in your wallet.
        </motion.p>

        <div className="flex-1" />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease, delay: 0.7 }}
          className="w-full flex flex-col items-center gap-4"
        >
          <PrimaryButton onClick={() => go(SCREENS.CONNECT)} icon={<ArrowRight size={20} strokeWidth={2.5} />}>
            Scan Wallet
          </PrimaryButton>
          <div className="flex items-center gap-2 text-text-muted text-[12px]">
            <Lock size={12} className="text-sweep" />
            <span>No signing. Read-only access.</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function BroomGlyph() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="broom" x1="0" y1="0" x2="48" y2="48">
          <stop stopColor="#7CFFB2" />
          <stop offset="1" stopColor="#5B8CFF" />
        </linearGradient>
      </defs>
      <path d="M30 6L42 18" stroke="url(#broom)" strokeWidth="3" strokeLinecap="round" />
      <path d="M30 16L24 22L26 24L32 18L30 16Z" fill="url(#broom)" />
      <path d="M22 24L8 38L10 42L26 28" stroke="url(#broom)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 38L4 42M10 40L6 44M12 42L8 46" stroke="url(#broom)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="38" cy="10" r="2" fill="#FFD27A" />
      <circle cx="20" cy="10" r="1.5" fill="#7CFFB2" opacity="0.7" />
      <circle cx="44" cy="22" r="1.5" fill="#FF4FD8" opacity="0.6" />
    </svg>
  );
}
