import { useMemo, useRef, useState } from 'react';
import { Button } from '../../components/Button';
import {
  diffOptions,
  finals,
  fundResult,
  fundValues,
  grow,
  INITIAL,
  rightDiff,
  setupFunds,
  SITUATIONS,
  switchOutcome,
  TAX,
  YEARS,
  type Vehicle,
} from '../../engine/games/fund-fees';
import { t } from '../../i18n';
import { formatEur, formatNumber } from '../../lib/format';
import { haptic, HAPTIC } from '../../lib/haptics';
import { playSound } from '../../lib/sound';
import { Glow, PopLayer, shake, usePops } from './kit';
import './fund-game.css';

interface Props {
  seed: number;
  /** Al terminar y pulsar «Ver qué ha pasado»: las cifras de la partida para la explicación y los ejercicios. */
  onDone: (values: Record<string, number>) => void;
}

type Step = 'fees' | 'vehicle' | 'switch' | 'done';
const pct = (v: number, d = 1) => `${formatNumber(v, d)}\u00a0%`;
const eur = (v: number) => formatEur(Math.round(v), 0);

/** Las dos curvas de crecimiento: la del fondo barato y la del caro, que se queda atrás año a año. */
function Race({ gross, dear, cheap }: { gross: number; dear: number; cheap: number }) {
  const years = Array.from({ length: YEARS + 1 }, (_, i) => i);
  const top = grow(INITIAL, gross, cheap, YEARS) * 1.05;
  const x = (i: number) => 24 + (i / YEARS) * 280;
  const y = (v: number) => 104 - ((v - INITIAL * 0.9) / (top - INITIAL * 0.9)) * 92;
  const line = (ter: number) =>
    years.map((i) => `${x(i)},${y(grow(INITIAL, gross, ter, i))}`).join(' ');
  return (
    <figure className="grid gap-1">
      <svg
        viewBox="0 0 320 124"
        className="h-auto w-full"
        role="img"
        aria-label={t('fundGame.raceAria', {
          years: YEARS,
          cheap: eur(grow(INITIAL, gross, cheap, YEARS)),
          dear: eur(grow(INITIAL, gross, dear, YEARS)),
        })}
      >
        <line x1="20" x2="308" y1="104" y2="104" stroke="var(--line)" />
        <polyline points={line(cheap)} fill="none" stroke="var(--brand)" strokeWidth="2.5" />
        <polyline
          points={line(dear)}
          fill="none"
          stroke="var(--bear)"
          strokeWidth="2"
          strokeDasharray="5 3"
        />
        {[0, 10, 20].map((i) => (
          <text key={i} x={x(i)} y="118" textAnchor="middle" fill="var(--text-2)" fontSize="10">
            {t('fundGame.yearN', { n: i })}
          </text>
        ))}
      </svg>
      <figcaption className="text-text-2 text-sm">
        {t('fundGame.legend', { cheap: pct(cheap), dear: pct(dear) })}
      </figcaption>
    </figure>
  );
}

export function FundGame({ seed, onDone }: Props) {
  const s = useMemo(() => setupFunds(seed), [seed]);
  const [step, setStep] = useState<Step>('fees');
  const [diff, setDiff] = useState<number | null>(null);
  const [vehicles, setVehicles] = useState<(Vehicle | null)[]>(SITUATIONS.map(() => null));
  const [checked, setChecked] = useState(false);
  const [transfer, setTransfer] = useState<boolean | null>(null);
  const [glow, setGlow] = useState(0);
  const box = useRef<HTMLElement>(null);
  const { pops, pop } = usePops();
  const f = finals(s);

  const feedback = (ok: boolean) => {
    if (ok) {
      setGlow((g) => g + 1);
      playSound('hit');
      haptic(HAPTIC.success);
      pop(t('fundGame.hit'), 'up', 50, 20);
    } else {
      playSound('miss');
      haptic(HAPTIC.failure);
      if (box.current) shake(box.current);
    }
  };

  if (step === 'done') {
    const answer = {
      diff: diff ?? 0,
      vehicles: vehicles.map((v) => v ?? 'fund'),
      transfer: transfer ?? false,
    };
    const r = fundResult(s, answer);
    return (
      <section
        aria-labelledby="fg-done"
        className="fg-panel grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
        data-testid="fg-done"
      >
        <h2 id="fg-done" className="text-3xl">
          {t('fundGame.doneTitle')}
        </h2>
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
          <div>
            <dt className="text-text-2 text-sm">{t('fundGame.row.diff')}</dt>
            <dd className={`text-lg ${r.diffHit ? 'text-bull' : 'text-bear'}`}>
              {r.diffHit ? '✓ ' : '✗ '}
              {eur(f.diff)}
            </dd>
          </div>
          <div>
            <dt className="text-text-2 text-sm">{t('fundGame.row.vehicle')}</dt>
            <dd className="text-lg" data-num>
              {t('fundGame.hitsOf', { n: r.vehicleHits, total: SITUATIONS.length })}
            </dd>
          </div>
          <div>
            <dt className="text-text-2 text-sm">{t('fundGame.row.switch')}</dt>
            <dd className={`text-lg ${r.transferHit ? 'text-bull' : 'text-bear'}`}>
              {r.transferHit ? `✓ ${t('fundGame.transfer')}` : `✗ ${t('fundGame.sell')}`}
            </dd>
          </div>
        </dl>
        <p className="text-lg" data-testid="fg-verdict">
          {r.score >= 1
            ? t('fundGame.great')
            : r.score >= 0.6
              ? t('fundGame.ok')
              : t('fundGame.bad')}
        </p>
        <Button onClick={() => onDone(fundValues(s, answer))}>{t('fundGame.debrief')}</Button>
      </section>
    );
  }

  const tr = switchOutcome(s, true);
  const sell = switchOutcome(s, false);

  return (
    <section
      ref={box}
      aria-labelledby="fg-title"
      className="fg-panel relative grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
    >
      <header className="grid gap-1">
        <h2 id="fg-title" className="text-3xl">
          {t('fundGame.title')}
        </h2>
        <p className="text-text-2 text-sm" data-testid="fg-step">
          {t(`fundGame.step.${step}`)}
        </p>
      </header>
      <PopLayer pops={pops} />

      {step === 'fees' && (
        <div className="grid gap-3">
          <p>
            {t('fundGame.briefFees', {
              amount: eur(INITIAL),
              gross: pct(s.gross),
              dear: pct(s.terDear),
              cheap: pct(s.terCheap),
              years: YEARS,
            })}
          </p>
          {diff === null ? (
            <div role="radiogroup" aria-label={t('fundGame.askDiff')} className="grid gap-2">
              <p className="font-medium">{t('fundGame.askDiff', { years: YEARS })}</p>
              {diffOptions(s).map((o) => (
                <Button
                  key={o}
                  role="radio"
                  aria-checked={false}
                  variant="secondary"
                  onClick={() => {
                    setDiff(o);
                    feedback(o === rightDiff(s));
                  }}
                >
                  {t('fundGame.about', { v: eur(o) })}
                </Button>
              ))}
            </div>
          ) : (
            <Glow pulse={glow} className="rounded-[var(--radius-md)]">
              <div className="grid gap-3 p-1">
                <Race gross={s.gross} dear={s.terDear} cheap={s.terCheap} />
                <p
                  role="status"
                  className={diff === rightDiff(s) ? 'text-bull' : 'text-bear'}
                  data-testid="fg-why"
                >
                  {diff === rightDiff(s) ? '✓ ' : '✗ '}
                  {t('fundGame.whyFees', {
                    cheap: eur(f.cheap),
                    dear: eur(f.dear),
                    diff: eur(f.diff),
                    years: YEARS,
                  })}
                </p>
                <Button onClick={() => setStep('vehicle')}>{t('fundGame.next')}</Button>
              </div>
            </Glow>
          )}
        </div>
      )}

      {step === 'vehicle' && (
        <div className="grid gap-3">
          <p>{t('fundGame.briefVehicle')}</p>
          <ul className="grid gap-3">
            {SITUATIONS.map((x, i) => (
              <li key={x.id} className="grid gap-2">
                <p id={`fg-s-${x.id}`}>{t(`fundGame.situation.${x.id}`)}</p>
                <div
                  role="radiogroup"
                  aria-labelledby={`fg-s-${x.id}`}
                  className="grid grid-cols-2 gap-2"
                >
                  {(['fund', 'etf'] as const).map((v) => (
                    <Button
                      key={v}
                      role="radio"
                      aria-checked={vehicles[i] === v}
                      variant={vehicles[i] === v ? 'primary' : 'secondary'}
                      disabled={checked}
                      onClick={() => setVehicles(vehicles.map((old, k) => (k === i ? v : old)))}
                    >
                      {t(`fundGame.vehicle.${v}`)}
                    </Button>
                  ))}
                </div>
                {checked && (
                  <p
                    className={vehicles[i] === x.right ? 'text-bull text-sm' : 'text-bear text-sm'}
                  >
                    {vehicles[i] === x.right ? '✓ ' : '✗ '}
                    {t(`fundGame.situationWhy.${x.id}`)}
                  </p>
                )}
              </li>
            ))}
          </ul>
          {!checked ? (
            <Button
              disabled={vehicles.some((v) => v === null)}
              onClick={() => {
                setChecked(true);
                feedback(SITUATIONS.every((x, i) => vehicles[i] === x.right));
              }}
            >
              {t('fundGame.check')}
            </Button>
          ) : (
            <Button onClick={() => setStep('switch')}>{t('fundGame.next')}</Button>
          )}
        </div>
      )}

      {step === 'switch' && (
        <div className="grid gap-3">
          <p>
            {t('fundGame.briefSwitch', {
              value: eur(s.value),
              gain: eur(s.gain),
              rate: pct(TAX * 100, 0),
            })}
          </p>
          {transfer === null ? (
            <div role="radiogroup" aria-label={t('fundGame.askSwitch')} className="grid gap-2">
              <p className="font-medium">{t('fundGame.askSwitch')}</p>
              {[true, false].map((v) => (
                <Button
                  key={String(v)}
                  role="radio"
                  aria-checked={false}
                  variant="secondary"
                  className="justify-start text-left"
                  onClick={() => {
                    setTransfer(v);
                    feedback(v);
                  }}
                >
                  {t(v ? 'fundGame.optTransfer' : 'fundGame.optSell')}
                </Button>
              ))}
            </div>
          ) : (
            <Glow pulse={glow} className="rounded-[var(--radius-md)]">
              <div className="grid gap-3 p-1">
                <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-2">
                  <div>
                    <dt className="text-text-2 text-sm">
                      {t('fundGame.endTransfer', { years: YEARS })}
                    </dt>
                    <dd className="text-xl" data-num data-testid="fg-transfer">
                      {eur(tr.end)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-2 text-sm">
                      {t('fundGame.endSell', { years: YEARS })}
                    </dt>
                    <dd className="text-xl" data-num>
                      {eur(sell.end)}
                    </dd>
                  </div>
                </dl>
                <p
                  role="status"
                  className={transfer ? 'text-bull' : 'text-bear'}
                  data-testid="fg-switch"
                >
                  {transfer ? '✓ ' : '✗ '}
                  {t('fundGame.whySwitch', {
                    tax: eur(sell.tax),
                    gap: eur(tr.end - sell.end),
                    years: YEARS,
                  })}
                </p>
                <Button onClick={() => setStep('done')}>{t('fundGame.summary')}</Button>
              </div>
            </Glow>
          )}
        </div>
      )}
    </section>
  );
}
