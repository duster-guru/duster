import { motion } from "framer-motion";
import { ChevronRight, Lock } from "lucide-react";
import { useState } from "react";
import Particles from "../components/Particles";
import { WALLETS } from "../lib/data";
import { SCREENS } from "../lib/screens";
import { haptic } from "../lib/haptics";

const ease = [0.16, 1, 0.3, 1];

export default function Connect({ go }) {
  const [connecting, setConnecting] = useState(null);

  const onPick = (id) => {
    haptic.medium?.();
    setConnecting(id);
    // simulate connection lag, then advance
    setTimeout(() => go(SCREENS.SCAN), 700);
  };

  return (
    <div className="relative w-full h-full">
      <Particles mode="ambient" count={50} className="opacity-50" />
      {/* Backdrop dim */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ duration: 0.24 }}
        className="absolute inset-0 bg-black"
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ duration: 0.42, ease }}
        className="absolute bottom-0 left-0 right-0 rounded-t-lg glass-strong"
        style={{ boxShadow: "0 -16px 48px rgba(0,0,0,0.6)" }}
      >
        <div className="px-5 pt-3 pb-8">
          {/* Drag handle */}
          <div className="mx-auto mb-5 h-[5px] w-10 rounded-full bg-white/30" />

          <h2 className="font-display text-[26px] font-semibold text-text-primary leading-tight">
            Connect to scan
          </h2>
          <p className="mt-1.5 text-[15px] text-text-secondary">
            We never move your funds.
          </p>

          <div className="mt-5 flex flex-col gap-2.5">
            {WALLETS.map((w, i) => (
              <motion.button
                key={w.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.32, ease, delay: 0.12 + i * 0.06 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onPick(w.id)}
                disabled={connecting !== null}
                className="relative w-full h-16 rounded-md glass flex items-center px-4 gap-3 text-left disabled:opacity-50"
              >
                <span className="text-[26px]">{w.emoji}</span>
                <span className="flex-1 font-display font-semibold text-[16px] text-text-primary">
                  {w.name}
                </span>
                {connecting === w.id ? (
                  <span className="w-5 h-5 rounded-full border-2 border-sweep border-t-transparent animate-spin" />
                ) : (
                  <ChevronRight size={18} className="text-text-muted" />
                )}
              </motion.button>
            ))}
          </div>

          {/* Trust strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="mt-5 flex items-center gap-2.5 px-1"
          >
            <span className="w-9 h-9 rounded-full bg-sweep/10 flex items-center justify-center">
              <Lock size={16} className="text-sweep" />
            </span>
            <p className="text-[13px] text-text-secondary leading-snug">
              <span className="text-text-primary font-semibold">Read-only access.</span><br />
              We see balances. Not keys.
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
