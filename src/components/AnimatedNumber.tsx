import { animate, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { dur, ease } from '../design/motion';
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
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(initial ?? value);
  const prev = useRef(initial ?? value);

  useEffect(() => {
    // Con reduced-motion el contador salta al valor final (duración ~0).
    const controls = animate(prev.current, value, {
      duration: reduced ? 0.001 : duration,
      ease: ease.out,
      onUpdate: (v) => setShown(v),
      onComplete: () => {
        prev.current = value;
      },
    });
    return () => controls.stop();
  }, [value, duration, reduced]);

  const fmt = format ?? ((n: number) => formatNumber(n, digits));
  return (
    <span data-num>
      <span className="sr-only">{fmt(value)}</span>
      <span aria-hidden="true">{fmt(shown)}</span>
    </span>
  );
}
