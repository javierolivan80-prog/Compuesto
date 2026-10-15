import { useEffect, useRef } from 'react';
import { mulberry32 } from '../engine/prng';
import { prefersReducedMotion } from '../design/motion';

interface Props {
  count?: number;
  duration?: number;
  seed?: number;
}

/** Confeti dorado sobrio en Canvas 2D (30 partículas, gravedad suave). No dibuja nada con reduced-motion. */
export function Confetti({ count = 30, duration = 1400, seed = 1 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || prefersReducedMotion()) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rnd = mulberry32(seed);
    const w = (canvas.width = canvas.clientWidth);
    const h = (canvas.height = canvas.clientHeight);
    const color = getComputedStyle(document.documentElement).getPropertyValue('--brand').trim();
    const parts = Array.from({ length: count }, () => ({
      x: w / 2,
      y: h * 0.6,
      vx: (rnd() - 0.5) * 6,
      vy: -3 - rnd() * 5,
      s: 3 + rnd() * 3,
      r: rnd() * Math.PI,
    }));
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = now - t0;
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = Math.max(0, 1 - t / duration);
      ctx.fillStyle = color;
      for (const p of parts) {
        p.vy += 0.16;
        p.x += p.vx;
        p.y += p.vy;
        p.r += 0.1;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
        ctx.restore();
      }
      if (t < duration) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [count, duration, seed]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 size-full"
    />
  );
}
