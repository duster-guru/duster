import { useState } from "react";
import { haptic } from "../lib/haptics";

// Pulled from vite's `define` at build time. Pin the bundle to one
// readable identifier so user bug reports + post-deploy sanity-checks
// don't need a git blame.
const VERSION =
  typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";
const COMMIT =
  typeof __APP_COMMIT__ !== "undefined" ? __APP_COMMIT__ : "local";
const BUILT =
  typeof __APP_BUILT__ !== "undefined" ? __APP_BUILT__ : "";

/**
 * Subtle version pill. Renders as a single muted line: "v0.1.0 · #abc1234".
 * Tap to copy the full version string (incl. build date) — useful for users
 * pasting it into a bug report. No haptic on hover; tap only.
 *
 * Props:
 *   - tone: "muted" (default) or "ghost" — controls colour weight.
 *   - className: extra Tailwind classes for layout.
 */
export default function VersionBadge({ tone = "muted", className = "" }) {
  const [copied, setCopied] = useState(false);

  const display = `v${VERSION} · #${COMMIT}`;
  const full = `Duster v${VERSION} · #${COMMIT}${BUILT ? ` · built ${BUILT}` : ""}`;

  const color = tone === "ghost" ? "text-text-muted/70" : "text-text-muted";

  return (
    <button
      type="button"
      onClick={async () => {
        haptic.light?.();
        try {
          await navigator.clipboard.writeText(full);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        } catch { /* clipboard unavailable */ }
      }}
      title={full}
      aria-label={`App version ${display}. Tap to copy full build identifier.`}
      className={`font-mono text-[10px] tracking-wider tabular-nums ${color} hover:opacity-100 transition-opacity ${className}`}
    >
      {copied ? "copied" : display}
    </button>
  );
}
