import { useMemo, useRef, useState } from 'react';
import { Button } from '../../components/Button';
import {
  atPar,
  BONDS,
  bondResult,
  bondValues,
  COUPON_GRID,
  NOMINAL,
  price,
  priceAfter,
  required,
  setupBond,
  tirOptions,
  YEARS,
} from '../../engine/games/bond-issue';
import { t } from '../../i18n';
import { formatEur, formatNumber } from '../../lib/format';
import { haptic, HAPTIC } from '../../lib/haptics';
import { playSound } from '../../lib/sound';
import { Glow, PopLayer, shake, usePops } from './kit';
import './bond-game.css';

interface Props {
  seed: number;
  /** Al terminar y pulsar «Ver qué ha pasado»: las cifras de la partida para la explicación y los ejercicios. */
  onDone: (values: Record<string, number>) => void;
}

type Step = 'coupon' | 'shock' | 'tir' | 'done';
const pct = (v: number, d = 1) => `${formatNumber(v, d)}\u00a0%`;
const px = (v: number) => formatNumber(v, 2);
const round1 = (v: number) => Math.round(v * 10) / 10;

/** El precio frente a la par (100): una barra que se queda corta o se pasa, con ▲▼ y la cifra. */
function ParGauge({ value, label }: { value: number; label: string }) {
  // 90–110 a lo ancho; la par, en el centro
  const x = Math.min(1, Math.max(0, (value - 90) / 20));
  const diff = value - 100;
  return (
    <figure className="grid gap-1">
      <div className="bg-gauge relative h-3 rounded-full" aria-hidden="true">
        <span className="bg-par" />
        <span className="bg-mark" style={{ transform: `translateX(${x * 100}%)` }}>
          <span />
        </span>
      </div>
      <figcaption className="flex flex-wrap justify-between gap-x-3 text-sm">
        <span className="text-text-2">{label}</span>
        <span
          data-num
          className={Math.abs(diff) < 0.005 ? '' : diff > 0 ? 'text-bull' : 'text-bear'}
        >
          {Math.abs(diff) < 0.005
            ? t('bondGame.atPar')
            : `${diff > 0 ? '▲' : '▼'} ${t(diff > 0 ? 'bondGame.above' : 'bondGame.below', {
                v: px(Math.abs(diff)),
              })}`}
        </span>
      </figcaption>
    </figure>
  );
}

export function BondGame({ seed, onDone }: Props) {
  const s = useMemo(() => setupBond(seed), [seed]);
  const [step, setStep] = useState<Step>('coupon');
  const [coupon, setCoupon] = useState(3);
  const [issued, setIssued] = useState(false);
  const [up, setUp] = useState<boolean | null>(null);
  const [tir, setTir] = useState<number | null>(null);
  const [glow, setGlow] = useState(0);
  const box = useRef<HTMLElement>(null);
  const { pops, pop } = usePops();
  const y = required(s);
  const issuePrice = price(coupon, y, YEARS);
  const raised = (issuePrice / 100) * NOMINAL * BONDS;
  const after = priceAfter(s, coupon);
  const right = Math.round((y + s.shock) * 100) / 100;

  const feedback = (ok: boolean) => {
    if (ok) {
      setGlow((g) => g + 1);
      playSound('hit');
      haptic(HAPTIC.success);
      pop(t('bondGame.hit'), 'up', 50, 20);
    } else {
      playSound('miss');
      haptic(HAPTIC.failure);
      if (box.current) shake(box.current);
    }
  };
  const setC = (v: number) =>
    setCoupon(round1(Math.min(COUPON_GRID.max, Math.max(COUPON_GRID.min, v))));

  if (step === 'done') {
    const answer = { coupon, up: up ?? false, tir: tir ?? 0 };
    const r = bondResult(s, answer);
    const row = (label: string, ok: boolean) => (
      <div>
        <dt className="text-text-2 text-sm">{label}</dt>
        <dd className={`text-lg ${ok ? 'text-bull' : 'text-bear'}`}>
          {ok ? `✓ ${t('bondGame.yes')}` : `✗ ${t('bondGame.no')}`}
        </dd>
      </div>
    );
    return (
      <section
        aria-labelledby="bg-done"
        className="bg-panel grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
        data-testid="bg-done"
      >
        <h2 id="bg-done" className="text-3xl">
          {t('bondGame.doneTitle')}
        </h2>
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
          {row(t('bondGame.row.par'), r.parHit)}
          {row(t('bondGame.row.direction'), r.directionHit)}
          {row(t('bondGame.row.tir'), r.tirHit)}
        </dl>
        <p className="text-lg" data-testid="bg-verdict">
          {r.score >= 1
            ? t('bondGame.great')
            : r.score >= 0.6
              ? t('bondGame.ok')
              : t('bondGame.bad')}
        </p>
        <Button onClick={() => onDone(bondValues(s, answer))}>{t('bondGame.debrief')}</Button>
      </section>
    );
  }

  return (
    <section
      ref={box}
      aria-labelledby="bg-title"
      className="bg-panel relative grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
    >
      <header className="grid gap-1">
        <h2 id="bg-title" className="text-3xl">
          {t('bondGame.title')}
        </h2>
        <p className="text-text-2 text-sm" data-testid="bg-step">
          {t(`bondGame.step.${step}`)}
        </p>
      </header>
      <PopLayer pops={pops} />

      {step === 'coupon' && (
        <div className="grid gap-3">
          <p>
            {t('bondGame.brief', {
              years: YEARS,
              tesoro: pct(s.tesoro),
              spread: pct(s.spread),
              y: pct(y),
              amount: formatEur(NOMINAL * BONDS, 0),
            })}
          </p>
          <label htmlFor="bg-coupon" className="font-medium">
            {t('bondGame.coupon', { v: pct(coupon) })}
          </label>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              aria-label={t('bondGame.less')}
              data-repeat
              disabled={issued || coupon <= COUPON_GRID.min}
              onClick={() => setC(coupon - COUPON_GRID.step)}
            >
              −
            </Button>
            <input
              id="bg-coupon"
              type="range"
              min={COUPON_GRID.min}
              max={COUPON_GRID.max}
              step={COUPON_GRID.step}
              value={coupon}
              disabled={issued}
              onChange={(e) => setC(Number(e.target.value))}
              aria-valuetext={t('bondGame.coupon', { v: pct(coupon) })}
              className="bg-range min-h-12 min-w-0 flex-1"
            />
            <Button
              variant="secondary"
              aria-label={t('bondGame.more')}
              data-repeat
              disabled={issued || coupon >= COUPON_GRID.max}
              onClick={() => setC(coupon + COUPON_GRID.step)}
            >
              +
            </Button>
          </div>
          <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-2">
            <div>
              <dt className="text-text-2 text-sm">{t('bondGame.price')}</dt>
              <dd className="text-2xl" data-num data-testid="bg-price">
                {px(issuePrice)}
              </dd>
            </div>
            <div>
              <dt className="text-text-2 text-sm">{t('bondGame.raised')}</dt>
              <dd className="text-lg" data-num>
                {formatEur(Math.round(raised), 0)}
              </dd>
            </div>
            <div>
              <dt className="text-text-2 text-sm">{t('bondGame.yearly')}</dt>
              <dd className="text-lg" data-num>
                {formatEur(Math.round((coupon / 100) * NOMINAL * BONDS), 0)}
              </dd>
            </div>
          </dl>
          <ParGauge value={issuePrice} label={t('bondGame.vsPar')} />
          {!issued ? (
            <Button
              onClick={() => {
                setIssued(true);
                feedback(atPar(s, coupon));
              }}
            >
              {t('bondGame.issue', { v: pct(coupon) })}
            </Button>
          ) : (
            <Glow pulse={glow} className="rounded-[var(--radius-md)]">
              <div className="grid gap-3 p-1">
                <p
                  role="status"
                  className={atPar(s, coupon) ? 'text-bull' : 'text-bear'}
                  data-testid="bg-why"
                >
                  {atPar(s, coupon) ? '✓ ' : '✗ '}
                  {t(
                    atPar(s, coupon)
                      ? 'bondGame.whyPar'
                      : coupon < y
                        ? 'bondGame.whyLow'
                        : 'bondGame.whyHigh',
                    { c: pct(coupon), y: pct(y), p: px(issuePrice) },
                  )}
                </p>
                <Button onClick={() => setStep('shock')}>{t('bondGame.next')}</Button>
              </div>
            </Glow>
          )}
        </div>
      )}

      {step === 'shock' && (
        <div className="grid gap-3">
          <p>
            {t(s.shock > 0 ? 'bondGame.newsUp' : 'bondGame.newsDown', {
              d: pct(Math.abs(s.shock)),
              y: pct(y),
              ny: pct(y + s.shock),
            })}
          </p>
          {up === null ? (
            <div role="radiogroup" aria-label={t('bondGame.askDirection')} className="grid gap-2">
              <p className="font-medium">{t('bondGame.askDirection')}</p>
              {[true, false].map((v) => (
                <Button
                  key={String(v)}
                  role="radio"
                  aria-checked={false}
                  variant="secondary"
                  onClick={() => {
                    setUp(v);
                    feedback(v === s.shock < 0);
                  }}
                >
                  {t(v ? 'bondGame.up' : 'bondGame.down')}
                </Button>
              ))}
            </div>
          ) : (
            <Glow pulse={glow} className="rounded-[var(--radius-md)]">
              <div className="grid gap-3 p-1">
                <ParGauge value={after} label={t('bondGame.afterLabel')} />
                <p
                  role="status"
                  className={up === s.shock < 0 ? 'text-bull' : 'text-bear'}
                  data-testid="bg-after"
                >
                  {up === s.shock < 0 ? '✓ ' : '✗ '}
                  {t(s.shock > 0 ? 'bondGame.whyDown' : 'bondGame.whyUp', {
                    p: px(after),
                    c: pct(coupon),
                    ny: pct(y + s.shock),
                  })}
                </p>
                <Button onClick={() => setStep('tir')}>{t('bondGame.next')}</Button>
              </div>
            </Glow>
          )}
        </div>
      )}

      {step === 'tir' && (
        <div className="grid gap-3">
          <p>{t('bondGame.tirBrief', { p: px(after), c: pct(coupon), n: YEARS - 1 })}</p>
          {tir === null ? (
            <div role="radiogroup" aria-label={t('bondGame.askTir')} className="grid gap-2">
              <p className="font-medium">{t('bondGame.askTir')}</p>
              {tirOptions(s, coupon).map((o) => (
                <Button
                  key={o}
                  role="radio"
                  aria-checked={false}
                  variant="secondary"
                  onClick={() => {
                    setTir(o);
                    feedback(o === right);
                  }}
                >
                  {pct(o, 2)}
                </Button>
              ))}
            </div>
          ) : (
            <Glow pulse={glow} className="rounded-[var(--radius-md)]">
              <div className="grid gap-3 p-1">
                <p
                  role="status"
                  className={tir === right ? 'text-bull' : 'text-bear'}
                  data-testid="bg-tir"
                >
                  {tir === right ? '✓ ' : '✗ '}
                  {t('bondGame.whyTir', { tir: pct(right, 2), c: pct(coupon), p: px(after) })}
                </p>
                <Button onClick={() => setStep('done')}>{t('bondGame.summary')}</Button>
              </div>
            </Glow>
          )}
        </div>
      )}
    </section>
  );
}
