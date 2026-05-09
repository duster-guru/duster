import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { motion } from "framer-motion";
import { ChevronRight, Lock } from "lucide-react";
import { useEffect } from "react";
import Particles from "../components/Particles";
import { haptic } from "../lib/haptics";

const ease = [0.16, 1, 0.3, 1];

/**
 * Real Solana wallet connect. We use the Wallet Adapter modal so we get
 * Phantom/Solflare/Backpack/Glow/etc. discovery for free, and no manual
 * wallet selection logic needs to live here.
 */
export default function Connect({ go }) {
  const { setVisible } = useWalletModal();
  const { connecting, connected, wallets } = useWallet();

  // Once connected, App.jsx will auto-advance to Scan via its connection effect.
  useEffect(() => {
    if (connected) haptic.success?.();
  }, [connected]);

  const installedWallets = wallets.filter(
    (w) => w.readyState === "Installed" || w.readyState === "Loadable"
  );

  const open = () => {
    haptic.medium?.();
    setVisible(true);
  };

  return (
    <div className="relative w-full h-full">
      <Particles mode="ambient" count={50} className="opacity-50" />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ duration: 0.24 }}
        className="absolute inset-0 bg-black"
      />

      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ duration: 0.42, ease }}
        className="absolute bottom-0 left-0 right-0 rounded-t-lg glass-strong"
        style={{ boxShadow: "0 -16px 48px rgba(0,0,0,0.6)" }}
      >
        <div className="px-5 pt-3 pb-8">
          <div className="mx-auto mb-5 h-[5px] w-10 rounded-full bg-white/30" />

          <h2 className="font-display text-[26px] font-semibold text-text-primary leading-tight">
            Connect to scan
          </h2>
          <p className="mt-1.5 text-[15px] text-text-secondary">
            Solana-native. One signature to clean.
          </p>

          <div className="mt-5 flex flex-col gap-2.5">
            {installedWallets.length === 0 ? (
              <div className="rounded-md glass px-4 py-5 text-center">
                <p className="text-[14px] text-text-primary font-display font-semibold">
                  No Solana wallet detected
                </p>
                <p className="text-[12px] text-text-secondary mt-1.5 leading-snug">
                  Install <a className="text-sweep underline" href="https://phantom.com/" target="_blank" rel="noreferrer">Phantom</a>,{" "}
                  <a className="text-sweep underline" href="https://solflare.com/" target="_blank" rel="noreferrer">Solflare</a>, or{" "}
                  <a className="text-sweep underline" href="https://backpack.app/" target="_blank" rel="noreferrer">Backpack</a> and reload.
                </p>
                <button
                  onClick={open}
                  className="mt-4 px-4 py-2 rounded-full bg-sweep text-void font-display font-bold text-[13px]"
                >
                  Open wallet picker anyway
                </button>
              </div>
            ) : (
              installedWallets.map((w, i) => (
                <motion.button
                  key={w.adapter.name}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.32, ease, delay: 0.12 + i * 0.06 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={open}
                  disabled={connecting}
                  className="relative w-full h-16 rounded-md glass flex items-center px-4 gap-3 text-left disabled:opacity-50"
                >
                  <img
                    src={w.adapter.icon}
                    alt=""
                    className="w-8 h-8 rounded"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                  <span className="flex-1 font-display font-semibold text-[16px] text-text-primary">
                    {w.adapter.name}
                  </span>
                  {connecting ? (
                    <span className="w-5 h-5 rounded-full border-2 border-sweep border-t-transparent animate-spin" />
                  ) : (
                    <ChevronRight size={18} className="text-text-muted" />
                  )}
                </motion.button>
              ))
            )}
          </div>

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
              <span className="text-text-primary font-semibold">No approvals. Ever.</span><br />
              Solana skips that step. We just need your signature once at sweep time.
            </p>
          </motion.div>

          <button
            onClick={() => go("splash")}
            className="mt-4 w-full text-center text-text-muted text-[13px] py-2"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}
