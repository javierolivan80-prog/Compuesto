export type FloorStatus = 'completed' | 'current' | 'locked';

export interface Floor {
  level: number;
  name: string;
  status: FloorStatus;
}

const STATUS_TEXT: Record<FloorStatus, string> = {
  completed: '✓ completada',
  current: '▶ en curso',
  locked: 'bloqueada',
};

/** Camino (variante A elegida en 0.6): corte del edificio de Albufera Partners, planta más alta arriba. */
export function Building({ floors }: { floors: Floor[] }) {
  const sorted = [...floors].sort((a, b) => b.level - a.level);
  return (
    <ol
      aria-label="Edificio de Albufera Partners"
      className="border-line grid gap-1 rounded-[var(--radius-md)] border-2 p-2"
    >
      {sorted.map((f) => (
        <li
          key={f.level}
          aria-current={f.status === 'current' ? 'step' : undefined}
          className={`flex min-h-14 items-center justify-between rounded-[var(--radius-sm)] px-4 ${f.status === 'current' ? 'bg-surface-2 border-brand border' : 'bg-surface-1'} ${f.status === 'locked' ? 'text-text-2' : ''}`}
        >
          <span>
            <span data-num className="mr-3">
              P{f.level}
            </span>
            {f.name}
          </span>
          <span className="text-sm">{STATUS_TEXT[f.status]}</span>
        </li>
      ))}
    </ol>
  );
}
