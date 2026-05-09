import { useEffect, useRef, useState } from "react";

/**
 * Animates from the previously displayed value to `to` whenever `to` changes.
 * First mount: animates from `from` (default 0) with overshoot easing.
 * Subsequent changes: tweens smoothly from the prior `to`, no jump-back-to-zero.
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
  const prevTo = useRef(from);
  const startedAt = useRef(0);
  const rafRef = useRef(0);
  const doneRef = useRef(false);

  useEffect(() => {
    doneRef.current = false;
    startedAt.current = 0;
    const initial = prevTo.current;
    const target = to;

    const tick = (now) => {
      if (!startedAt.current) startedAt.current = now;
      const t = Math.min(1, (now - startedAt.current) / duration);
      // Overshoot back-out
      const c1 = 1.70158;
      const c3 = c1 + 1;
      const eased = 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
      setValue(initial + (target - initial) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setValue(target);
        prevTo.current = target;
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
