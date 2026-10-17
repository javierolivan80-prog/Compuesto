import { useEffect, useId, useState, type ReactNode } from 'react';
import { t } from '../../i18n';
import { ExerciseCard, type ExerciseCardState } from '../../components/ExerciseCard';
import { Button } from '../../components/Button';
import type { Exercise } from '../../content/schemas';
import { chartSeries, describeSeries, type Series } from '../../engine/charts';
import {
  chooseOption,
  initialCase,
  isCaseComplete,
  nextStep,
  parseSavedCase,
  revealStep,
  type CaseState,
} from '../../engine/case-step';
import { SELF_EXPLAIN_PASS, type Answer } from '../../engine/grading';
import { formatPlain } from '../../lib/format';
import { optionOrder, type ViewProps } from './views';

/* Tipos de aplicar y argumentar (TEMARIO §6, 12–19, salvo `code`). Todos son controlados, como el resto. */

type Of<T extends Exercise['type']> = Extract<Exercise, { type: T }>;

const state = (selected: boolean, locked: boolean, isCorrect: boolean): ExerciseCardState => {
  if (!locked) return selected ? 'selected' : 'idle';
  if (isCorrect) return 'correct';
  return selected ? 'incorrect' : 'disabled';
};

/* ---------- scenario / best_argument / chart_read (una elección) ---------- */

type ChoiceType = 'scenario' | 'best_argument' | 'chart_read';

export function ChoiceView({
  exercise,
  value,
  onChange,
  result,
  labelledBy,
}: ViewProps<Of<ChoiceType>, ChoiceType>) {
  const lead: ReactNode =
    exercise.type === 'scenario' ? (
      <p className="bg-surface-2 border-line rounded-[var(--radius-md)] border p-4">
        {exercise.situation}
      </p>
    ) : exercise.type === 'chart_read' ? (
      <ChartFigure spec={exercise.chart} altText={exercise.altText} />
    ) : (
      <p className="text-text-2 text-sm">{t('applied.argumentHint')}</p>
    );
  return (
    <div className="grid gap-4">
      {lead}
      <div role="radiogroup" aria-labelledby={labelledBy} className="grid gap-2">
        {optionOrder(exercise).map((i) => (
          <ExerciseCard
            key={i}
            state={state(value.choice === i, result !== null, i === exercise.answer)}
            onSelect={result ? undefined : () => onChange({ type: exercise.type, choice: i })}
          >
            {exercise.options[i]}
          </ExerciseCard>
        ))}
      </div>
    </div>
  );
}

/* ---------- chart_read: gráfico SVG con descripción y tabla ---------- */

function ChartFigure({ spec, altText }: { spec: Of<'chart_read'>['chart']; altText: string }) {
  const series = chartSeries(spec);
  const summary = `${altText} ${describeSeries(series)}`;
  return (
    <figure className="grid gap-2">
      <ChartSvg series={series} label={summary} />
      <details className="text-sm">
        <summary className="text-text-2 min-h-12 cursor-pointer py-3">
          {t('applied.chartTable')}
        </summary>
        <table className="w-full text-left" data-num>
          <thead>
            <tr>
              <th scope="col" className="pr-4">
                {t('applied.point')}
              </th>
              <th scope="col">
                {t('applied.value')}
                {series.unit ? ` (${series.unit})` : ''}
              </th>
            </tr>
          </thead>
          <tbody>
            {series.values.map((v, i) => (
              <tr key={i}>
                <th scope="row" className="text-text-2 pr-4 font-normal">
                  {series.labels[i]}
                </th>
                <td>{formatPlain(v)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

const W = 320;
const H = 160;
const PAD = 8;

export function ChartSvg({ series, label }: { series: Series; label: string }) {
  const { values } = series;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) => PAD + (i * (W - 2 * PAD)) / Math.max(1, values.length - 1);
  const y = (v: number) => H - PAD - ((v - min) / span) * (H - 2 * PAD);
  const bars = series.kind === 'bars';
  const barW = ((W - 2 * PAD) / values.length) * 0.7;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={label}
      className="bg-surface-1 border-line w-full rounded-[var(--radius-md)] border"
    >
      <title>{label}</title>
      <line x1={PAD} x2={W - PAD} y1={H - PAD} y2={H - PAD} stroke="var(--line)" />
      {bars ? (
        values.map((v, i) => (
          <rect
            key={i}
            x={x(i) - barW / 2}
            y={y(v)}
            width={barW}
            height={Math.max(1, H - PAD - y(v))}
            fill="var(--brand)"
          />
        ))
      ) : (
        <>
          <polyline
            fill="none"
            stroke="var(--brand)"
            strokeWidth="2"
            strokeLinejoin="round"
            points={values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
          />
          {series.kind === 'yield_curve' &&
            values.map((v, i) => (
              <circle key={i} cx={x(i)} cy={y(v)} r="2.5" fill="var(--brand)" />
            ))}
        </>
      )}
    </svg>
  );
}

/* ---------- spot_the_error ---------- */

export function SpotErrorView({
  exercise,
  value,
  onChange,
  result,
  labelledBy,
}: ViewProps<Of<'spot_the_error'>, 'spot_the_error'>) {
  return (
    <div className="grid gap-2">
      <p className="text-text-2 text-sm">{t('applied.spotHint')}</p>
      <div role="radiogroup" aria-labelledby={labelledBy} className="grid gap-2">
        {exercise.lines.map((line, i) => (
          <ExerciseCard
            key={i}
            state={state(value.index === i, result !== null, i === exercise.errorIndex)}
            onSelect={result ? undefined : () => onChange({ type: 'spot_the_error', index: i })}
          >
            <span data-num className="text-text-2 mr-2">
              {i + 1}.
            </span>
            {line}
          </ExerciseCard>
        ))}
      </div>
    </div>
  );
}

/* ---------- slider_estimate ---------- */

export function SliderView({
  exercise,
  value,
  onChange,
  result,
}: ViewProps<Of<'slider_estimate'>, 'slider_estimate'>) {
  const id = useId();
  const mid =
    exercise.min + Math.round((exercise.max - exercise.min) / 2 / exercise.step) * exercise.step;
  const shown = value.value ?? mid;
  const unit = exercise.unit ? ` ${exercise.unit}` : '';
  const commit = (v: number) => onChange({ type: 'slider_estimate', value: v });
  return (
    <div className="grid gap-3">
      <label htmlFor={id} className="text-text-2 text-sm">
        {t('applied.estimate')}
      </label>
      <p data-num className="text-3xl" aria-live="polite">
        {value.value === null ? '—' : `${formatPlain(shown)}${unit}`}
      </p>
      <input
        id={id}
        type="range"
        min={exercise.min}
        max={exercise.max}
        step={exercise.step}
        value={shown}
        disabled={result !== null}
        aria-valuetext={value.value === null ? 'Sin elegir' : `${formatPlain(shown)}${unit}`}
        onChange={(e) => commit(Number(e.target.value))}
        onPointerUp={(e) => value.value === null && commit(Number(e.currentTarget.value))}
        onKeyUp={(e) => value.value === null && commit(Number(e.currentTarget.value))}
        className="accent-brand min-h-12 w-full"
      />
      <div className="text-text-2 flex justify-between text-sm" data-num>
        <span>
          {formatPlain(exercise.min)}
          {unit}
        </span>
        <span>
          {formatPlain(exercise.max)}
          {unit}
        </span>
      </div>
      {result && !result.correct && (
        <p data-num className="text-sm">
          {t('applied.sliderRight', { value: `${formatPlain(exercise.answer)}${unit}` })}
        </p>
      )}
    </div>
  );
}

/* ---------- case_step: estado entre pasos y reanudación ---------- */

const caseKey = (id: string) => `compuesto:case:${id}`;

function loadCase(id: string, steps: number): CaseState {
  try {
    return parseSavedCase(localStorage.getItem(caseKey(id)), steps) ?? initialCase(steps);
  } catch {
    return initialCase(steps);
  }
}

export function CaseStepView({
  exercise,
  onChange,
  result,
}: ViewProps<Of<'case_step'>, 'case_step'>) {
  const [cs, setCs] = useState<CaseState>(() => loadCase(exercise.id, exercise.steps.length));
  const step = exercise.steps[cs.step]!;
  const done = isCaseComplete(cs);

  // el estado se guarda en el dispositivo para poder retomar el caso; la respuesta solo está completa al terminar
  useEffect(() => {
    try {
      if (result) localStorage.removeItem(caseKey(exercise.id));
      else localStorage.setItem(caseKey(exercise.id), JSON.stringify(cs));
    } catch {
      /* sin almacenamiento: el caso sigue funcionando, solo no se reanuda */
    }
    onChange({ type: 'case_step', choices: done ? cs.choices : [] });
    // onChange cambia en cada render del Runner; solo importa el estado del caso
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cs, result]);

  if (result)
    return (
      <div className="grid gap-4">
        <p className="bg-surface-2 border-line rounded-[var(--radius-md)] border p-4">
          {exercise.intro}
        </p>
        <ol className="grid gap-3">
          {exercise.steps.map((s, i) => {
            const right = cs.choices[i] === s.answer;
            return (
              <li key={i} className="grid gap-1 text-sm">
                <span className="text-base">
                  <span data-num>{i + 1}.</span> {s.prompt}
                </span>
                <span className={right ? 'text-bull' : 'text-bear'}>
                  {right ? '✓ Correcta' : '✗ Incorrecta'}: {s.options[cs.choices[i] ?? 0]}
                </span>
                {!right && <span>{t('applied.right', { option: s.options[s.answer] ?? '' })}</span>}
                <span className="text-text-2">{s.explanation}</span>
              </li>
            );
          })}
        </ol>
      </div>
    );

  const picked = cs.choices[cs.step];
  const labelId = `${exercise.id}-step`;
  return (
    <div className="grid gap-4">
      <p className="bg-surface-2 border-line rounded-[var(--radius-md)] border p-4">
        {exercise.intro}
      </p>
      <p className="text-text-2 text-sm" data-num>
        {t('applied.step', { n: cs.step + 1, total: exercise.steps.length })}
      </p>
      <p id={labelId} className="text-xl">
        {step.prompt}
      </p>
      <div role="radiogroup" aria-labelledby={labelId} className="grid gap-2">
        {optionOrder({ id: `${exercise.id}#${cs.step}`, options: step.options }).map((i) => (
          <ExerciseCard
            key={i}
            state={state(picked === i, cs.revealed, i === step.answer)}
            onSelect={cs.revealed ? undefined : () => setCs((s) => chooseOption(s, i))}
          >
            {step.options[i]}
          </ExerciseCard>
        ))}
      </div>
      {cs.revealed && (
        <p className="text-sm" role="status">
          {picked === step.answer ? '✓ ' : '✗ '}
          {step.explanation}
        </p>
      )}
      {!cs.revealed ? (
        <Button
          type="button"
          variant="secondary"
          disabled={picked === null}
          onClick={() => setCs((s) => revealStep(s))}
        >
          {t('applied.checkStep')}
        </Button>
      ) : (
        !done && (
          <Button type="button" variant="secondary" onClick={() => setCs((s) => nextStep(s))}>
            {t('applied.nextStep')}
          </Button>
        )
      )}
    </div>
  );
}

/* ---------- document_read ---------- */

export function DocumentReadView({
  exercise,
  value,
  onChange,
  result,
}: ViewProps<Of<'document_read'>, 'document_read'>) {
  const choices = exercise.questions.map((_, i) => value.choices[i] ?? null);
  const date = new Intl.DateTimeFormat('es-ES', { dateStyle: 'long' }).format(
    new Date(`${exercise.documentDate}T12:00:00Z`),
  );
  return (
    <div className="grid gap-5">
      <figure className="grid gap-2">
        <blockquote className="bg-surface-2 border-brand rounded-[var(--radius-md)] border-l-4 p-4">
          {exercise.excerpt}
        </blockquote>
        <figcaption className="text-text-2 text-sm">
          {t('applied.source')}{' '}
          <a href={exercise.source} target="_blank" rel="noopener noreferrer" className="underline">
            {new URL(exercise.source).hostname}
          </a>{' '}
          <span data-num>{t('applied.docDate', { date })}</span>
        </figcaption>
      </figure>
      {exercise.questions.map((q, qi) => {
        const labelId = `${exercise.id}-q${qi}`;
        return (
          <div key={qi} className="grid gap-2">
            <p id={labelId} className="text-lg">
              {q.prompt}
            </p>
            <div role="radiogroup" aria-labelledby={labelId} className="grid gap-2">
              {optionOrder({ id: `${exercise.id}#${qi}`, options: q.options }).map((i) => (
                <ExerciseCard
                  key={i}
                  state={state(choices[qi] === i, result !== null, i === q.answer)}
                  onSelect={
                    result
                      ? undefined
                      : () => {
                          const next = [...choices];
                          next[qi] = i;
                          onChange({ type: 'document_read', choices: next });
                        }
                  }
                >
                  {q.options[i]}
                </ExerciseCard>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- self_explain ---------- */

export function SelfExplainView({
  exercise,
  value,
  onChange,
  result,
}: ViewProps<Of<'self_explain'>, 'self_explain'>) {
  const id = useId();
  const set = (patch: Partial<Extract<Answer, { type: 'self_explain' }>>) =>
    onChange({ ...value, ...patch });
  return (
    <div className="grid gap-4">
      <label htmlFor={id} className="text-text-2 text-sm">
        {t('applied.explain')}
      </label>
      <textarea
        id={id}
        rows={5}
        value={value.text}
        readOnly={value.revealed}
        onChange={(e) => set({ text: e.target.value })}
        className="bg-surface-1 text-text border-line min-h-32 rounded-[var(--radius-sm)] border p-4 text-base"
      />
      {!value.revealed ? (
        <Button
          type="button"
          variant="secondary"
          disabled={value.text.trim() === ''}
          onClick={() => set({ revealed: true })}
        >
          {t('applied.showModel')}
        </Button>
      ) : (
        <>
          <section
            aria-labelledby={`${id}-model`}
            className="bg-surface-2 rounded-[var(--radius-md)] p-4"
          >
            <h4 id={`${id}-model`} className="text-text-2 mb-1 text-sm">
              {t('applied.model')}
            </h4>
            <p>{exercise.modelAnswer}</p>
          </section>
          <fieldset disabled={result !== null} className="grid gap-2">
            <legend className="text-text-2 mb-1 text-sm">
              {t('applied.rubric', { pass: SELF_EXPLAIN_PASS })}
            </legend>
            {exercise.rubric.map((criterion, i) => (
              <label
                key={i}
                className="border-line bg-surface-1 flex min-h-12 cursor-pointer items-center gap-3 rounded-[var(--radius-md)] border px-4 py-2"
              >
                <input
                  type="checkbox"
                  checked={value.rubric[i]}
                  onChange={(e) => {
                    const r = [...value.rubric] as [boolean, boolean, boolean];
                    r[i] = e.target.checked;
                    set({ rubric: r });
                  }}
                  className="accent-brand size-5"
                />
                {criterion}
              </label>
            ))}
          </fieldset>
        </>
      )}
    </div>
  );
}
