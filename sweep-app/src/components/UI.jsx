import { motion } from "framer-motion";
import { haptic } from "../lib/haptics";

const press = { scale: 0.97 };
const ease = [0.16, 1, 0.3, 1];

export function PrimaryButton({ children, onClick, glow = "mint", className = "", icon = null, hapticType = "light" }) {
  const glowClass =
    glow === "magenta"
      ? "shadow-cta-magenta hover:shadow-cta-magenta"
      : "shadow-cta hover:shadow-cta";
  const bg = glow === "magenta" ? "bg-magenta" : "bg-sweep";
  return (
    <motion.button
      whileTap={press}
      onClick={(e) => {
        haptic[hapticType]?.();
        onClick?.(e);
      }}
      className={`relative w-full h-[60px] rounded-full ${bg} ${glowClass} text-void font-display font-bold text-[17px] flex items-center justify-center gap-2 ${className}`}
      style={{ animation: "pulseGlow 2.4s ease-in-out infinite" }}
    >
      <span className="flex items-center gap-2">{children}{icon}</span>
    </motion.button>
  );
}

export function GlassButton({ children, onClick, className = "", icon = null, disabled = false }) {
  return (
    <motion.button
      whileTap={disabled ? undefined : press}
      onClick={(e) => {
        if (disabled) return;
        haptic.light?.();
        onClick?.(e);
      }}
      disabled={disabled}
      aria-disabled={disabled}
      className={`relative w-full h-14 rounded-full glass text-text-primary font-display font-semibold text-[16px] flex items-center justify-center gap-2 ${disabled ? "opacity-60 cursor-not-allowed" : ""} ${className}`}
    >
      <span className="flex items-center gap-2">{children}{icon}</span>
    </motion.button>
  );
}

export function GhostButton({ children, onClick, className = "" }) {
  return (
    <motion.button
      whileTap={{ opacity: 0.6 }}
      onClick={(e) => {
        haptic.light?.();
        onClick?.(e);
      }}
      className={`text-text-secondary text-[15px] font-medium px-3 py-2 ${className}`}
    >
      {children}
    </motion.button>
  );
}

export function Card({ children, className = "", hairline = true }) {
  return (
    <div
      className={`rounded-md bg-surface ${hairline ? "hairline-top" : ""} ${className}`}
      style={{ border: "1px solid rgba(255,255,255,0.08)" }}
    >
      {children}
    </div>
  );
}

export function GlassCard({ children, className = "", padding = "p-5" }) {
  return (
    <div className={`rounded-md glass ${padding} ${className}`}>
      {children}
    </div>
  );
}

export function HeroGlassCard({ children, className = "", animated = false }) {
  return (
    <div
      className={`rounded-lg glass-strong ${animated ? "conic-border" : ""} ${className}`}
    >
      <div className="relative z-10 p-5">{children}</div>
    </div>
  );
}

export function ProgressBar({ value, className = "", color = "sweep" }) {
  const fill = color === "magenta" ? "bg-magenta" : "bg-sweep";
  const glow = color === "magenta" ? "rgba(255,79,216,0.6)" : "rgba(124,255,178,0.6)";
  return (
    <div className={`relative h-1 w-full overflow-hidden rounded-full bg-white/10 ${className}`}>
      <motion.div
        className={`absolute left-0 top-0 h-full ${fill}`}
        style={{ boxShadow: `0 0 12px ${glow}` }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={{ duration: 0.4, ease }}
      />
    </div>
  );
}

export function MicroLabel({ children, className = "", color = "muted" }) {
  const c = color === "gold" ? "text-gold" : color === "mint" ? "text-sweep" : color === "magenta" ? "text-magenta" : "text-text-muted";
  return (
    <span className={`uppercase tracking-[0.16em] text-[11px] font-semibold ${c} ${className}`}>
      {children}
    </span>
  );
}

export function BackButton({ onClick }) {
  return (
    <button
      onClick={() => { haptic.light?.(); onClick?.(); }}
      className="absolute top-14 left-5 w-11 h-11 rounded-full glass flex items-center justify-center text-text-secondary z-30"
      aria-label="Back"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M11 4L6 9L11 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );
}

export function TokenIcon({ symbol, color, size = 32 }) {
  return (
    <div
      className="rounded-full flex items-center justify-center font-mono font-bold text-[10px] text-white shrink-0"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${color} 0%, ${color}99 100%)`,
        boxShadow: `0 0 12px ${color}66`,
      }}
    >
      {symbol.slice(0, 3)}
    </div>
  );
}
