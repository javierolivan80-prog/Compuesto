import { m, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { ease, stagger } from '../../design/motion';
import { formatNumber } from '../../lib/format';

export interface Row {
  id: string;
  name: string;
  xp: number;
  you?: boolean;
}

/** Cierre semanal: la clasificación se reordena con FLIP (layout de Motion), tu fila destacada. */
export function WeeklyClose({ before, after }: { before: Row[]; after: Row[] }) {
  const reduced = useReducedMotion();
  const [rows, setRows] = useState(before);

  useEffect(() => {
    const id = setTimeout(() => setRows(after), reduced ? 0 : 600);
    return () => clearTimeout(id);
  }, [after, reduced]);

  return (
    <ol aria-label="Clasificación semanal" className="grid gap-2">
      {rows.map((r, i) => (
        <m.li
          key={r.id}
          layout={!reduced}
          transition={{ duration: 0.32, ease: ease.out, delay: reduced ? 0 : i * stagger }}
          className={`flex items-center justify-between rounded-[var(--radius-sm)] border px-4 py-3 ${r.you ? 'border-brand bg-surface-2' : 'border-line bg-surface-1'}`}
        >
          <span>
            <span data-num className="text-text-2 mr-3">
              {i + 1}.
            </span>
            {r.name}
            {r.you && <strong className="text-brand ml-2 text-sm">(tú)</strong>}
          </span>
          <span data-num>{formatNumber(r.xp)} XP</span>
        </m.li>
      ))}
    </ol>
  );
}
