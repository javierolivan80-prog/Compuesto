import { Button } from '../../../components/Button';
import { Glow } from './Glow';

/**
 * Un paso de pregunta de una lección-juego: opciones como radios y, tras responder, la explicación (✓ o ✗) con el
 * botón para seguir. La partida decide qué es correcto y qué efectos dispara al elegir (`onPick`).
 */
export function AskStep<V extends string | number | boolean>({
  question,
  options,
  chosen,
  right,
  why,
  nextLabel,
  glow,
  testId,
  onPick,
  onNext,
}: {
  question: string;
  options: { value: V; label: string }[];
  chosen: V | undefined;
  right: V;
  why: string;
  nextLabel: string;
  glow: number;
  testId: string;
  onPick: (v: V) => void;
  onNext: () => void;
}) {
  if (chosen === undefined)
    return (
      <div role="radiogroup" aria-label={question} className="grid gap-2">
        <p className="font-medium">{question}</p>
        {options.map((o) => (
          <Button
            key={String(o.value)}
            role="radio"
            aria-checked={false}
            variant="secondary"
            className="justify-start text-left"
            onClick={() => onPick(o.value)}
          >
            {o.label}
          </Button>
        ))}
      </div>
    );
  return (
    <Glow pulse={glow} className="rounded-[var(--radius-md)]">
      <div className="grid gap-3 p-1">
        <p
          role="status"
          className={chosen === right ? 'text-bull' : 'text-bear'}
          data-testid={testId}
        >
          {chosen === right ? '✓ ' : '✗ '}
          {why}
        </p>
        <Button onClick={onNext}>{nextLabel}</Button>
      </div>
    </Glow>
  );
}
