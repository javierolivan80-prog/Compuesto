import { useEffect, useRef, useState } from 'react';
import { Bolsin } from '../../brand/Bolsin';
import { Button } from '../../components/Button';
import { ProgressBar } from '../../components/ProgressBar';
import { ReportErrorButton } from '../../components/ReportErrorButton';
import type { Placement } from '../../content/schemas';
import { useRepo } from '../../db/RepoProvider';
import {
  firstPhaseDecision,
  PASS_FIRST,
  PASS_SECOND,
  phaseQuestions,
  QUESTIONS_PER_TEST,
  scorePlacement,
  SECOND_PHASE_AT,
  SECOND_PHASE_QUESTIONS,
  SKIP_CHECK_DAYS,
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
 * Test de salto de una unidad en dos fases (TEMARIO §5, tarea 2.12): 8 preguntas sin ayudas ni solución inmediata;
 * 7 u 8 aciertos dominan la unidad, y con 6 se ofrecen 4 más en las que hacen falta 3.
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
  const [phase, setPhase] = useState<'intro' | 'questions' | 'bridge' | 'result'>('intro');
  const [stage, setStage] = useState<1 | 2>(1);
  const [index, setIndex] = useState(0);
  const [flags, setFlags] = useState<boolean[]>([]);
  const [first, setFirst] = useState<boolean[]>([]);
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

  const questions = phaseQuestions(bank.questions, stage);

  const finish = async (r: PlacementResult) => {
    if (finished.current) return;
    finished.current = true;
    if (r.passed) {
      const answered = r.total + (r.second?.total ?? 0);
      const right = r.correct + (r.second?.correct ?? 0);
      await save(() =>
        repo.record('unit_skipped', {
          unitId: bank.unitId,
          level,
          scorePct: (right / answered) * 100,
        }),
      );
    }
    setResult(r);
    setPhase('result');
  };

  const onAnswered = async (o: ExerciseOutcome) => {
    const q = questions[index]!;
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
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      return;
    }
    if (stage === 2) {
      await finish(scorePlacement(first, QUESTIONS_PER_TEST, next));
      return;
    }
    const correct = next.filter(Boolean).length;
    if (firstPhaseDecision(correct, bank.questions.length) === 'segunda-fase') {
      setFirst(next);
      setPhase('bridge');
      return;
    }
    await finish(scorePlacement(next, QUESTIONS_PER_TEST));
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
          {`${QUESTIONS_PER_TEST} preguntas, sin pistas y sin ver la solución hasta el final. Con ${PASS_FIRST} u ${QUESTIONS_PER_TEST} aciertos, la unidad queda dominada`}
          {bank.questions.length > QUESTIONS_PER_TEST
            ? `; con ${SECOND_PHASE_AT}, te propondremos ${SECOND_PHASE_QUESTIONS} preguntas más y necesitarás ${PASS_SECOND}.`
            : '.'}
          {` Lo que saltes se comprobará en el repaso dentro de ${SKIP_CHECK_DAYS} días.`}
        </p>
        <Button onClick={() => setPhase('questions')}>Empezar el test</Button>
      </section>
    );

  if (phase === 'bridge')
    return (
      <section aria-label="Segunda fase del test de salto" className="grid gap-5">
        {header}
        <h2 className="text-3xl">Casi</h2>
        <p data-num data-testid="placement-first">
          {`${formatNumber(SECOND_PHASE_AT)} de ${formatNumber(QUESTIONS_PER_TEST)} aciertos. Para decidir, ${SECOND_PHASE_QUESTIONS} preguntas más que no has visto: con ${PASS_SECOND} aciertos, la unidad queda dominada.`}
        </p>
        <Button
          onClick={() => {
            setStage(2);
            setIndex(0);
            setFlags([]);
            setPhase('questions');
          }}
        >
          Seguir con la segunda fase
        </Button>
        <Button
          variant="secondary"
          onClick={() => void finish(scorePlacement(first, QUESTIONS_PER_TEST))}
        >
          Prefiero estudiar la unidad
        </Button>
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
        {result.second && (
          <p className="text-text-2" data-num data-testid="placement-second">
            {`Segunda fase: ${formatNumber(result.second.correct)} de ${formatNumber(result.second.total)}`}
          </p>
        )}
        <p className="text-text-2 max-w-sm">
          {result.passed
            ? `${unitName} queda saltada. Dentro de ${SKIP_CHECK_DAYS} días el repaso comprobará lo que sabías.`
            : `Para saltarla necesitas ${PASS_FIRST} de ${QUESTIONS_PER_TEST}, o ${SECOND_PHASE_AT} y después ${PASS_SECOND} de ${SECOND_PHASE_QUESTIONS}. Haz la unidad con normalidad: así aprenderás lo que falló.`}
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

  const q = questions[index]!;
  return (
    <section aria-label={`Test de salto: ${unitName}`} className="grid gap-4">
      {header}
      <ProgressBar
        value={index}
        max={questions.length}
        label={`Pregunta ${index + 1} de ${questions.length}`}
      />
      <p className="text-text-2 text-sm" data-num>
        {stage === 2 && 'Segunda fase · '}
        Pregunta {index + 1} de {questions.length}
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
