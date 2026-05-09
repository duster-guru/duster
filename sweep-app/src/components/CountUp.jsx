import { useEffect, useRef, useState } from "react";

/**
 * Counts from 0 (or `from`) to `to` over `duration` ms with overshoot easing.
 * Renders monospace tabular figures for stable layout.
 */
export default function CountUp({
  to,
  from = 0,
  duration = 800,
  prefix = "",
  decimals = 2,
  className = "",
  onDone = null,
}) {
  const [value, setValue] = useState(from);
  const startedAt = useRef(0);
  const rafRef = useRef(0);
  const doneRef = useRef(false);

  useEffect(() => {
    doneRef.current = false;
    startedAt.current = 0;

    const tick = (now) => {
      if (!startedAt.current) startedAt.current = now;
      const t = Math.min(1, (now - startedAt.current) / duration);
      // Overshoot ease — back-out
      const c1 = 1.70158;
      const c3 = c1 + 1;
      const eased = 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
      setValue(from + (to - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setValue(to);
        if (!doneRef.current) {
          doneRef.current = true;
          onDone?.();
        }
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to, duration]);

  const display = value.toFixed(decimals);
  return (
    <span className={`font-mono tabular-nums ${className}`}>
      {prefix}{display}
    </span>
  );
}
