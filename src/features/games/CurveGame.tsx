import { useMemo, useRef, useState } from 'react';
import { Button } from '../../components/Button';
import {
  curveResult,
  curveValues,
  fall10,
  fallOptions,
  LEVEL_GRID,
  longFalls,
  MATURITIES,
  pricesAt,
  setupCurve,
  SLOPE_GRID,
  twist,
  yieldsAt,
  type Levers,
} from '../../engine/games/yield-curve';
import { t } from '../../i18n';
import { formatNumber } from '../../lib/format';
import { haptic, HAPTIC } from '../../lib/haptics';
import { playSound } from '../../lib/sound';
import { Glow, PopLayer, shake, usePops } from './kit';
import './curve-game.css';

interface Props {
  seed: number;
  /** Al terminar y pulsar «Ver qué ha pasado»: las cifras de la partida para la explicación y los ejercicios. */
  onDone: (values: Record<string, number>) => void;
}

type Step = 'long' | 'twist' | 'duration' | 'done';
type Key = keyof Levers;
const GRID = { level: LEVEL_GRID, slope: SLOPE_GRID } as const;
const ZERO: Levers = { level: 0, slope: 0 };
const pct = (v: number, d = 2) => `${formatNumber(v, d)}\u00a0%`;
const signed = (v: number, d = 2) =>
  `${v > 0 ? '+' : v < 0 ? '−' : ''}${formatNumber(Math.abs(v), d)}`;

/** Una palanca de la curva: deslizador con botones −/+ (alternativa al arrastre). */
function Lever({
  k,
  value,
  onChange,
  disabled,
}: {
  k: Key;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const { min, max, step } = GRID[k];
  const id = `cg-${k}`;
  const set = (v: number) => onChange(Math.round(Math.min(max, Math.max(min, v)) / step) * step);
  const label = t(`curveGame.lever.${k}`, { v: signed(value) });
  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          aria-label={t(`curveGame.less.${k}`)}
          data-repeat
          disabled={disabled || value <= min}
          onClick={() => set(value - step)}
        >
          −
        </Button>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => set(Number(e.target.value))}
          aria-valuetext={label}
          className="cg-range min-h-12 min-w-0 flex-1"
        />
        <Button
          variant="secondary"
          aria-label={t(`curveGame.more.${k}`)}
          data-repeat
          disabled={disabled || value >= max}
          onClick={() => set(value + step)}
        >
          +
        </Button>
      </div>
    </div>
  );
}

/** La curva de hoy (discontinua) y la movida (continua), con los cinco plazos. */
function Chart({ base, now }: { base: number[]; now: number[] }) {
  const lo = Math.min(...base, ...now) - 0.3;
  const hi = Math.max(...base, ...now) + 0.3;
  const x = (i: number) => 30 + i * 65;
  const y = (v: number) => 100 - ((v - lo) / (hi - lo)) * 86;
  const line = (ys: number[]) => ys.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  return (
    <figure className="grid gap-1">
      <svg
        viewBox="0 0 320 124"
        className="h-auto w-full"
        role="img"
        aria-label={t('curveGame.chartAria', {
          list: MATURITIES.map((m, i) =>
            t('curveGame.point', { m, y: formatNumber(now[i]!, 2) }),
          ).join(', '),
        })}
      >
        <line x1="20" x2="300" y1="104" y2="104" stroke="var(--line)" />
        <polyline points={line(base)} fill="none" stroke="var(--text-2)" strokeDasharray="4 3" />
        <polyline points={line(now)} fill="none" stroke="var(--brand)" strokeWidth="2.5" />
        {now.map((v, i) => (
          <circle key={i} cx={x(i)} cy={y(v)} r="4" fill="var(--accent)" />
        ))}
        {MATURITIES.map((m, i) => (
          <text key={m} x={x(i)} y="118" textAnchor="middle" fill="var(--text-2)" fontSize="10">
            {t('curveGame.years', { m })}
          </text>
        ))}
      </svg>
      <figcaption className="text-text-2 text-sm">{t('curveGame.legend')}</figcaption>
    </figure>
  );
}

export function CurveGame({ seed, onDone }: Props) {
  const s = useMemo(() => setupCurve(seed), [seed]);
  const [step, setStep] = useState<Step>('long');
  const [levers, setLevers] = useState<Levers>(ZERO);
  const [proposed, setProposed] = useState(false);
  const [first, setFirst] = useState<Levers>(ZERO);
  const [second, setSecond] = useState<Levers>(ZERO);
  const [pick, setPick] = useState<number | null>(null);
  const [glow, setGlow] = useState(0);
  const box = useRef<HTMLElement>(null);
  const { pops, pop } = usePops();
  const ys = yieldsAt(s, levers);
  const prices = pricesAt(s, levers);

  const feedback = (ok: boolean) => {
    if (ok) {
      setGlow((g) => g + 1);
      playSound('hit');
      haptic(HAPTIC.success);
      pop(t('curveGame.hit'), 'up', 50, 20);
    } else {
      playSound('miss');
      haptic(HAPTIC.failure);
      if (box.current) shake(box.current);
    }
  };
  const set = (k: Key) => (v: number) => setLevers((l) => ({ ...l, [k]: v }));

  if (step === 'done') {
    const answer = { first, second, pick: pick ?? 0 };
    const r = curveResult(s, answer);
    const row = (label: string, ok: boolean) => (
      <div>
        <dt className="text-text-2 text-sm">{label}</dt>
        <dd className={`text-lg ${ok ? 'text-bull' : 'text-bear'}`}>
          {ok ? `✓ ${t('curveGame.yes')}` : `✗ ${t('curveGame.no')}`}
        </dd>
      </div>
    );
    return (
      <section
        aria-labelledby="cg-done"
        className="cg-panel grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
        data-testid="cg-done"
      >
        <h2 id="cg-done" className="text-3xl">
          {t('curveGame.doneTitle')}
        </h2>
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
          {row(t('curveGame.row.long'), r.longHit)}
          {row(t('curveGame.row.twist'), r.twistHit)}
          {row(t('curveGame.row.duration'), r.pickHit)}
        </dl>
        <p className="text-lg" data-testid="cg-verdict">
          {r.score >= 1
            ? t('curveGame.great')
            : r.score >= 0.6
              ? t('curveGame.ok')
              : t('curveGame.bad')}
        </p>
        <Button onClick={() => onDone(curveValues(s, answer))}>{t('curveGame.debrief')}</Button>
      </section>
    );
  }

  const ok = step === 'long' ? longFalls(s, levers) : twist(s, levers);

  return (
    <section
      ref={box}
      aria-labelledby="cg-title"
      className="cg-panel relative grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
    >
      <header className="grid gap-1">
        <h2 id="cg-title" className="text-3xl">
          {t('curveGame.title')}
        </h2>
        <p className="text-text-2 text-sm" data-testid="cg-step">
          {t(`curveGame.step.${step}`)}
        </p>
      </header>
      <PopLayer pops={pops} />
      <p>{t(`curveGame.brief.${step}`)}</p>

      {step === 'duration' ? (
        <div className="grid gap-3">
          {pick === null ? (
            <div role="radiogroup" aria-label={t('curveGame.askFall')} className="grid gap-2">
              <p className="font-medium">{t('curveGame.askFall')}</p>
              {fallOptions(s).map((o) => (
                <Button
                  key={o}
                  role="radio"
                  aria-checked={false}
                  variant="secondary"
                  onClick={() => {
                    setPick(o);
                    feedback(o === fall10(s));
                  }}
                >
                  {t('curveGame.fallOption', { v: formatNumber(o, 1) })}
                </Button>
              ))}
            </div>
          ) : (
            <Glow pulse={glow} className="rounded-[var(--radius-md)]">
              <div className="grid gap-3 p-1">
                <p
                  role="status"
                  className={pick === fall10(s) ? 'text-bull' : 'text-bear'}
                  data-testid="cg-why"
                >
                  {pick === fall10(s) ? '✓ ' : '✗ '}
                  {t('curveGame.whyDuration', { v: formatNumber(fall10(s), 1) })}
                </p>
                <Button onClick={() => setStep('done')}>{t('curveGame.summary')}</Button>
              </div>
            </Glow>
          )}
        </div>
      ) : (
        <>
          <Chart base={s.base} now={ys} />
          <ul className="grid gap-1 text-sm" aria-label={t('curveGame.bonds')} data-num>
            {MATURITIES.map((m, i) => {
              const d = prices[i]! - 100;
              return (
                <li
                  key={m}
                  className="cg-row flex flex-wrap items-baseline justify-between gap-x-3 rounded-[6px] px-1"
                >
                  <span>{t('curveGame.bond', { m })}</span>
                  <span className="flex flex-wrap gap-x-3">
                    <span className="whitespace-nowrap">{pct(ys[i]!)}</span>
                    <span
                      className={`whitespace-nowrap ${Math.abs(d) < 0.005 ? '' : d > 0 ? 'text-bull' : 'text-bear'}`}
                      data-testid={`cg-price-${m}`}
                    >
                      {`${Math.abs(d) < 0.005 ? '' : d > 0 ? '▲ ' : '▼ '}${formatNumber(prices[i]!, 2)} (${signed(d)}\u00a0%)`}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
          <Lever k="level" value={levers.level} onChange={set('level')} disabled={proposed} />
          <Lever k="slope" value={levers.slope} onChange={set('slope')} disabled={proposed} />
          {!proposed ? (
            <Button
              onClick={() => {
                setProposed(true);
                if (step === 'long') setFirst(levers);
                else setSecond(levers);
                feedback(ok);
              }}
            >
              {t('curveGame.check')}
            </Button>
          ) : (
            <Glow pulse={glow} className="rounded-[var(--radius-md)]">
              <div className="grid gap-3 p-1">
                <p role="status" className={ok ? 'text-bull' : 'text-bear'} data-testid="cg-why">
                  {ok ? '✓ ' : '✗ '}
                  {t(`curveGame.why.${step}.${ok ? 'ok' : 'ko'}`)}
                </p>
                <Button
                  onClick={() => {
                    setProposed(false);
                    setLevers(ZERO);
                    setStep(step === 'long' ? 'twist' : 'duration');
                  }}
                >
                  {t('curveGame.next')}
                </Button>
              </div>
            </Glow>
          )}
        </>
      )}
    </section>
  );
}
