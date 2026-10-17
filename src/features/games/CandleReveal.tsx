import { useEffect, useRef } from 'react';
import type { Candle } from '../../engine/games/news';
import { usePrefersReducedMotion } from '../../lib/reduced-motion';

const W = 160;
const H = 200;
const GROW_MS = 900;

const cssColor = (el: Element, name: string) => getComputedStyle(el).getPropertyValue(name).trim();

/** Vela que se forma en tiempo real (900 ms, tras 150 ms de anticipación) en Canvas 2D. Con reduced-motion sale ya formada. */
export function CandleReveal({ candle, onDone }: { candle: Candle; onDone?: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = usePrefersReducedMotion();
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
      done.current?.();
      return;
    }
    const lo = Math.min(candle.low, candle.open) * 0.995;
    const hi = Math.max(candle.high, candle.open) * 1.005;
    const y = (v: number) => H - 12 - ((v - lo) / (hi - lo)) * (H - 24);
    const up = candle.close >= candle.open;
    const color = cssColor(canvas, up ? '--bull' : '--bear');
    const line = cssColor(canvas, '--line');
    const draw = (p: number) => {
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = line;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y(candle.open));
      ctx.lineTo(W, y(candle.open));
      ctx.stroke();
      const close = candle.open + (candle.close - candle.open) * p;
      const high = candle.open + (candle.high - candle.open) * p;
      const low = candle.open + (candle.low - candle.open) * p;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(W / 2, y(Math.max(high, candle.open, close)));
      ctx.lineTo(W / 2, y(Math.min(low, candle.open, close)));
      ctx.stroke();
      const top = y(Math.max(candle.open, close));
      const bottom = y(Math.min(candle.open, close));
      ctx.fillRect(W / 2 - 22, top, 44, Math.max(2, bottom - top));
    };
    if (reduced) {
      draw(1);
      done.current?.();
      return;
    }
    draw(0);
    let raf = 0;
    const t0 = performance.now() + 150; // anticipación
    const tick = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - t0) / GROW_MS));
      draw(1 - Math.pow(1 - p, 3)); // ease-out
      if (p < 1) raf = requestAnimationFrame(tick);
      else done.current?.();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [candle, reduced]);

  return (
    <canvas
      ref={ref}
      width={W}
      height={H}
      className="bg-surface-1 border-line mx-auto rounded-[var(--radius-md)] border"
      role="img"
      aria-label={`${candle.close >= candle.open ? '▲' : '▼'} ${((candle.close / candle.open - 1) * 100).toFixed(1).replace('.', ',')} %`}
      data-testid="candle"
    />
  );
}
