import { useMemo } from 'react';
import type { AppData } from '../../app/hooks';
import { Button } from '../../components/Button';
import { ComingSoon, EmptyState, ErrorState, Loading } from '../../components/States';
import {
  allLessons,
  conceptGraph,
  conceptName,
  exerciseCatalog,
  levelName,
  unitsOfLevel,
} from '../../content/library';
import {
  MAX_REVIEW_CARDS,
  buildReview,
  conceptMastery,
  dueCards,
  nextReviewDay,
  projectCards,
  recentMistakes,
} from '../../engine/srs';
import { todayKey } from '../../engine/stats';
import { formatNumber } from '../../lib/format';

const go = (hash: string) => {
  window.location.hash = hash;
  window.scrollTo(0, 0);
};

const longDate = (key: string) =>
  new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(
    new Date(`${key}T12:00:00Z`),
  );

/** Practicar: Due diligence (repaso espaciado), práctica por tema, examen cronometrado y Mis errores. */
export function Practicar({ data, onStart }: { data: AppData; onStart: (id: string) => void }) {
  const today = todayKey(new Date());
  const view = useMemo(() => {
    const catalog = exerciseCatalog();
    const cards = projectCards(data.events);
    const mastery = conceptMastery(data.events);
    const due = dueCards(cards, { today, catalog });
    const planned = buildReview({ cards, catalog, mastery, graph: conceptGraph(), today });
    const upcoming = [...cards.values()]
      .filter((c) => catalog.some((e) => e.id === c.exerciseId) && nextReviewDay(c) > today)
      .map((c) => nextReviewDay(c))
      .sort()[0];
    return {
      dueCount: due.length,
      plannedCount: planned.length,
      reinforcing: planned.filter((p) => p.reason === 'refuerzo').length,
      upcoming,
      mistakes: recentMistakes(cards, catalog).length,
      topics: [...mastery.values()]
        .sort(
          (a, b) =>
            (a.mastery ?? 1.01) - (b.mastery ?? 1.01) || a.conceptId.localeCompare(b.conceptId),
        )
        .slice(0, 8),
    };
  }, [data.events, today]);

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
  const examUnits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    .flatMap((lv) => unitsOfLevel(lv).map((u) => ({ ...u, levelName: levelName(lv) })))
    .filter((u) => done.some((l) => `n${l.level}-u${l.unit}` === u.id));

  return (
    <div className="grid gap-8">
      <h1 className="text-3xl">Practicar</h1>

      <section
        aria-labelledby="dd-title"
        className="bg-surface-1 border-line grid gap-3 rounded-[var(--radius-md)] border p-4"
      >
        <h2 id="dd-title" className="text-2xl">
          Due diligence
        </h2>
        {view.plannedCount > 0 ? (
          <>
            <p data-testid="due-count">
              <span data-num>{formatNumber(view.plannedCount)}</span>{' '}
              {view.plannedCount === 1 ? 'tarjeta toca' : 'tarjetas tocan'} hoy
              {view.reinforcing > 0 && (
                <span className="text-text-2">
                  {' '}
                  (incluye <span data-num>{formatNumber(view.reinforcing)}</span> de refuerzo de
                  conceptos previos)
                </span>
              )}
              .
            </p>
            <Button className="justify-self-start" onClick={() => go('#/repaso')}>
              Empezar repaso
            </Button>
            <p className="text-text-2 text-sm">Máximo {MAX_REVIEW_CARDS} tarjetas por sesión.</p>
          </>
        ) : (
          <p className="text-text-2" data-testid="due-count">
            Nada vence hoy.
            {view.upcoming
              ? ` Lo próximo vuelve el ${longDate(view.upcoming)}.`
              : ' Cuando respondas ejercicios, los fallos y los aciertos volverán cuando toque.'}
          </p>
        )}
      </section>

      <section aria-labelledby="errors-title" className="grid gap-2">
        <h2 id="errors-title" className="text-2xl">
          Mis errores
        </h2>
        {view.mistakes > 0 ? (
          <>
            <p className="text-text-2">
              <span data-num>{formatNumber(view.mistakes)}</span>{' '}
              {view.mistakes === 1 ? 'ejercicio' : 'ejercicios'} donde tu último intento fue un
              fallo.
            </p>
            <Button
              variant="secondary"
              className="justify-self-start"
              onClick={() => go('#/repaso/errores')}
            >
              Repasar mis errores
            </Button>
          </>
        ) : (
          <EmptyState title="Sin errores pendientes">
            Los ejercicios que falles aparecerán aquí hasta que los aciertes.
          </EmptyState>
        )}
      </section>

      <section aria-labelledby="topic-title" className="grid gap-2">
        <h2 id="topic-title" className="text-2xl">
          Por tema
        </h2>
        {view.topics.length === 0 ? (
          <EmptyState title="Aún no hay temas practicados">
            Cuando completes lecciones, aquí verás tu dominio de cada concepto.
          </EmptyState>
        ) : (
          <ul className="grid gap-2">
            {view.topics.map((t) => (
              <li
                key={t.conceptId}
                className="bg-surface-1 border-line flex items-center justify-between gap-3 rounded-[var(--radius-md)] border p-3"
              >
                <span>
                  {conceptName(t.conceptId)}
                  <span className="text-text-2 block text-sm" data-num>
                    {t.mastery === null
                      ? 'Pocos datos aún'
                      : `Dominio ${formatNumber(Math.round(t.mastery * 100))} %`}
                    {t.struggling && ' · te cuesta'}
                  </span>
                </span>
                <Button
                  variant="secondary"
                  aria-label={`Practicar ${conceptName(t.conceptId)}`}
                  onClick={() => go(`#/repaso/tema/${t.conceptId}`)}
                >
                  Practicar
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="exam-title" className="grid gap-2">
        <h2 id="exam-title" className="text-2xl">
          Examen cronometrado
        </h2>
        {examUnits.length === 0 ? (
          <EmptyState title="Aún no hay unidades para examinar">
            Completa alguna lección y podrás hacer un examen de 10 preguntas en 10 minutos.
          </EmptyState>
        ) : (
          <ul className="grid gap-2">
            {examUnits.map((u) => (
              <li
                key={u.id}
                className="bg-surface-1 border-line flex items-center justify-between gap-3 rounded-[var(--radius-md)] border p-3"
              >
                <span>
                  {u.name}
                  <span className="text-text-2 block text-sm">{u.levelName}</span>
                </span>
                <Button
                  variant="secondary"
                  aria-label={`Examen de ${u.name}`}
                  onClick={() => go(`#/examen/${u.id}`)}
                >
                  Examen
                </Button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-text-2 text-sm">
          10 preguntas, 10 minutos, sin ver la solución hasta el final.
        </p>
      </section>

      <ComingSoon title="Minijuegos">
        <p>Juegos para entrenar cada concepto llegan en esta misma fase.</p>
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
