/**
 * Loading shell shown while the lazy AppRoot chunk is fetched. Matches
 * the app shell's dark gradient + center-stage favicon so the visual
 * transition from homepage → app is seamless (the favicon stays put,
 * the rest fades in around it).
 *
 * Deliberately pure CSS — no framer-motion (that's in the lazy bundle)
 * so the fallback paints instantly without waiting for the same chunk
 * it's trying to load.
 */
export default function AppFallback() {
  return (
    <div className="w-full h-full bg-void flex items-center justify-center">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, #161A26 0%, #0E1119 35%, #06070D 100%)",
        }}
      />
      <div className="relative flex flex-col items-center gap-4">
        <img
          src="/favicon.svg"
          alt=""
          aria-hidden="true"
          width={56}
          height={56}
          style={{
            filter: "drop-shadow(0 0 12px rgba(168,85,247,0.55))",
            animation: "fallback-pulse 1.6s ease-in-out infinite",
          }}
        />
        <span className="font-mono text-[11px] text-text-muted uppercase tracking-wider">
          Loading Duster…
        </span>
      </div>
      <style>{`
        @keyframes fallback-pulse {
          0%, 100% { opacity: 0.6; transform: scale(0.98); }
          50%      { opacity: 1.0; transform: scale(1.02); }
        }
      `}</style>
    </div>
  );
}
