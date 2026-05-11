import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { motion } from "framer-motion";
import { ChevronRight, ExternalLink, Lock, Smartphone } from "lucide-react";
import { useEffect, useMemo } from "react";
import Particles from "../components/Particles";
import { haptic } from "../lib/haptics";

const ease = [0.16, 1, 0.3, 1];

/**
 * Detect iOS via UA. Apple's WebKit is a sandboxed browser engine on
 * iOS — installed wallet apps CANNOT inject the Wallet Standard into
 * Safari/Chrome tabs. The only reliable connection paths on iOS are:
 *   (a) open the dapp inside the wallet app's own in-app browser
 *   (b) WalletConnect protocol (extra dep, not yet wired)
 *   (c) deep-link via universal links (the SolflareWalletAdapter tries
 *       this; works for some routes, fails for others depending on
 *       iOS Safe Browsing rules)
 */
function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

export default function Connect({ go }) {
  const { setVisible } = useWalletModal();
  const { connecting, connected, wallets } = useWallet();
  const onIOS = useMemo(() => isIOS(), []);
  const currentUrl = typeof window !== "undefined" ? window.location.href : "";

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

  // Deep links to open this dapp inside the wallet's in-app browser
  // (the most reliable iOS connection path).
  const openInPhantom = () => {
    haptic.medium?.();
    window.location.href = `https://phantom.app/ul/browse/${encodeURIComponent(currentUrl)}?ref=${encodeURIComponent(currentUrl)}`;
  };
  const openInSolflare = () => {
    haptic.medium?.();
    window.location.href = `https://solflare.com/ul/v1/browse/${encodeURIComponent(currentUrl)}?ref=${encodeURIComponent(currentUrl)}`;
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
        className="absolute bottom-0 left-0 right-0 rounded-t-lg glass-strong overflow-y-auto no-scrollbar"
        style={{ boxShadow: "0 -16px 48px rgba(0,0,0,0.6)", maxHeight: "85%" }}
      >
        <div className="px-5 pt-3 pb-8">
          <div className="mx-auto mb-5 h-[5px] w-10 rounded-full bg-white/30" />

          <h2 className="font-display text-[26px] font-semibold text-text-primary leading-tight">
            Connect to scan
          </h2>
          <p className="mt-1.5 text-[15px] text-text-secondary">
            Solana-native. One signature to clean.
          </p>

          {/* iOS-specific banner — Safari/Chrome on iOS can't inject the
              Wallet Standard, so the standard wallet picker often comes
              up empty even when wallets are installed. Surface deep-link
              buttons that open this dapp inside the wallet's in-app
              browser, which always works. */}
          {onIOS && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease, delay: 0.05 }}
              className="mt-4 rounded-md p-3"
              style={{
                background: "rgba(134,59,255,0.10)",
                border: "1px solid rgba(134,59,255,0.30)",
              }}
            >
              <div className="flex items-start gap-2">
                <Smartphone size={16} className="text-purple-400 shrink-0 mt-0.5" style={{ color: "#b18bff" }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-display font-semibold text-text-primary">
                    On iOS? Open inside your wallet
                  </div>
                  <div className="text-[11px] text-text-secondary mt-0.5 leading-snug">
                    iOS Safari + Chrome can't see installed wallet apps. Tap below to open Duster inside your wallet's built-in browser.
                  </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={openInPhantom}
                  className="h-10 rounded-full text-[12px] font-display font-bold flex items-center justify-center gap-1.5"
                  style={{ background: "#ab9ff2", color: "#1a1429" }}
                >
                  <span>Open in Phantom</span>
                  <ExternalLink size={11} />
                </button>
                <button
                  onClick={openInSolflare}
                  className="h-10 rounded-full text-[12px] font-display font-bold flex items-center justify-center gap-1.5"
                  style={{ background: "#fc8332", color: "#1a0d04" }}
                >
                  <span>Open in Solflare</span>
                  <ExternalLink size={11} />
                </button>
              </div>
            </motion.div>
          )}

          <div className="mt-5 flex flex-col gap-2.5">
            {installedWallets.length === 0 ? (
              <div className="rounded-md glass px-4 py-5 text-center">
                <p className="text-[14px] text-text-primary font-display font-semibold">
                  {onIOS ? "No wallet detected in browser" : "No Solana wallet detected"}
                </p>
                <p className="text-[12px] text-text-secondary mt-1.5 leading-snug">
                  {onIOS ? (
                    <>Use one of the buttons above to open Duster inside your wallet app.</>
                  ) : (
                    <>Install <a className="text-sweep underline" href="https://phantom.com/" target="_blank" rel="noreferrer">Phantom</a>,{" "}
                    <a className="text-sweep underline" href="https://solflare.com/" target="_blank" rel="noreferrer">Solflare</a>, or{" "}
                    <a className="text-sweep underline" href="https://backpack.app/" target="_blank" rel="noreferrer">Backpack</a> and reload.</>
                  )}
                </p>
                {!onIOS && (
                  <button
                    onClick={open}
                    className="mt-4 px-4 py-2 rounded-full bg-sweep text-void font-display font-bold text-[13px]"
                  >
                    Open wallet picker anyway
                  </button>
                )}
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
