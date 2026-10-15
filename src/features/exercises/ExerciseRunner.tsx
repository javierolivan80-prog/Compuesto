import { useId, useState, type FormEvent } from 'react';
import { Button } from '../../components/Button';
import { FeedbackSheet } from '../../components/FeedbackSheet';
import type { Exercise } from '../../content/schemas';
import {
  feedbackText,
  grade,
  isEmptyAnswer,
  type Answer,
  type GradeResult,
} from '../../engine/grading';
import { parseNumber } from '../../engine/number-parse';
import { BuildStatementView, SpreadsheetView } from './AdvancedViews';
import {
  CategorizeView,
  FillBlankView,
  MatchPairsView,
  MultipleChoiceView,
  MultiSelectView,
  NumericInputView,
  OrderStepsView,
  TrueFalseView,
  initialOrder,
} from './views';

export const SUPPORTED_TYPES = [
  'multiple_choice',
  'multi_select',
  'true_false_swipe',
  'match_pairs',
  'fill_blank',
  'order_steps',
  'numeric_input',
  'categorize',
  'build_statement',
  'spreadsheet',
] as const;

export function isSupported(e: Exercise): boolean {
  return (SUPPORTED_TYPES as readonly string[]).includes(e.type);
}

export function promptOf(e: Exercise): string {
  if (e.type === 'true_false_swipe') return 'Verdadero o falso';
  return 'prompt' in e ? e.prompt : '';
}

export function emptyAnswer(e: Exercise): Answer {
  switch (e.type) {
    case 'multiple_choice':
      return { type: 'multiple_choice', choice: null };
    case 'multi_select':
      return { type: 'multi_select', choices: [] };
    case 'true_false_swipe':
      return { type: 'true_false_swipe', value: null };
    case 'match_pairs':
      return { type: 'match_pairs', pairs: {} };
    case 'fill_blank':
      return { type: 'fill_blank', values: e.answers.map(() => '') };
    case 'order_steps':
      return { type: 'order_steps', order: initialOrder(e) };
    case 'numeric_input':
      return { type: 'numeric_input', text: '', locale: 'es' };
    case 'categorize':
      return { type: 'categorize', assignments: {} };
    case 'build_statement':
      return { type: 'build_statement', values: {}, locale: 'es' };
    case 'spreadsheet':
      return { type: 'spreadsheet', cells: {} };
    default:
      throw new Error(`Tipo sin componente todavía: ${e.type}`);
  }
}

export interface ExerciseOutcome {
  correct: boolean;
  answer: Answer;
  grade: GradeResult;
  timeMs: number;
}

interface Props {
  exercise: Exercise;
  /** Se llama al pulsar "Continuar" en la hoja de feedback. */
  onComplete: (outcome: ExerciseOutcome) => void;
  xp?: number;
  /** false = modo examen: al comprobar se pasa directamente a la siguiente, sin revelar la solución. */
  showFeedback?: boolean;
  /** Texto del botón de comprobar (por defecto "Comprobar"). */
  checkLabel?: string;
}

/** Ejercicio completo: respuesta → Comprobar → hoja de feedback → Continuar. Enter comprueba. */
export function ExerciseRunner({
  exercise,
  onComplete,
  xp = 10,
  showFeedback = true,
  checkLabel = 'Comprobar',
}: Props) {
  const titleId = useId();
  const [answer, setAnswer] = useState<Answer>(() => emptyAnswer(exercise));
  const [result, setResult] = useState<GradeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startedAt] = useState(() => Date.now());

  const empty = isEmptyAnswer(answer);

  const check = (e?: FormEvent) => {
    e?.preventDefault();
    if (result || empty) return;
    if (
      answer.type === 'numeric_input' &&
      parseNumber(answer.text, answer.locale ?? 'es') === null
    ) {
      setError('Escribe un número, por ejemplo 1.234,5 o 1234.5.');
      return;
    }
    setError(null);
    const graded = grade(exercise, answer);
    if (!showFeedback) {
      onComplete({
        correct: graded.correct,
        answer,
        grade: graded,
        timeMs: Date.now() - startedAt,
      });
      return;
    }
    setResult(graded);
  };

  const common = {
    exercise,
    result,
    labelledBy: titleId,
    value: answer,
    onChange: setAnswer,
  } as never;
  const view = (() => {
    switch (exercise.type) {
      case 'multiple_choice':
        return (
          <MultipleChoiceView {...(common as object as Parameters<typeof MultipleChoiceView>[0])} />
        );
      case 'multi_select':
        return <MultiSelectView {...(common as object as Parameters<typeof MultiSelectView>[0])} />;
      case 'true_false_swipe':
        return <TrueFalseView {...(common as object as Parameters<typeof TrueFalseView>[0])} />;
      case 'match_pairs':
        return <MatchPairsView {...(common as object as Parameters<typeof MatchPairsView>[0])} />;
      case 'fill_blank':
        return <FillBlankView {...(common as object as Parameters<typeof FillBlankView>[0])} />;
      case 'order_steps':
        return <OrderStepsView {...(common as object as Parameters<typeof OrderStepsView>[0])} />;
      case 'numeric_input':
        return (
          <NumericInputView {...(common as object as Parameters<typeof NumericInputView>[0])} />
        );
      case 'categorize':
        return <CategorizeView {...(common as object as Parameters<typeof CategorizeView>[0])} />;
      case 'build_statement':
        return (
          <BuildStatementView {...(common as object as Parameters<typeof BuildStatementView>[0])} />
        );
      case 'spreadsheet':
        return <SpreadsheetView {...(common as object as Parameters<typeof SpreadsheetView>[0])} />;
      default:
        return <p>Tipo de ejercicio no disponible todavía: {exercise.type}</p>;
    }
  })();

  return (
    <form onSubmit={check} className="grid gap-5" aria-labelledby={titleId} noValidate>
      <h3 id={titleId} className="text-2xl leading-snug">
        {promptOf(exercise)}
      </h3>
      {view}
      {error && (
        <p role="alert" className="text-bear text-sm">
          Error: {error}
        </p>
      )}
      {result ? (
        <FeedbackSheet
          result={result.correct ? 'correct' : 'incorrect'}
          xp={xp}
          explanation={feedbackText(exercise, result)}
          onContinue={() =>
            onComplete({
              correct: result.correct,
              answer,
              grade: result,
              timeMs: Date.now() - startedAt,
            })
          }
        />
      ) : (
        <div className="bg-bg sticky bottom-0 py-3">
          <Button type="submit" disabled={empty} className="w-full">
            {checkLabel}
          </Button>
        </div>
      )}
    </form>
  );
}
