/* eslint-disable react-refresh/only-export-components */
// Entry file — mixes side effects (analytics init, render) with a lazy
// component import. react-refresh would prefer pure-export files, but
// that doesn't apply to the entry. Disable the rule here only.

// Polyfills first — Solana SDK modules read globalThis.Buffer at module
// init. They live behind the lazy AppRoot now, but keeping the polyfill
// eager is cheap (~20KB) and prevents any future eager-imported helper
// from racing the SDK.
import "./lib/polyfills";
import { initCloudflareAnalytics } from "./lib/analytics";

import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./index.css";
import Home from "./Home.jsx";
import AppFallback from "./components/AppFallback.jsx";

initCloudflareAnalytics();

// AppRoot drags in SolanaProvider + every screen + framer-motion +
// the wallet adapter UI. Lazy-load it so visitors at "/" don't pay for
// any of that until they actually open the app.
const AppRoot = lazy(() => import("./AppRoot.jsx"));

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/app/*"
          element={
            <Suspense fallback={<AppFallback />}>
              <AppRoot />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
