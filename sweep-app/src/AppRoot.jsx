// Everything below this barrier is lazy-loaded — the Solana SDK + the
// wallet adapter + every screen + framer-motion live in this chunk.
// The homepage at "/" never instantiates any of them, which is what
// keeps initial paint fast.
import { useEffect } from "react";
import SolanaProvider from "./contexts/SolanaProvider";
import App from "./App";

export default function AppRoot() {
  // Lock body scroll while the phone-frame UI is mounted. The in-app
  // screens manage their own overflow inside the fixed-height frame;
  // letting body scroll would double-scroll on desktop and break the
  // app's contained-canvas feel. Homepage at "/" doesn't apply this.
  useEffect(() => {
    document.body.classList.add("app-locked");
    return () => { document.body.classList.remove("app-locked"); };
  }, []);

  return (
    <SolanaProvider>
      <App />
    </SolanaProvider>
  );
}
