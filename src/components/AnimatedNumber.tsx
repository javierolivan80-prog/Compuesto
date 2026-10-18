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

/**
 * Contador con cifras tabulares (no bailan). Con reduced-motion salta al valor final.
 * Los fotogramas intermedios se escriben directamente en el texto del nodo, sin re-render de React por fotograma;
 * React solo pinta el valor de partida y el final.
 */
export function AnimatedNumber({ value, initial, digits = 0, format, duration = dur.long }: Props) {
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState(initial ?? value);
  const prev = useRef(initial ?? value);
  const node = useRef<HTMLSpanElement>(null);
  const fmt = format ?? ((n: number) => formatNumber(n, digits));
  const fmtRef = useRef(fmt);
  useEffect(() => {
    fmtRef.current = fmt;
  });

  useEffect(() => {
    // Con reduced-motion el contador salta al valor final. Si no, cuenta con una curva de salida (ease-out).
    const from = prev.current;
    const paint = (n: number) => {
      if (node.current) node.current.textContent = fmtRef.current(n);
    };
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
      const n = from + (value - from) * eased;
      prev.current = n;
      paint(n);
      if (t < 1) raf = requestAnimationFrame(tick);
      else {
        prev.current = value;
        setShown(value);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, reduced]);

  return (
    <span data-num>
      <span className="sr-only">{fmt(value)}</span>
      <span ref={node} aria-hidden="true">
        {fmt(shown)}
      </span>
    </span>
  );
}
