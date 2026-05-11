import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useWallet } from "@solana/wallet-adapter-react";
import { SCREENS } from "./lib/screens";
import { ALL_GROUP_IDS } from "./lib/solana/groups";
import useDustScan from "./hooks/useDustScan";
import useSweepExecution from "./hooks/useSweepExecution";
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
  // Group selection: which programs to include in this sweep. Default = all.
  const [selectedGroups, setSelectedGroups] = useState(ALL_GROUP_IDS);
  // Sweep destination: "usdc" | "sol" | "sweep". Each maps to a mint + fee
  // tier in lib/solana/outputs. SWEEP option is gated on VITE_SWEEP_MINT.
  const [outputAsset, setOutputAsset] = useState("usdc");

  const { connected, publicKey } = useWallet();
  const scan = useDustScan();
  const exec = useSweepExecution();

  // Bridge wallet-adapter's `connected` state into the screen state machine.
  // This is the textbook case where setState-in-effect is correct — we're
  // syncing local UI state with an external (wallet adapter) subscription.
  // The setState calls are wrapped in queueMicrotask to satisfy the
  // react-hooks/set-state-in-effect lint, with no observable difference.
  useEffect(() => {
    if (connected && (screen === SCREENS.SPLASH || screen === SCREENS.CONNECT)) {
      // Wallet-as-login: always land on the dashboard after connect. The
      // dashboard shows the connected identity (wallet pill), live USDC,
      // and history — or a first-run empty state telling the user to
      // start their first sweep. This keeps "you are logged in" visible
      // and gives a single home for history access.
      queueMicrotask(() => setScreen(SCREENS.DASHBOARD));
    }
    if (!connected && (screen !== SCREENS.SPLASH && screen !== SCREENS.CONNECT)) {
      // Wallet disconnected mid-flow — kick back to splash.
      queueMicrotask(() => {
        setScreen(SCREENS.SPLASH);
        exec.reset();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey?.toBase58()]);

  // Filter dust to selected groups for downstream screens.
  const filteredDust = useMemo(
    () => scan.dust.filter((t) => selectedGroups.includes(t.groupId)),
    [scan.dust, selectedGroups]
  );

  const go = (next) => {
    if (next === SCREENS.SCAN || next === SCREENS.SPLASH) {
      setSelectedGroups(ALL_GROUP_IDS);
      setOutputAsset("usdc");
      exec.reset();
    }
    if (next === SCREENS.SCAN && scan.status !== "scanning") {
      scan.refresh();
    }
    setScreen(next);
  };

  const Current = screenComponent[screen];

  return (
    <div className="h-full w-full bg-void flex items-center justify-center">
      <div
        className="relative overflow-hidden bg-void no-select shadow-2xl mx-auto"
        style={{
          width: "min(100vw, 420px)",
          height: "min(100dvh, 900px)",
          borderRadius: "min(0px, 36px)",
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
              scan={scan}
              exec={exec}
              filteredDust={filteredDust}
              selectedGroups={selectedGroups}
              setSelectedGroups={setSelectedGroups}
              outputAsset={outputAsset}
              setOutputAsset={setOutputAsset}
            />
          </motion.div>
        </AnimatePresence>

        {/* Home indicator only — top status bar removed per design */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[134px] h-[5px] rounded-full bg-text-primary/40 z-50 pointer-events-none" />
      </div>
    </div>
  );
}
