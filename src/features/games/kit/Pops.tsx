import { useCallback, useEffect, useRef, useState } from 'react';

export interface Pop {
  id: number;
  text: string;
  tone: 'up' | 'down' | 'neutral';
  x: number;
  y: number;
}

const POP_MS = 600;

/** Pops de número (+120 XP, −3,2 %): salen del punto de acción, suben 24 px y se desvanecen en 600 ms. */
export function usePops() {
  const [pops, setPops] = useState<Pop[]>([]);
  const next = useRef(0);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);
  const pop = useCallback((text: string, tone: Pop['tone'], x = 50, y = 50) => {
    const id = next.current++;
    setPops((p) => [...p.slice(-7), { id, text, tone, x, y }]);
    timers.current.push(
      window.setTimeout(() => setPops((p) => p.filter((q) => q.id !== id)), POP_MS + 50),
    );
  }, []);
  return { pops, pop };
}

/** Capa de pops: posición en % del contenedor (que debe ser `relative`). Las flechas ▲▼ acompañan al color. */
export function PopLayer({ pops }: { pops: Pop[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {pops.map((p) => (
        <span
          key={p.id}
          data-num
          data-tone={p.tone}
          className={`kit-pop absolute text-2xl font-medium ${p.tone === 'up' ? 'text-bull' : p.tone === 'down' ? 'text-bear' : 'text-text'}`}
          style={{ left: `${p.x}%`, top: `${p.y}%`, fontFamily: 'var(--font-mono)' }}
        >
          {p.tone === 'up' ? '▲ ' : p.tone === 'down' ? '▼ ' : ''}
          {p.text}
        </span>
      ))}
    </div>
  );
}
