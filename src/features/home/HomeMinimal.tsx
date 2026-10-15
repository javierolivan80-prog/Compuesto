import { useEffect, useState } from 'react';
import { Logo } from '../../brand/Logo';
import { Button } from '../../components/Button';
import type { Lesson } from '../../content/schemas';
import { useRepo } from '../../db/RepoProvider';
import type { Summary } from '../../engine/projections';
import { formatNumber } from '../../lib/format';

/** PROVISIONAL(tarea 1.7): Home mínima de la rebanada vertical; se rehace con las 5 pestañas. */
export function HomeMinimal({
  lessons,
  onStart,
}: {
  lessons: Lesson[];
  onStart: (id: string) => void;
}) {
  const repo = useRepo();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    repo
      .summary()
      .then((s) => alive && setSummary(s))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [repo]);

  const progress = summary?.progress.lessons ?? {};
  const next = lessons.find((l) => progress[l.id]?.status !== 'completed') ?? lessons[0];

  return (
    <div className="grid gap-6">
      <header className="grid gap-2">
        <Logo variant="full" size={44} />
        <p className="text-text-2">20 minutos al día. Se capitalizan.</p>
      </header>

      {error && (
        <p role="alert" className="text-bear">
          Error: no se pudo leer tu progreso. Recarga la página.
        </p>
      )}

      <dl className="grid grid-cols-3 gap-3 text-center" aria-label="Tu progreso">
        <div className="bg-surface-1 border-line rounded-[var(--radius-md)] border p-3">
          <dt className="text-text-2 text-sm">XP</dt>
          <dd className="text-2xl" data-num data-testid="xp-total">
            {summary ? formatNumber(summary.xp.total) : '…'}
          </dd>
        </div>
        <div className="bg-surface-1 border-line rounded-[var(--radius-md)] border p-3">
          <dt className="text-text-2 text-sm">Racha</dt>
          <dd className="text-2xl" data-num data-testid="streak">
            {summary ? `${formatNumber(summary.streak.current)} d` : '…'}
          </dd>
        </div>
        <div className="bg-surface-1 border-line rounded-[var(--radius-md)] border p-3">
          <dt className="text-text-2 text-sm">Rango</dt>
          <dd className="text-lg">{summary?.rank.rank ?? '…'}</dd>
        </div>
      </dl>

      {next && (
        <Button onClick={() => onStart(next.id)} className="w-full">
          {progress[next.id] ? 'Continuar' : 'Abrir mercado'}: {next.title}
        </Button>
      )}

      <section aria-labelledby="unit-title" className="grid gap-2">
        <h2 id="unit-title" className="text-2xl">
          Nivel 0 · El dinero en el tiempo
        </h2>
        <ul className="grid gap-2">
          {lessons.map((l) => {
            const p = progress[l.id];
            return (
              <li
                key={l.id}
                className="bg-surface-1 border-line flex items-center justify-between gap-3 rounded-[var(--radius-md)] border p-3"
              >
                <span>
                  {l.title}
                  <span className="text-text-2 block text-sm">
                    {p?.status === 'completed'
                      ? `✓ completada · mejor precisión ${formatNumber(Math.round(p.bestAccuracy * 100))} %`
                      : p
                        ? 'empezada'
                        : 'sin empezar'}
                  </span>
                </span>
                <Button variant="secondary" onClick={() => onStart(l.id)}>
                  {p?.status === 'completed' ? 'Repetir' : 'Empezar'}
                </Button>
              </li>
            );
          })}
        </ul>
      </section>

      <p className="text-text-2 text-sm">Contenido educativo, no asesoramiento financiero.</p>
    </div>
  );
}
