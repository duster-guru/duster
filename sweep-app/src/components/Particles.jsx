import { useEffect, useRef } from "react";

/**
 * Canvas-based dust particle field.
 * Three depth layers per spec — back/mid/front, drifting upward, sine sway.
 *
 * Modes:
 *   "ambient"  — gentle upward drift (splash, success)
 *   "inward"   — accelerated drift toward center (scan)
 *   "vortex"   — spiral inward toward center (cleaning)
 *   "burst"    — explosive outward burst then settle (reveal)
 */
export default function Particles({
  mode = "ambient",
  count = 60,
  className = "",
  color = "#7CFFB2",
  intensity = 1,
}) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const startedAt = useRef(performance.now());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    // Wrap in rAF to avoid "ResizeObserver loop completed" warning when
    // the callback synchronously triggers another layout pass.
    const ro = new ResizeObserver(() => {
      window.requestAnimationFrame(resize);
    });
    ro.observe(canvas);

    const W = () => canvas.getBoundingClientRect().width;
    const H = () => canvas.getBoundingClientRect().height;

    const layers = [
      { size: 1, opacity: 0.20, speed: 8, sway: 0 },
      { size: 2, opacity: 0.40, speed: 16, sway: 8 },
      { size: 3, opacity: 0.60, speed: 24, sway: 16 },
    ];

    const particles = Array.from({ length: count }, (_, i) => {
      const layer = layers[i % 3];
      return {
        x: Math.random() * W(),
        y: Math.random() * H(),
        baseX: 0,
        size: layer.size,
        opacity: layer.opacity,
        speed: layer.speed,
        sway: layer.sway,
        phase: Math.random() * Math.PI * 2,
        flicker: Math.random() * Math.PI * 2,
      };
    });
    particles.forEach((p) => (p.baseX = p.x));

    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = (now - startedAt.current) / 1000;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = W() / 2;
      const cy = H() / 2;

      particles.forEach((p) => {
        if (mode === "ambient") {
          p.y -= p.speed * dt;
          if (p.y < -10) {
            p.y = H() + 10;
            p.baseX = Math.random() * W();
          }
          p.x = p.baseX + Math.sin(t * 0.6 + p.phase) * p.sway;
        } else if (mode === "inward") {
          const dx = cx - p.x;
          const dy = cy - p.y;
          const dist = Math.hypot(dx, dy) + 0.001;
          p.x += (dx / dist) * p.speed * 2 * dt * intensity;
          p.y += (dy / dist) * p.speed * 2 * dt * intensity;
          if (dist < 12) {
            // respawn at edge
            const ang = Math.random() * Math.PI * 2;
            const r = Math.max(W(), H()) * 0.6;
            p.x = cx + Math.cos(ang) * r;
            p.y = cy + Math.sin(ang) * r;
          }
        } else if (mode === "vortex") {
          const dx = cx - p.x;
          const dy = cy - p.y;
          const dist = Math.hypot(dx, dy) + 0.001;
          // spiral: tangential + inward
          const ang = Math.atan2(dy, dx);
          const tang = ang + Math.PI / 2;
          const inwardSpeed = 40 + 60 * intensity;
          const tangSpeed = 80 + 60 * intensity;
          p.x += (Math.cos(ang) * inwardSpeed + Math.cos(tang) * tangSpeed) * dt * (1 - Math.min(0.8, 200 / dist));
          p.y += (Math.sin(ang) * inwardSpeed + Math.sin(tang) * tangSpeed) * dt * (1 - Math.min(0.8, 200 / dist));
          if (dist < 6) {
            const a = Math.random() * Math.PI * 2;
            const r = Math.max(W(), H()) * 0.5;
            p.x = cx + Math.cos(a) * r;
            p.y = cy + Math.sin(a) * r;
          }
        } else if (mode === "burst") {
          // expand outward fast then settle into ambient
          if (t < 0.6) {
            const dx = p.x - cx;
            const dy = p.y - cy;
            const dist = Math.hypot(dx, dy) + 0.001;
            p.x += (dx / dist) * 600 * dt;
            p.y += (dy / dist) * 600 * dt;
          } else {
            p.y -= p.speed * dt;
            if (p.y < -10) p.y = H() + 10;
          }
        }

        const flick = 0.7 + 0.3 * Math.sin(t * 1.2 + p.flicker);
        ctx.globalAlpha = p.opacity * flick;
        ctx.fillStyle = color;
        ctx.shadowBlur = p.size * 3;
        ctx.shadowColor = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [mode, count, color, intensity]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
    />
  );
}
