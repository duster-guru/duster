import { StrictMode } from "react";
import { Buffer } from "buffer";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import SolanaProvider from "./contexts/SolanaProvider.jsx";

// web3.js relies on Buffer at module scope; Vite doesn't polyfill by default.
if (!window.Buffer) window.Buffer = Buffer;
if (!globalThis.Buffer) globalThis.Buffer = Buffer;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <SolanaProvider>
      <App />
    </SolanaProvider>
  </StrictMode>
);
