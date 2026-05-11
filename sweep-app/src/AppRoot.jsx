// Everything below this barrier is lazy-loaded — the Solana SDK + the
// wallet adapter + every screen + framer-motion live in this chunk.
// The homepage at "/" never instantiates any of them, which is what
// keeps initial paint fast.
import SolanaProvider from "./contexts/SolanaProvider";
import App from "./App";

export default function AppRoot() {
  return (
    <SolanaProvider>
      <App />
    </SolanaProvider>
  );
}
