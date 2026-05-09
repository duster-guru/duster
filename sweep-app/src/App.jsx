import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SCREENS } from "./lib/screens";
import Splash from "./screens/Splash";
import Connect from "./screens/Connect";
import Scan from "./screens/Scan";
import Results from "./screens/Results";
import Cleaning from "./screens/Cleaning";
import Success from "./screens/Success";
import Share from "./screens/Share";
import Dashboard from "./screens/Dashboard";

const screenComponent = {
  [SCREENS.SPLASH]: Splash,
  [SCREENS.CONNECT]: Connect,
  [SCREENS.SCAN]: Scan,
  [SCREENS.RESULTS]: Results,
  [SCREENS.CLEANING]: Cleaning,
  [SCREENS.SUCCESS]: Success,
  [SCREENS.SHARE]: Share,
  [SCREENS.DASHBOARD]: Dashboard,
};

export default function App() {
  const [screen, setScreen] = useState(SCREENS.SPLASH);
  const [sweepMode, setSweepMode] = useState(false);

  // Keep iOS-style fixed viewport on mobile/desktop preview.
  useEffect(() => {
    const setVH = () => {
      document.documentElement.style.setProperty(
        "--vh",
        `${window.innerHeight * 0.01}px`
      );
    };
    setVH();
    window.addEventListener("resize", setVH);
    return () => window.removeEventListener("resize", setVH);
  }, []);

  const Current = screenComponent[screen];
  const go = (next) => setScreen(next);

  return (
    <div className="h-full w-full bg-void flex items-center justify-center">
      {/* Desktop frame: phone-sized viewport. On mobile, fills screen. */}
      <div
        className="relative overflow-hidden bg-void no-select shadow-2xl mx-auto"
        style={{
          width: "min(100vw, 420px)",
          height: "min(100dvh, 900px)",
          borderRadius: "min(0px, 36px)", // squared on mobile, rounded on desktop
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, #161A26 0%, #0E1119 35%, #06070D 100%)",
          }}
        />
        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0"
          >
            <Current
              go={go}
              sweepMode={sweepMode}
              setSweepMode={setSweepMode}
            />
          </motion.div>
        </AnimatePresence>

        {/* Status bar overlay (cosmetic, iOS-style) */}
        <div className="absolute top-0 left-0 right-0 h-11 z-50 pointer-events-none flex items-center justify-between px-6 text-[13px] font-semibold text-text-primary/90">
          <span>9:41</span>
          <span className="flex gap-1.5 items-center">
            <span className="opacity-80">●●●</span>
            <span className="opacity-80">📶</span>
            <span className="opacity-80">100%</span>
          </span>
        </div>

        {/* Home indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[134px] h-[5px] rounded-full bg-text-primary/40 z-50 pointer-events-none" />
      </div>
    </div>
  );
}
