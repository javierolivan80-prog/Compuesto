import type { AppData } from '../../app/hooks';
import { Button } from '../../components/Button';
import { ComingSoon, EmptyState, ErrorState, Loading } from '../../components/States';
import { allLessons } from '../../content/library';
import { formatNumber } from '../../lib/format';

/** Practicar: el repaso espaciado y los juegos llegan en la Fase 2; mientras, se pueden repetir las lecciones hechas. */
export function Practicar({ data, onStart }: { data: AppData; onStart: (id: string) => void }) {
  if (data.loading) return <Loading />;
  if (data.error || !data.summary)
    return (
      <ErrorState
        message="no se pudo leer tu progreso en este dispositivo."
        onRetry={data.reload}
      />
    );
  const progress = data.summary.progress.lessons;
  const done = allLessons().filter((l) => progress[l.id]?.status === 'completed');
  return (
    <div className="grid gap-6">
      <h1 className="text-3xl">Practicar</h1>
      <ComingSoon title="Repaso espaciado y minijuegos">
        <p>
          Los fallos volverán cuando toque (Due diligence) y habrá juegos para entrenar cada
          concepto. Llegan en la Fase 2.
        </p>
      </ComingSoon>
      <section aria-labelledby="repeat-title" className="grid gap-2">
        <h2 id="repeat-title" className="text-2xl">
          Repetir una lección
        </h2>
        {done.length === 0 ? (
          <EmptyState title="Todavía no has completado ninguna lección">
            Cuando completes una, podrás repetirla aquí.
          </EmptyState>
        ) : (
          <ul className="grid gap-2">
            {done.map((l) => (
              <li
                key={l.id}
                className="bg-surface-1 border-line flex items-center justify-between gap-3 rounded-[var(--radius-md)] border p-3"
              >
                <span>
                  {l.title}
                  <span className="text-text-2 block text-sm" data-num>
                    Mejor precisión{' '}
                    {formatNumber(Math.round((progress[l.id]?.bestAccuracy ?? 0) * 100))} %
                  </span>
                </span>
                <Button variant="secondary" onClick={() => onStart(l.id)}>
                  Repetir
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
