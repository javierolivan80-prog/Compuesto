import { Reorder, motion, useReducedMotion } from 'motion/react';
import { useId, useState, type ReactNode } from 'react';
import { ExerciseCard, type ExerciseCardState } from '../../components/ExerciseCard';
import { formatPlain } from '../../lib/format';
import { seededShuffle, shuffledOrder, type Answer, type GradeResult } from '../../engine/grading';
import type { Exercise } from '../../content/schemas';

/* Un componente por tipo. Todos son controlados: el Runner guarda la respuesta y comprueba. */

type Of<T extends Exercise['type']> = Extract<Exercise, { type: T }>;
type A<T extends Answer['type']> = Extract<Answer, { type: T }>;

export interface ViewProps<E extends Exercise, T extends Answer['type']> {
  exercise: E;
  value: A<T>;
  onChange: (a: A<T>) => void;
  /** Tras comprobar: solo lectura y colores de acierto/fallo. */
  result: GradeResult | null;
  labelledBy: string;
}

const locked = (r: GradeResult | null) => r !== null;

function optionState(
  selected: boolean,
  result: GradeResult | null,
  isCorrect: boolean,
): ExerciseCardState {
  if (!result) return selected ? 'selected' : 'idle';
  if (isCorrect) return 'correct';
  return selected ? 'incorrect' : 'disabled';
}

/* ---------- multiple_choice / multi_select ---------- */

/** Orden de presentación de las opciones: barajado y estable por ejercicio, para que la correcta no sea siempre la primera. */
export const optionOrder = (e: { id: string; options: readonly string[] }): number[] =>
  seededShuffle(
    e.options.map((_, i) => i),
    e.id,
  );

export function MultipleChoiceView({
  exercise,
  value,
  onChange,
  result,
  labelledBy,
}: ViewProps<Of<'multiple_choice'>, 'multiple_choice'>) {
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className="grid gap-2">
      {optionOrder(exercise).map((i) => (
        <ExerciseCard
          key={i}
          state={optionState(value.choice === i, result, i === exercise.answer)}
          onSelect={
            locked(result) ? undefined : () => onChange({ type: 'multiple_choice', choice: i })
          }
        >
          {exercise.options[i]}
        </ExerciseCard>
      ))}
    </div>
  );
}

export function MultiSelectView({
  exercise,
  value,
  onChange,
  result,
  labelledBy,
}: ViewProps<Of<'multi_select'>, 'multi_select'>) {
  const toggle = (i: number) => {
    const has = value.choices.includes(i);
    onChange({
      type: 'multi_select',
      choices: has ? value.choices.filter((c) => c !== i) : [...value.choices, i],
    });
  };
  return (
    <div role="group" aria-labelledby={labelledBy} className="grid gap-2">
      <p className="text-text-2 text-sm">Elige todas las que correspondan.</p>
      {optionOrder(exercise).map((i) => (
        <ExerciseCard
          key={i}
          multi
          state={optionState(value.choices.includes(i), result, exercise.answers.includes(i))}
          onSelect={locked(result) ? undefined : () => toggle(i)}
        >
          {exercise.options[i]}
        </ExerciseCard>
      ))}
    </div>
  );
}

/* ---------- true_false_swipe (deslizar o botones) ---------- */

export function TrueFalseView({
  exercise,
  value,
  onChange,
  result,
  labelledBy,
}: ViewProps<Of<'true_false_swipe'>, 'true_false_swipe'>) {
  const reduced = useReducedMotion();
  const set = (v: boolean) => !locked(result) && onChange({ type: 'true_false_swipe', value: v });
  return (
    <div className="grid gap-3">
      <motion.p
        id={`${labelledBy}-statement`}
        drag={reduced || locked(result) ? false : 'x'}
        dragSnapToOrigin
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={(_, info) => {
          if (info.offset.x > 80) set(true);
          else if (info.offset.x < -80) set(false);
        }}
        className="bg-surface-2 border-line rounded-[var(--radius-md)] border p-5 text-xl"
      >
        {exercise.statement}
      </motion.p>
      <p className="text-text-2 text-sm">
        Desliza a la derecha (verdadero) o a la izquierda (falso), o usa los botones.
      </p>
      <div role="radiogroup" aria-labelledby={labelledBy} className="grid grid-cols-2 gap-2">
        {[
          [false, 'Falso'],
          [true, 'Verdadero'],
        ].map(([v, label]) => (
          <ExerciseCard
            key={String(v)}
            state={optionState(value.value === v, result, exercise.answer === v)}
            onSelect={locked(result) ? undefined : () => set(v as boolean)}
          >
            {label as string}
          </ExerciseCard>
        ))}
      </div>
    </div>
  );
}

/* ---------- match_pairs (tocar uno y su pareja) ---------- */

export function MatchPairsView({
  exercise,
  value,
  onChange,
  result,
  labelledBy,
}: ViewProps<Of<'match_pairs'>, 'match_pairs'>) {
  const [selected, setSelected] = useState<string | null>(null);
  const rights = seededShuffle(
    exercise.pairs.map((p) => p.right),
    exercise.id,
  );
  const usedBy = (right: string) => Object.entries(value.pairs).find(([, r]) => r === right)?.[0];

  const clickLeft = (left: string) => {
    if (locked(result)) return;
    if (value.pairs[left]) {
      const { [left]: _removed, ...rest } = value.pairs;
      void _removed;
      onChange({ type: 'match_pairs', pairs: rest });
      setSelected(null);
    } else setSelected(selected === left ? null : left);
  };
  const clickRight = (right: string) => {
    if (locked(result) || !selected) return;
    const next = { ...value.pairs };
    const owner = usedBy(right);
    if (owner) delete next[owner];
    next[selected] = right;
    onChange({ type: 'match_pairs', pairs: next });
    setSelected(null);
  };
  const wrong = new Set(result?.wrongItems ?? []);

  return (
    <div role="group" aria-labelledby={labelledBy} className="grid gap-4">
      <p className="text-text-2 text-sm" aria-live="polite">
        {selected
          ? `Ahora elige la pareja de «${selected}».`
          : 'Toca un elemento de la izquierda y luego su pareja de la derecha. Toca un par ya hecho para deshacerlo.'}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <ul className="grid content-start gap-2" aria-label="Elementos">
          {exercise.pairs.map((p) => {
            const paired = value.pairs[p.left];
            const state: ExerciseCardState = result
              ? wrong.has(p.left)
                ? 'incorrect'
                : 'correct'
              : selected === p.left || paired
                ? 'selected'
                : 'idle';
            return (
              <li key={p.left}>
                <ExerciseCard state={state} onSelect={() => clickLeft(p.left)} multi>
                  <span>
                    {p.left}
                    {paired && <span className="text-text-2 block text-sm">→ {paired}</span>}
                  </span>
                </ExerciseCard>
              </li>
            );
          })}
        </ul>
        <ul className="grid content-start gap-2" aria-label="Parejas">
          {rights.map((r) => (
            <li key={r}>
              <ExerciseCard state={usedBy(r) ? 'disabled' : 'idle'} onSelect={() => clickRight(r)}>
                {r}
              </ExerciseCard>
            </li>
          ))}
        </ul>
      </div>
      {result && wrong.size > 0 && (
        <ul className="text-text-2 text-sm">
          {exercise.pairs
            .filter((p) => wrong.has(p.left))
            .map((p) => (
              <li key={p.left}>
                Correcto: {p.left} → {p.right}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- fill_blank ---------- */

export function FillBlankView({
  exercise,
  value,
  onChange,
  result,
}: ViewProps<Of<'fill_blank'>, 'fill_blank'>) {
  const id = useId();
  const parts = exercise.prompt.split('___');
  const wrong = new Set(result?.wrongItems ?? []);
  const set = (i: number, v: string) => {
    const values = [...value.values];
    values[i] = v;
    onChange({ type: 'fill_blank', values });
  };
  const nodes: ReactNode[] = [];
  parts.forEach((part, i) => {
    nodes.push(<span key={`t${i}`}>{part}</span>);
    if (i < parts.length - 1)
      nodes.push(
        <input
          key={`i${i}`}
          id={`${id}-${i}`}
          aria-label={`Hueco ${i + 1} de ${parts.length - 1}`}
          value={value.values[i] ?? ''}
          readOnly={locked(result)}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-invalid={result && wrong.has(String(i)) ? true : undefined}
          onChange={(e) => set(i, e.target.value)}
          className={`bg-surface-2 text-text mx-1 min-h-12 w-40 rounded-[var(--radius-sm)] border-2 px-3 text-base ${result ? (wrong.has(String(i)) ? 'border-bear' : 'border-bull') : 'border-line'}`}
        />,
      );
  });
  return (
    <div className="grid gap-3">
      <p className="text-xl leading-[3rem]">{nodes}</p>
      {result && wrong.size > 0 && (
        <p className="text-text-2 text-sm">
          Respuesta: {exercise.answers.map((a) => a[0]).join(' · ')}
        </p>
      )}
    </div>
  );
}

/* ---------- order_steps (arrastrar o subir/bajar) ---------- */

export function OrderStepsView({
  exercise,
  value,
  onChange,
  result,
  labelledBy,
}: ViewProps<Of<'order_steps'>, 'order_steps'>) {
  const order = value.order;
  const move = (pos: number, delta: number) => {
    const to = pos + delta;
    if (to < 0 || to >= order.length || locked(result)) return;
    const next = [...order];
    [next[pos], next[to]] = [next[to]!, next[pos]!];
    onChange({ type: 'order_steps', order: next });
  };
  return (
    <div className="grid gap-2">
      <p className="text-text-2 text-sm">Arrastra los pasos o usa los botones Subir y Bajar.</p>
      <Reorder.Group
        axis="y"
        values={order}
        onReorder={(o) => !locked(result) && onChange({ type: 'order_steps', order: o })}
        aria-labelledby={labelledBy}
        as="ol"
        className="grid gap-2"
      >
        {order.map((stepIdx, pos) => {
          const right = result ? stepIdx === pos : null;
          return (
            <Reorder.Item
              key={stepIdx}
              value={stepIdx}
              as="li"
              dragListener={!locked(result)}
              whileDrag={{ scale: 1.03, boxShadow: 'var(--shadow-md)' }}
              className={`bg-surface-1 flex min-h-14 items-center justify-between gap-2 rounded-[var(--radius-md)] border-2 px-4 py-2 ${right === null ? 'border-line' : right ? 'border-bull' : 'border-bear'}`}
            >
              <span>
                <span data-num className="text-text-2 mr-3">
                  {pos + 1}.
                </span>
                {exercise.steps[stepIdx]}
                {right !== null && (
                  <span className={`ml-2 text-sm ${right ? 'text-bull' : 'text-bear'}`}>
                    {right ? '✓' : '✗'}
                  </span>
                )}
              </span>
              {!locked(result) && (
                <span className="flex gap-1">
                  <button
                    type="button"
                    aria-label={`Subir «${exercise.steps[stepIdx]}»`}
                    disabled={pos === 0}
                    onClick={() => move(pos, -1)}
                    className="border-line min-h-12 min-w-12 cursor-pointer rounded-full border disabled:opacity-40"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label={`Bajar «${exercise.steps[stepIdx]}»`}
                    disabled={pos === order.length - 1}
                    onClick={() => move(pos, 1)}
                    className="border-line min-h-12 min-w-12 cursor-pointer rounded-full border disabled:opacity-40"
                  >
                    ↓
                  </button>
                </span>
              )}
            </Reorder.Item>
          );
        })}
      </Reorder.Group>
      {result && !result.correct && (
        <ol className="text-text-2 list-decimal pl-6 text-sm">
          {exercise.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      )}
    </div>
  );
}

export const initialOrder = (e: Of<'order_steps'>): number[] => shuffledOrder(e);

/* ---------- numeric_input ---------- */

export function NumericInputView({
  exercise,
  value,
  onChange,
  result,
}: ViewProps<Of<'numeric_input'>, 'numeric_input'>) {
  const id = useId();
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-text-2 text-sm">
        Tu respuesta{exercise.unit ? ` (${exercise.unit})` : ''}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          value={value.text}
          readOnly={locked(result)}
          placeholder="Ej.: 1.234,5…"
          aria-describedby={`${id}-hint`}
          aria-invalid={result && !result.correct ? true : undefined}
          onChange={(e) =>
            onChange({ type: 'numeric_input', text: e.target.value, locale: value.locale })
          }
          style={{ fontFamily: 'var(--font-mono)' }}
          className={`bg-surface-2 text-text min-h-14 w-full rounded-[var(--radius-sm)] border-2 px-4 text-xl ${result ? (result.correct ? 'border-bull' : 'border-bear') : 'border-line'}`}
        />
        {exercise.unit && <span className="text-xl">{exercise.unit}</span>}
      </div>
      <p id={`${id}-hint`} className="text-text-2 text-sm">
        Puedes escribir 1.234,5 o 1234.5.
      </p>
      {result && !result.correct && (
        <p className="text-sm" data-num>
          Respuesta correcta: {formatPlain(exercise.answer)}
          {exercise.unit ? ` ${exercise.unit}` : ''}
        </p>
      )}
    </div>
  );
}

/* ---------- categorize (tocar la categoría de cada elemento) ---------- */

export function CategorizeView({
  exercise,
  value,
  onChange,
  result,
  labelledBy,
}: ViewProps<Of<'categorize'>, 'categorize'>) {
  const wrong = new Set(result?.wrongItems ?? []);
  return (
    <div role="group" aria-labelledby={labelledBy} className="grid gap-3">
      {exercise.items.map((item) => {
        const chosen = value.assignments[item.text];
        const mark = result ? (wrong.has(item.text) ? 'incorrect' : 'correct') : null;
        return (
          <div
            key={item.text}
            role="group"
            aria-label={item.text}
            className={`bg-surface-1 grid gap-2 rounded-[var(--radius-md)] border-2 p-3 ${mark === 'correct' ? 'border-bull' : mark === 'incorrect' ? 'border-bear' : 'border-line'}`}
          >
            <span className="text-lg">
              {item.text}
              {mark && (
                <span className={`ml-2 text-sm ${mark === 'correct' ? 'text-bull' : 'text-bear'}`}>
                  {mark === 'correct' ? '✓' : `✗ era ${item.category}`}
                </span>
              )}
            </span>
            <span className="flex flex-wrap gap-2">
              {exercise.categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  aria-pressed={chosen === cat}
                  disabled={locked(result)}
                  onClick={() =>
                    onChange({
                      type: 'categorize',
                      assignments: { ...value.assignments, [item.text]: cat },
                    })
                  }
                  className={`min-h-12 cursor-pointer rounded-full border px-4 text-sm transition-transform duration-100 active:scale-[0.97] ${chosen === cat ? 'border-brand bg-surface-2' : 'border-line text-text-2'}`}
                >
                  {chosen === cat && <span aria-hidden="true">✓ </span>}
                  {cat}
                </button>
              ))}
            </span>
          </div>
        );
      })}
    </div>
  );
}
