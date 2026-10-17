import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { spawnBurst, stepParticles, type Particle } from '../../../engine/particles';
import { usePrefersReducedMotion } from '../../../lib/reduced-motion';

export interface ParticleHandle {
  /** Estalla en (x, y) píxeles del lienzo. No hace nada con reduced-motion. */
  burst: (x: number, y: number, seed: number) => void;
}

/** Partículas del tema (20–40, 700 ms, gravedad suave) en Canvas 2D; el bucle solo corre mientras hay partículas. */
export const ParticleCanvas = forwardRef<ParticleHandle, { className?: string }>(
  function ParticleCanvas({ className = '' }, handle) {
    const ref = useRef<HTMLCanvasElement>(null);
    const parts = useRef<Particle[]>([]);
    const raf = useRef(0);
    const last = useRef(0);
    const reduced = usePrefersReducedMotion();

    const loop = useRef<(now: number) => void>(() => undefined);
    useEffect(() => {
      loop.current = (now: number) => {
        const canvas = ref.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        const dt = last.current ? now - last.current : 16;
        last.current = now;
        parts.current = stepParticles(parts.current, dt);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = getComputedStyle(canvas).color;
        for (const p of parts.current) {
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
        ctx.globalAlpha = 1;
        if (parts.current.length) raf.current = requestAnimationFrame(loop.current);
        else {
          last.current = 0;
          raf.current = 0;
        }
      };
    });

    useImperativeHandle(handle, () => ({
      burst(x, y, seed) {
        if (reduced) return;
        parts.current = [...parts.current, ...spawnBurst({ x, y, seed })].slice(-120);
        if (!raf.current) raf.current = requestAnimationFrame((t) => loop.current(t));
      },
    }));

    useEffect(() => {
      const canvas = ref.current;
      if (!canvas) return;
      const fit = () => {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
      };
      fit();
      const ro = new ResizeObserver(fit);
      ro.observe(canvas);
      return () => {
        ro.disconnect();
        cancelAnimationFrame(raf.current);
        raf.current = 0;
      };
    }, []);

    return (
      <canvas
        ref={ref}
        aria-hidden="true"
        className={`text-brand pointer-events-none absolute inset-0 h-full w-full ${className}`}
      />
    );
  },
);
