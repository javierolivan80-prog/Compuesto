import type { ReactNode } from 'react';
import { Button } from './Button';
import { ExerciseCard, type ExerciseCardState } from './ExerciseCard';

export interface PromptOption {
  id: string;
  label: ReactNode;
  state: ExerciseCardState;
}

interface Props {
  topic: string;
  question: string;
  options: PromptOption[];
  onSelect: (id: string) => void;
  onCheck: () => void;
  checkDisabled?: boolean;
}

/** Tarjeta de ejercicio (variante B elegida en 0.6): tema, pregunta en serif grande, opciones como píldoras. */
export function ExercisePrompt({
  topic,
  question,
  options,
  onSelect,
  onCheck,
  checkDisabled,
}: Props) {
  return (
    <article className="bg-surface-1 grid gap-5 rounded-[var(--radius-md)] p-6">
      <p className="text-text-2 text-sm">{topic}</p>
      <h3 className="text-3xl leading-tight">{question}</h3>
      <div role="radiogroup" aria-label="Opciones de respuesta" className="grid gap-2">
        {options.map((o) => (
          <ExerciseCard key={o.id} state={o.state} onSelect={() => onSelect(o.id)}>
            {o.label}
          </ExerciseCard>
        ))}
      </div>
      <Button onClick={onCheck} disabled={checkDisabled}>
        Comprobar
      </Button>
    </article>
  );
}
