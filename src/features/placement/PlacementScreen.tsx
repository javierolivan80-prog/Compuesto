import { useEffect, useRef, useState } from 'react';
import { Bolsin } from '../../brand/Bolsin';
import { Button } from '../../components/Button';
import { ProgressBar } from '../../components/ProgressBar';
import { ReportErrorButton } from '../../components/ReportErrorButton';
import type { Placement } from '../../content/schemas';
import { useRepo } from '../../db/RepoProvider';
import {
  PASS_PCT,
  QUESTIONS_PER_TEST,
  scorePlacement,
  type PlacementResult,
} from '../../engine/placement';
import { formatNumber } from '../../lib/format';
import { ExerciseRunner, promptOf, type ExerciseOutcome } from '../exercises/ExerciseRunner';

interface Props {
  bank: Placement;
  unitName: string;
  level: number;
  /** Texto del botón final (p. ej. "Siguiente unidad" dentro de "Saltar nivel"). */
  continueLabel?: string;
  onDone: (result: PlacementResult) => void;
  onExit: () => void;
  /** Al suspender: ir a estudiar la unidad. */
  onStudy?: () => void;
}

/**
 * Test de salto de una unidad (TEMARIO §5): 8 preguntas sin ayudas ni solución inmediata; ≥ 80 % domina la unidad.
 * Cada respuesta es un evento exercise_answered sin XP (no infla la racha); aprobar guarda unit_skipped.
 */
export function PlacementScreen({
  bank,
  unitName,
  level,
  continueLabel = 'Continuar',
  onDone,
  onExit,
  onStudy,
}: Props) {
  const repo = useRepo();
  const [phase, setPhase] = useState<'intro' | 'questions' | 'result'>('intro');
  const [index, setIndex] = useState(0);
  const [flags, setFlags] = useState<boolean[]>([]);
  const [result, setResult] = useState<PlacementResult | null>(null);
  const [saveError, setSaveError] = useState(false);
  const finished = useRef(false);

  useEffect(() => {
    finished.current = false;
  }, [bank.id]);

  const save = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e) {
      console.error('No se pudo guardar el test de salto', e);
      setSaveError(true);
    }
  };

  const onAnswered = async (o: ExerciseOutcome) => {
    const q = bank.questions[index]!;
    await save(() =>
      repo.record('exercise_answered', {
        exerciseId: q.id,
        lessonId: bank.id,
        conceptIds: q.concepts,
        correct: o.correct,
        timeMs: Math.min(o.timeMs, 3_600_000),
        xp: 0,
      }),
    );
    const next = [...flags, o.correct];
    setFlags(next);
    if (index + 1 < bank.questions.length) {
      setIndex(index + 1);
      return;
    }
    if (finished.current) return;
    finished.current = true;
    const r = scorePlacement(next, bank.questions.length);
    if (r.passed)
      await save(() =>
        repo.record('unit_skipped', { unitId: bank.unitId, level, scorePct: r.pct }),
      );
    setResult(r);
    setPhase('result');
  };

  const header = (
    <header className="flex items-center justify-between gap-3">
      <p className="text-text-2 text-sm">Test de salto · {unitName}</p>
      <Button variant="ghost" onClick={onExit}>
        Salir
      </Button>
    </header>
  );

  if (phase === 'intro')
    return (
      <section aria-label={`Test de salto: ${unitName}`} className="grid gap-5">
        {header}
        <h2 className="text-3xl">Test de salto</h2>
        <p>
          <strong>{unitName}</strong>
        </p>
        <p className="text-text-2">
          {QUESTIONS_PER_TEST} preguntas, sin pistas y sin ver la solución hasta el final. Si
          aciertas al menos el {PASS_PCT} % ({Math.ceil((PASS_PCT / 100) * QUESTIONS_PER_TEST)} de{' '}
          {QUESTIONS_PER_TEST}), la unidad queda dominada y sus conceptos pasan al repaso como
          vistos.
        </p>
        <Button onClick={() => setPhase('questions')}>Empezar el test</Button>
      </section>
    );

  if (phase === 'result' && result) {
    return (
      <section
        aria-label="Resultado del test de salto"
        className="grid justify-items-center gap-5 text-center"
      >
        <Bolsin state={result.passed ? 'celebrando' : 'animo'} size={110} />
        <h2 className="text-4xl">{result.passed ? 'Unidad dominada' : 'Todavía no'}</h2>
        <p className="text-xl" data-num data-testid="placement-score">
          {formatNumber(result.correct)} de {formatNumber(result.total)} ·{' '}
          {formatNumber(Math.round(result.pct))} %
        </p>
        <p className="text-text-2 max-w-sm">
          {result.passed
            ? `${unitName} queda saltada y sus conceptos cuentan como vistos para el repaso.`
            : `Necesitas el ${PASS_PCT} % para saltarla. Haz la unidad con normalidad: así aprenderás lo que falló.`}
        </p>
        {saveError && (
          <p role="alert" className="text-bear text-sm">
            Error: no se pudo guardar el resultado en este dispositivo.
          </p>
        )}
        <div className="grid w-full max-w-sm gap-2">
          <Button onClick={() => onDone(result)}>{continueLabel}</Button>
          {!result.passed && onStudy && (
            <Button variant="secondary" onClick={onStudy}>
              Estudiar la unidad
            </Button>
          )}
        </div>
      </section>
    );
  }

  const q = bank.questions[index]!;
  return (
    <section aria-label={`Test de salto: ${unitName}`} className="grid gap-4">
      {header}
      <ProgressBar
        value={index}
        max={bank.questions.length}
        label={`Pregunta ${index + 1} de ${bank.questions.length}`}
      />
      <p className="text-text-2 text-sm" data-num>
        Pregunta {index + 1} de {bank.questions.length}
      </p>
      <ExerciseRunner
        key={q.id}
        exercise={q}
        showFeedback={false}
        checkLabel="Siguiente"
        onComplete={(o) => void onAnswered(o)}
      />
      <span className="sr-only">{promptOf(q)}</span>
      <ReportErrorButton exerciseId={q.id} />
    </section>
  );
}
