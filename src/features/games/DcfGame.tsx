import { useMemo, useRef, useState } from 'react';
import { Button } from '../../components/Button';
import {
  approved,
  BASE,
  COMMITTEE,
  dcf,
  dcfResult,
  dcfValues,
  defensible,
  G_GRID,
  hitsPrice,
  hitsTarget,
  MARGIN_GRID,
  RULES,
  setupDcf,
  START_3,
  WACC_GRID,
  withinRules,
  type Levers,
} from '../../engine/games/dcf-express';
import { t } from '../../i18n';
import { formatEur, formatNumber } from '../../lib/format';
import { haptic, HAPTIC } from '../../lib/haptics';
import { playSound } from '../../lib/sound';
import { Glow, PopLayer, shake, usePops } from './kit';
import './dcf-game.css';

interface Props {
  seed: number;
  /** Al terminar y pulsar «Ver qué ha pasado»: las cifras de la partida para la explicación y los ejercicios. */
  onDone: (values: Record<string, number>) => void;
}

type Step = 'market' | 'boss' | 'committee' | 'done';
type Key = keyof Levers;
const GRID = { wacc: WACC_GRID, g: G_GRID, margin: MARGIN_GRID } as const;
const pct = (v: number, d = 1) => `${formatNumber(v, d)}\u00a0%`;
const pp = (v: number) =>
  `${v > 0 ? '+' : v < 0 ? '−' : ''}${formatNumber(Math.abs(v), 1)}\u00a0pp`;
const show = (k: Key, v: number) => (k === 'margin' ? pp(v) : pct(v));
const snap = (k: Key, v: number) => {
  const { min, max, step } = GRID[k];
  return Math.min(max, Math.max(min, Math.round(v / step) * step));
};
const round1 = (v: number) => Math.round(v * 10) / 10;

/** Una palanca: deslizador con botones −/+ (alternativa al arrastre) y su valor. */
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
  const id = `dg-${k}`;
  const set = (v: number) => onChange(round1(snap(k, v)));
  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="font-medium">
        {t(`dcfGame.lever.${k}`, { v: show(k, value) })}
      </label>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          aria-label={t(`dcfGame.less.${k}`)}
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
          aria-valuetext={t(`dcfGame.lever.${k}`, { v: show(k, value) })}
          className="dg-range min-h-12 min-w-0 flex-1"
        />
        <Button
          variant="secondary"
          aria-label={t(`dcfGame.more.${k}`)}
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

/** Cascada: los cinco flujos descontados y el bloque del valor terminal, que muestra cuánto pesa. */
function Cascade({ levers }: { levers: Levers }) {
  const d = dcf(levers);
  const pv = d.fcff.map((f, i) => f / (1 + levers.wacc / 100) ** (i + 0.5));
  const top = Math.max(d.ev, 1);
  const h = (v: number) => (v / top) * 100;
  let acc = 0;
  return (
    <figure className="grid gap-1">
      <svg
        viewBox="0 0 320 132"
        className="h-auto w-full"
        role="img"
        aria-label={t('dcfGame.cascadeAria', {
          pv: formatNumber(Math.round(d.pvFcff)),
          tv: formatNumber(Math.round(d.pvTerminal)),
          share: formatNumber(d.tvShare * 100, 0),
        })}
      >
        <line x1="8" x2="312" y1="112" y2="112" stroke="var(--line)" />
        {pv.map((v, i) => {
          const y = 112 - h(acc + v);
          acc += v;
          return (
            <rect
              key={i}
              x={14 + i * 40}
              y={y}
              width="32"
              height={Math.max(h(v), 1)}
              rx="2"
              fill="var(--brand)"
            />
          );
        })}
        <rect
          x="214"
          y={112 - h(d.pvFcff + d.pvTerminal)}
          width="92"
          height={Math.max(h(d.pvTerminal), 1)}
          rx="3"
          fill="var(--accent)"
        />
        {[2026, 2027, 2028, 2029, 2030].map((y, i) => (
          <text
            key={y}
            x={30 + i * 40}
            y="126"
            textAnchor="middle"
            fill="var(--text-2)"
            fontSize="9"
          >
            {y}
          </text>
        ))}
        <text x="260" y="126" textAnchor="middle" fill="var(--text-2)" fontSize="9">
          {t('dcfGame.terminal')}
        </text>
        <text
          x="260"
          y={Math.max(12, 112 - h(d.ev) + 14)}
          textAnchor="middle"
          fill="var(--text)"
          fontSize="11"
        >
          {pct(d.tvShare * 100, 0)}
        </text>
      </svg>
      <figcaption className="text-text-2 text-sm">{t('dcfGame.legend')}</figcaption>
    </figure>
  );
}

export function DcfGame({ seed, onDone }: Props) {
  const s = useMemo(() => setupDcf(seed), [seed]);
  const [step, setStep] = useState<Step>('market');
  const [levers, setLevers] = useState<Levers>({ ...BASE, wacc: snap('wacc', BASE.wacc) });
  const [proposed, setProposed] = useState(false);
  const [waccPick, setWaccPick] = useState(0);
  const [gPick, setGPick] = useState(0);
  const [defend, setDefend] = useState<boolean | null>(null);
  const [glow, setGlow] = useState(0);
  const box = useRef<HTMLElement>(null);
  const { pops, pop } = usePops();
  const d = dcf(levers);
  const value = Math.round(d.perShare * 100) / 100;

  const feedback = (ok: boolean) => {
    if (ok) {
      setGlow((g) => g + 1);
      playSound('hit');
      haptic(HAPTIC.success);
      pop(t('dcfGame.hit'), 'up', 50, 20);
    } else {
      playSound('miss');
      haptic(HAPTIC.failure);
      if (box.current) shake(box.current);
    }
  };
  const set = (k: Key) => (v: number) => setLevers((l) => ({ ...l, [k]: v }));

  if (step === 'done') {
    const answer = { wacc: waccPick, g: gPick, defend: defend ?? false, final: levers };
    const r = dcfResult(s, answer);
    const row = (label: string, ok: boolean) => (
      <div>
        <dt className="text-text-2 text-sm">{label}</dt>
        <dd className={`text-lg ${ok ? 'text-bull' : 'text-bear'}`}>
          {ok ? `✓ ${t('dcfGame.yes')}` : `✗ ${t('dcfGame.no')}`}
        </dd>
      </div>
    );
    return (
      <section
        aria-labelledby="dg-done"
        className="dg-panel grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
        data-testid="dg-done"
      >
        <h2 id="dg-done" className="text-3xl">
          {t('dcfGame.doneTitle')}
        </h2>
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
          {row(t('dcfGame.row.market'), r.marketHit)}
          {row(t('dcfGame.row.boss'), r.bossHit)}
          {row(t('dcfGame.row.judgement'), r.judgement)}
          {row(t('dcfGame.row.approved'), r.approved)}
        </dl>
        <p className="text-lg" data-testid="dg-verdict">
          {r.score >= 1 ? t('dcfGame.great') : r.score >= 0.6 ? t('dcfGame.ok') : t('dcfGame.bad')}
        </p>
        <Button onClick={() => onDone(dcfValues(s, answer))}>{t('dcfGame.debrief')}</Button>
      </section>
    );
  }

  const rules = withinRules(levers);
  const isApproved = approved(levers);

  return (
    <section
      ref={box}
      aria-labelledby="dg-title"
      className="dg-panel relative grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
    >
      <header className="grid gap-1">
        <h2 id="dg-title" className="text-3xl">
          {t('dcfGame.title')}
        </h2>
        <p className="text-text-2 text-sm" data-testid="dg-step">
          {t(`dcfGame.step.${step}`)}
        </p>
      </header>
      <PopLayer pops={pops} />
      <p>
        {step === 'market'
          ? t('dcfGame.briefMarket', {
              price: formatEur(s.price),
              wacc: pct(BASE.wacc, 2),
              g: pct(BASE.g),
            })
          : step === 'boss'
            ? t('dcfGame.briefBoss', { target: formatEur(s.target), wacc: pct(BASE.wacc, 2) })
            : t('dcfGame.briefCommittee', {
                lo: formatEur(COMMITTEE[0]),
                hi: formatEur(COMMITTEE[1]),
              })}
      </p>
      {step === 'committee' && (
        <ul className="grid gap-1 text-sm" aria-label={t('dcfGame.rules')}>
          {(['wacc', 'g', 'margin'] as const).map((k) => (
            <li key={k} className={rules[k] ? 'text-bull' : 'text-bear'}>
              {rules[k] ? '✓ ' : '✗ '}
              {t(`dcfGame.rule.${k}`, { lo: show(k, RULES[k][0]), hi: show(k, RULES[k][1]) })}
            </li>
          ))}
        </ul>
      )}

      <div className="dg-value grid justify-items-start gap-0">
        <span className="text-text-2 text-sm">{t('dcfGame.perShare')}</span>
        <span className="font-display text-5xl" data-num data-testid="dg-value">
          {formatEur(value)}
        </span>
        {step === 'committee' && (
          <span
            className={`dg-stamp ${isApproved ? 'is-on' : ''}`}
            aria-hidden={!isApproved}
            data-testid="dg-stamp"
          >
            {t('dcfGame.stamp')}
          </span>
        )}
      </div>

      <Cascade levers={levers} />

      {(step === 'market' || step === 'committee') && (
        <Lever k="wacc" value={levers.wacc} onChange={set('wacc')} disabled={proposed} />
      )}
      {(step === 'boss' || step === 'committee') && (
        <Lever k="g" value={levers.g} onChange={set('g')} disabled={proposed} />
      )}
      {step === 'committee' && <Lever k="margin" value={levers.margin} onChange={set('margin')} />}

      {step === 'market' &&
        (!proposed ? (
          <Button
            onClick={() => {
              setProposed(true);
              setWaccPick(levers.wacc);
              feedback(hitsPrice(levers.wacc, s));
            }}
          >
            {t('dcfGame.proposeWacc', { v: pct(levers.wacc) })}
          </Button>
        ) : (
          <Glow pulse={glow} className="rounded-[var(--radius-md)]">
            <div className="grid gap-3 p-1">
              <p
                role="status"
                className={hitsPrice(waccPick, s) ? 'text-bull' : 'text-bear'}
                data-testid="dg-why"
              >
                {hitsPrice(waccPick, s) ? '✓ ' : '✗ '}
                {t('dcfGame.whyMarket', {
                  price: formatEur(s.price),
                  wacc: pct(waccPick),
                  model: pct(BASE.wacc, 2),
                })}
              </p>
              <Button
                onClick={() => {
                  setProposed(false);
                  setLevers({ ...BASE, wacc: BASE.wacc });
                  setStep('boss');
                }}
              >
                {t('dcfGame.next')}
              </Button>
            </div>
          </Glow>
        ))}

      {step === 'boss' &&
        (!proposed ? (
          <Button
            onClick={() => {
              setProposed(true);
              setGPick(levers.g);
              feedback(hitsTarget(levers.g, s));
            }}
          >
            {t('dcfGame.proposeG', { v: pct(levers.g) })}
          </Button>
        ) : (
          <Glow pulse={glow} className="rounded-[var(--radius-md)]">
            <div className="grid gap-3 p-1">
              <p role="status" className={hitsTarget(gPick, s) ? 'text-bull' : 'text-bear'}>
                {hitsTarget(gPick, s) ? '✓ ' : '✗ '}
                {t('dcfGame.whyBoss', {
                  g: pct(gPick),
                  value: formatEur(value),
                  share: pct(d.tvShare * 100, 0),
                })}
              </p>
              {defend === null ? (
                <div
                  role="radiogroup"
                  aria-label={t('dcfGame.askDefend', { g: pct(gPick) })}
                  className="grid gap-2"
                >
                  <p className="font-medium">{t('dcfGame.askDefend', { g: pct(gPick) })}</p>
                  {[true, false].map((v) => (
                    <Button
                      key={String(v)}
                      role="radio"
                      aria-checked={false}
                      variant="secondary"
                      className="justify-start text-left"
                      onClick={() => {
                        setDefend(v);
                        feedback(v === defensible(gPick));
                      }}
                    >
                      {t(`dcfGame.defend.${v ? 'yes' : 'no'}`)}
                    </Button>
                  ))}
                </div>
              ) : (
                <>
                  <p
                    role="status"
                    className={defend === defensible(gPick) ? 'text-bull' : 'text-bear'}
                    data-testid="dg-defend"
                  >
                    {defend === defensible(gPick) ? '✓ ' : '✗ '}
                    {t(defensible(gPick) ? 'dcfGame.defendOk' : 'dcfGame.defendNo', {
                      g: pct(gPick),
                      max: pct(RULES.g[1]),
                    })}
                  </p>
                  <Button
                    onClick={() => {
                      setProposed(false);
                      setLevers(START_3);
                      setStep('committee');
                    }}
                  >
                    {t('dcfGame.next')}
                  </Button>
                </>
              )}
            </div>
          </Glow>
        ))}

      {step === 'committee' && (
        <Button
          onClick={() => {
            feedback(isApproved);
            setStep('done');
          }}
        >
          {t('dcfGame.present')}
        </Button>
      )}
    </section>
  );
}
