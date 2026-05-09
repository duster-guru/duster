// Polyfills MUST be imported before anything else — Solana SDK modules
// read globalThis.Buffer at module-init time.
import "./lib/polyfills";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import SolanaProvider from "./contexts/SolanaProvider.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <SolanaProvider>
      <App />
    </SolanaProvider>
  </StrictMode>
);
