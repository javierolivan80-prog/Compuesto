import { Check, Lock } from 'lucide-react';
import type { AppData } from '../../app/hooks';
import { Button } from '../../components/Button';
import { ErrorState, Loading } from '../../components/States';
import { getPlacement, lessonsOfUnit, levelName, unitsOfLevel } from '../../content/library';
import { RANKS } from '../../engine/projections';

const FLOORS = Array.from({ length: 11 }, (_, i) => 10 - i);

type UnitState = 'completada' | 'en curso' | 'disponible' | 'proximamente';

interface Props {
  data: AppData;
  onStart: (lessonId: string) => void;
  onSkipUnit: (unitId: string) => void;
  onSkipLevel: (level: number) => void;
}

/** El Camino como edificio de Albufera Partners (variante A de la tarea 0.6): una planta por nivel, la más alta arriba. */
export function Camino({ data, onStart, onSkipUnit, onSkipLevel }: Props) {
  if (data.loading) return <Loading />;
  if (data.error || !data.summary)
    return (
      <ErrorState
        message="no se pudo leer tu progreso en este dispositivo."
        onRetry={data.reload}
      />
    );
  const progress = data.summary.progress;
  const skipped = new Set(progress.skippedUnits);

  const unitState = (level: number, unitNo: number, unitId: string): UnitState => {
    const ls = lessonsOfUnit(level, unitNo);
    if (skipped.has(unitId)) return 'completada';
    if (!ls.length) return 'proximamente';
    const done = ls.filter((l) => progress.lessons[l.id]?.status === 'completed').length;
    if (done === ls.length) return 'completada';
    return done > 0 || ls.some((l) => progress.lessons[l.id]) ? 'en curso' : 'disponible';
  };

  return (
    <div className="grid gap-4">
      <h1 className="text-3xl">Camino</h1>
      <p className="text-text-2 text-sm">
        Las plantas de Albufera Partners, de la recepción al despacho de socios.
      </p>
      <ol aria-label="Edificio de Albufera Partners" className="grid gap-2">
        {FLOORS.map((level) => {
          const units = unitsOfLevel(level);
          const states = units.map((u) => unitState(level, Number(u.id.split('-u')[1]), u.id));
          const hasContent = states.some((s) => s !== 'proximamente');
          const allDone = units.length > 0 && states.every((s) => s === 'completada');
          const rank = RANKS[Math.min(level, RANKS.length - 1)]!.name;
          const status = allDone
            ? '✓ completada'
            : states.some((s) => s === 'en curso' || s === 'completada')
              ? '▶ en curso'
              : hasContent
                ? 'disponible'
                : 'próximamente';
          const current = data.summary!.rank.floor === level;
          return (
            <li
              key={level}
              aria-current={current ? 'step' : undefined}
              className={`rounded-[var(--radius-md)] border ${current ? 'border-brand bg-surface-2' : 'border-line bg-surface-1'}`}
            >
              <details open={level <= 1}>
                <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-3 px-4 py-2">
                  <span>
                    <span data-num className="mr-3">
                      P{level}
                    </span>
                    {levelTitle(level)}
                    <span className="text-text-2 block text-sm">
                      {level === 10 ? 'Examen final del año' : rank}
                    </span>
                  </span>
                  <span className="text-text-2 flex items-center gap-1 text-sm">
                    {allDone ? (
                      <Check aria-hidden size={16} />
                    ) : !hasContent ? (
                      <Lock aria-hidden size={16} />
                    ) : null}
                    {status}
                  </span>
                </summary>
                <div className="grid gap-2 px-4 pb-4">
                  {units.length === 0 && (
                    <p className="text-text-2 text-sm">
                      Próximamente: esta planta se construye en una fase posterior.
                    </p>
                  )}
                  {units.map((u, i) => {
                    const st = states[i]!;
                    const ls = lessonsOfUnit(level, Number(u.id.split('-u')[1]));
                    const next =
                      ls.find((l) => progress.lessons[l.id]?.status !== 'completed') ?? ls[0];
                    const hasTest = !!getPlacement(u.id);
                    return (
                      <div
                        key={u.id}
                        className="border-line grid gap-2 rounded-[var(--radius-sm)] border p-3"
                      >
                        <p>
                          {u.name}
                          <span className="text-text-2 block text-sm">
                            {st === 'completada'
                              ? skipped.has(u.id)
                                ? '✓ Dominada por test de salto'
                                : '✓ Completada'
                              : st === 'en curso'
                                ? '▶ En curso'
                                : st === 'disponible'
                                  ? 'Disponible'
                                  : 'Próximamente: las lecciones llegan en una fase posterior'}
                          </span>
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {next && st !== 'proximamente' && (
                            <Button variant="secondary" onClick={() => onStart(next.id)}>
                              {st === 'completada'
                                ? 'Repetir'
                                : st === 'en curso'
                                  ? 'Continuar'
                                  : 'Empezar'}
                            </Button>
                          )}
                          {hasTest && (
                            <Button
                              variant="ghost"
                              disabled={skipped.has(u.id)}
                              onClick={() => onSkipUnit(u.id)}
                            >
                              Test de salto
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {units.some((u) => getPlacement(u.id)) && (
                    <Button
                      variant="ghost"
                      onClick={() => onSkipLevel(level)}
                      className="justify-self-start"
                    >
                      Saltar el Nivel {level}
                    </Button>
                  )}
                </div>
              </details>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

const levelTitle = (level: number) => levelName(level);
