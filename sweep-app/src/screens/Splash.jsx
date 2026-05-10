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

      {/* Center halo — matches favicon's purple/blue palette */}
      <div
        className="absolute left-1/2 top-[34%] -translate-x-1/2 -translate-y-1/2 w-[360px] h-[360px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(134,59,255,0.22) 0%, rgba(71,191,255,0.10) 40%, rgba(0,0,0,0) 70%)",
          filter: "blur(20px)",
        }}
      />

      <div className="relative z-10 h-full flex flex-col items-center pt-[18%] px-5 pb-10">
        {/* Logo — favicon inside the hexagon frame */}
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
              background: "linear-gradient(135deg, rgba(134,59,255,0.4), rgba(71,191,255,0.2))",
            }}
          >
            <div
              className="w-[104px] h-[116px] flex items-center justify-center bg-surface"
              style={{
                clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
              }}
            >
              <img
                src="/favicon.svg"
                alt="SWEEP"
                className="w-[56px] h-[56px]"
                style={{ filter: "drop-shadow(0 0 12px rgba(134,59,255,0.55))" }}
              />
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

