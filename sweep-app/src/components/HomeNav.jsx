import { LayoutDashboard } from "lucide-react";
import { SCREENS } from "../lib/screens";
import { haptic } from "../lib/haptics";

/**
 * Persistent "back to dashboard" button. Drop into the top-right of any
 * mid-flow screen (Connect / Scan / Results / Success / Share) — gives
 * the user an always-visible escape hatch to the dashboard.
 *
 * Deliberately NOT shown on:
 *   - Splash (wallet not connected yet)
 *   - Dashboard (you're already there)
 *   - Cleaning (transaction in flight — don't tempt navigation)
 */
export default function HomeNav({ go }) {
  return (
    <button
      onClick={() => { haptic.light?.(); go(SCREENS.DASHBOARD); }}
      aria-label="Open dashboard"
      title="Dashboard"
      className="absolute top-4 right-4 z-30 w-9 h-9 rounded-full glass flex items-center justify-center text-text-secondary"
    >
      <LayoutDashboard size={15} />
    </button>
  );
}
