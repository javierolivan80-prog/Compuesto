import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/Button';
import { ProgressBar } from '../../components/ProgressBar';
import { ReportErrorButton } from '../../components/ReportErrorButton';
import { EmptyState } from '../../components/States';
import { getExerciseById } from '../../content/library';
import { useRepo } from '../../db/RepoProvider';
import type { ReviewItem } from '../../engine/srs';
import { formatNumber } from '../../lib/format';
import {
  promptOf,
  ExerciseRunner,
  isSupported,
  type ExerciseOutcome,
} from '../exercises/ExerciseRunner';

/** XP de un acierto en repaso: la mitad que en una lección nueva, y sin bonus de cierre (CLAUDE.md §8). */
export const REVIEW_XP = 5;

interface Props {
  title: string;
  items: ReviewItem[];
  /** Examen cronometrado: minutos totales y sin feedback hasta el final. */
  exam?: { minutes: number };
  onExit: () => void;
  /** Dentro de una sesión: el final del bloque sigue la sesión en vez de volver a Practicar. */
  onFinish?: () => void;
  finishLabel?: string;
}

interface Missed {
  prompt: string;
  lesson: string;
}

const mmss = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

/** Repaso, práctica por tema, Mis errores y examen: una lista fija de ejercicios con guardado de cada respuesta. */
export function ReviewScreen({ title, items, exam, onExit, onFinish, finishLabel }: Props) {
  const repo = useRepo();
  const playable = useMemo(
    () =>
      items
        .map((it) => ({ it, found: getExerciseById(it.exerciseId) }))
        .filter((x) => x.found && isSupported(x.found.exercise)),
    [items],
  );
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [xp, setXp] = useState(0);
  const [missed, setMissed] = useState<Missed[]>([]);
  const [saveError, setSaveError] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(exam ? exam.minutes * 60 : 0);
  const [timeUp, setTimeUp] = useState(false);
  const [answered, setAnswered] = useState(0);

  useEffect(() => {
    if (!exam) return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.clearInterval(id);
          setTimeUp(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [exam]);

  const total = playable.length;
  const finished = index >= total || timeUp;

  const onComplete = async (outcome: ExerciseOutcome) => {
    const current = playable[index];
    if (!current?.found) return;
    const { exercise, lesson } = current.found;
    const gained = outcome.correct ? Math.round(REVIEW_XP * outcome.xpFactor) : 0;
    setAnswered((n) => n + 1);
    if (outcome.correct) {
      setCorrect((c) => c + 1);
      setXp((x) => x + gained);
    } else {
      setMissed((m) => [...m, { prompt: promptOf(exercise), lesson: lesson.title }]);
    }
    try {
      await repo.record('exercise_answered', {
        exerciseId: exercise.id,
        lessonId: lesson.id,
        conceptIds: exercise.concepts,
        correct: outcome.correct,
        timeMs: Math.min(outcome.timeMs, 3_600_000),
        xp: gained,
        source: 'review',
      });
    } catch (e) {
      console.error('No se pudo guardar el repaso', e);
      setSaveError(true);
    }
    setIndex((i) => i + 1);
  };

  if (total === 0)
    return (
      <section className="grid gap-4" aria-labelledby="rv-title">
        <h1 id="rv-title" className="text-3xl">
          {title}
        </h1>
        <EmptyState title="No hay ejercicios para esto todavía">
          Completa alguna lección y vuelve.
        </EmptyState>
        <Button onClick={onExit} className="justify-self-start">
          Volver a Practicar
        </Button>
      </section>
    );

  if (finished) {
    const done = answered;
    return (
      <section className="grid gap-4" aria-labelledby="rv-end">
        <h1 id="rv-end" className="text-3xl">
          {exam ? 'Examen terminado' : 'Repaso completado'}
        </h1>
        {timeUp && index < total && <p className="text-text-2">Se acabó el tiempo.</p>}
        <p data-testid="review-score" className="text-2xl" data-num>
          {formatNumber(correct)} de {formatNumber(done)} aciertos
        </p>
        <p className="text-text-2" data-num data-testid="review-xp">
          +{formatNumber(xp)} XP
        </p>
        {saveError && (
          <p role="alert" className="text-bear text-sm">
            Error: no se pudo guardar parte del repaso en este dispositivo.
          </p>
        )}
        {missed.length > 0 && (
          <section aria-labelledby="rv-missed" className="grid gap-2">
            <h2 id="rv-missed" className="text-xl">
              Para repasar
            </h2>
            <ul className="grid gap-2">
              {missed.map((m, i) => (
                <li
                  key={i}
                  className="bg-surface-1 border-line rounded-[var(--radius-md)] border p-3 text-sm"
                >
                  {m.prompt}
                  <span className="text-text-2 block">{m.lesson}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <Button onClick={onFinish ?? onExit} className="justify-self-start">
          {finishLabel ?? 'Volver a Practicar'}
        </Button>
      </section>
    );
  }

  const current = playable[index]!;
  const { exercise } = current.found!;
  return (
    <section className="grid gap-6" aria-labelledby="rv-title">
      <header className="flex items-center justify-between gap-3">
        <h1 id="rv-title" className="text-text-2 text-sm">
          {title} · <span data-num>{index + 1}</span> de <span data-num>{total}</span>
        </h1>
        <div className="flex items-center gap-3">
          {exam && (
            <span data-num data-testid="exam-timer" className="text-sm">
              <span className="sr-only">Tiempo restante </span>
              {mmss(secondsLeft)}
            </span>
          )}
          <Button variant="ghost" onClick={onExit}>
            Salir
          </Button>
        </div>
      </header>
      <ProgressBar value={index} max={total} label="Progreso del repaso" />
      <ExerciseRunner
        key={exercise.id}
        exercise={exercise}
        xp={REVIEW_XP}
        showFeedback={!exam}
        checkLabel={exam ? 'Responder' : 'Comprobar'}
        onComplete={(o) => void onComplete(o)}
      />
      {!exam && <ReportErrorButton exerciseId={exercise.id} />}
    </section>
  );
}
