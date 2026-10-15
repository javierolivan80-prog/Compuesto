import type { ReactNode } from 'react';

export type ExerciseCardState = 'idle' | 'selected' | 'correct' | 'incorrect' | 'disabled';

const STYLES: Record<ExerciseCardState, string> = {
  idle: 'border-line bg-surface-1',
  selected: 'border-brand bg-surface-2',
  correct: 'border-bull bg-surface-1',
  incorrect: 'border-bear bg-surface-1',
  disabled: 'border-line bg-surface-1 opacity-50',
};

/** Texto que acompaña al color: el estado nunca se transmite solo con él. */
const BADGE: Partial<Record<ExerciseCardState, { text: string; tone: string }>> = {
  correct: { text: '✓ Correcta', tone: 'text-bull' },
  incorrect: { text: '✗ Incorrecta', tone: 'text-bear' },
};

interface ExerciseCardProps {
  state: ExerciseCardState;
  children: ReactNode;
  onSelect?: () => void;
  /** Selección múltiple: role checkbox en vez de radio. */
  multi?: boolean;
}

export function ExerciseCard({ state, children, onSelect, multi = false }: ExerciseCardProps) {
  const badge = BADGE[state];
  const checked = state === 'selected' || state === 'correct' || state === 'incorrect';
  return (
    <button
      type="button"
      role={multi ? 'checkbox' : 'radio'}
      aria-checked={checked}
      disabled={state === 'disabled'}
      onClick={onSelect}
      data-state={state}
      className={`flex min-h-14 w-full cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-md)] border-2 px-4 py-3 text-left text-base transition-[transform,border-color] duration-[120ms] ease-[var(--ease-out)] active:scale-[0.97] disabled:cursor-not-allowed disabled:active:scale-100 ${STYLES[state]} ${state === 'incorrect' ? 'shake' : ''}`}
    >
      <span>{children}</span>
      {badge && <span className={`text-sm font-medium ${badge.tone}`}>{badge.text}</span>}
    </button>
  );
}
