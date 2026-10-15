import { useEffect, useRef, useState } from 'react';
import { dur } from '../design/motion';
import { usePrefersReducedMotion } from '../lib/reduced-motion';
import { formatNumber } from '../lib/format';

interface Props {
  value: number;
  /** Valor desde el que cuenta al montar (por defecto, `value`). */
  initial?: number;
  digits?: number;
  format?: (n: number) => string;
  duration?: number;
}

/** Contador con cifras tabulares (no bailan). Con reduced-motion salta al valor final. */
export function AnimatedNumber({ value, initial, digits = 0, format, duration = dur.long }: Props) {
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState(initial ?? value);
  const prev = useRef(initial ?? value);

  useEffect(() => {
    // Con reduced-motion el contador salta al valor final. Si no, cuenta con una curva de salida (ease-out).
    const from = prev.current;
    if (reduced || from === value) {
      prev.current = value;
      setShown(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - t, 4);
      setShown(from + (value - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else prev.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, reduced]);

  const fmt = format ?? ((n: number) => formatNumber(n, digits));
  return (
    <span data-num>
      <span className="sr-only">{fmt(value)}</span>
      <span aria-hidden="true">{fmt(shown)}</span>
    </span>
  );
}
