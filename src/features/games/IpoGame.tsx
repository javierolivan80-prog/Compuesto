import { useMemo, useRef, useState } from 'react';
import { Button } from '../../components/Button';
import {
  coverage,
  demandAt,
  ipoResult,
  ipoValues,
  NEW_SHARES,
  OFFER,
  outcomeAt,
  PRICES,
  RANGE_MAX,
  RANGE_MIN,
  SHARES_AFTER,
  setupIpo,
  SOLD_SHARES,
} from '../../engine/games/ipo-book';
import { t } from '../../i18n';
import { formatEur, formatNumber } from '../../lib/format';
import { haptic, HAPTIC } from '../../lib/haptics';
import { playSound } from '../../lib/sound';
import { CandleReveal } from './CandleReveal';
import { Glow, PopLayer, shake, usePops } from './kit';
import './ipo-game.css';

interface Props {
  seed: number;
  /** Al terminar y pulsar «Ver qué ha pasado»: las cifras de la partida para la explicación y los ejercicios. */
  onDone: (values: Record<string, number>) => void;
}

type Step = 'prospectus' | 'book' | 'debut' | 'done';

const millions = (n: number) => `${formatNumber(n / 1e6, 2)}\u00a0M`;
const signedPct = (v: number) =>
  Number(Math.abs(v).toFixed(2)) === 0
    ? `${formatNumber(0, 2)}\u00a0%`
    : `${v > 0 ? '▲\u00a0+' : '▼\u00a0−'}${formatNumber(Math.abs(v), 2)}\u00a0%`;

export function IpoGame({ seed, onDone }: Props) {
  const s = useMemo(() => setupIpo(seed), [seed]);
  const [step, setStep] = useState<Step>('prospectus');
  const [price, setPrice] = useState<number>(PRICES[3]!);
  const [failedAt, setFailedAt] = useState<number | null>(null);
  const [formed, setFormed] = useState(false);
  const [glow, setGlow] = useState(0);
  const box = useRef<HTMLElement>(null);
  const { pops, pop } = usePops();
  const r = ipoResult(s, price);
  const maxDemand = demandAt(s, RANGE_MIN);
  const candle = useMemo(
    () => ({
      open: price,
      close: r.first || price,
      high: Math.max(price, r.first) * 1.004,
      low: Math.min(price, r.first || price) * 0.996,
    }),
    [price, r.first],
  );

  const fix = () => {
    if (outcomeAt(s, price) === 'failed') {
      setFailedAt(price);
      playSound('miss');
      haptic(HAPTIC.failure);
      if (box.current) shake(box.current);
      return;
    }
    setFailedAt(null);
    setFormed(false);
    setStep('debut');
  };

  const onFormed = () => {
    if (formed) return;
    setFormed(true);
    if (r.outcome === 'good') {
      setGlow((n) => n + 1);
      playSound('open');
      haptic(HAPTIC.success);
      pop(t('ipo.hit'), 'up', 50, 20);
    } else {
      playSound('miss');
      haptic(HAPTIC.failure);
    }
  };

  if (step === 'done')
    return (
      <section
        aria-labelledby="ipo-done"
        className="ipo-panel grid gap-4 rounded-[var(--radius-md)] border p-4"
        data-testid="ipo-done"
      >
        <h2 id="ipo-done" className="text-3xl">
          {t('ipo.doneTitle')}
        </h2>
        <dl className="grid grid-cols-2 gap-3">
          <div>
            <dt className="text-text-2 text-sm">{t('ipo.price')}</dt>
            <dd className="text-xl" data-num>
              {formatEur(r.price)}
            </dd>
          </div>
          <div>
            <dt className="text-text-2 text-sm">{t('ipo.covShort')}</dt>
            <dd className="text-xl" data-num>
              {formatNumber(r.cov, 2)}×
            </dd>
          </div>
          <div>
            <dt className="text-text-2 text-sm">{t('ipo.toCompany')}</dt>
            <dd className="text-xl" data-num>
              {formatEur(r.opsCash, 0)}
            </dd>
          </div>
          <div>
            <dt className="text-text-2 text-sm">{t('ipo.toFamily')}</dt>
            <dd className="text-xl" data-num>
              {formatEur(r.opvCash, 0)}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-text-2 text-sm">{t('ipo.firstDay')}</dt>
            <dd className="text-xl" data-num data-testid="ipo-first">
              {formatEur(r.first)}{' '}
              <span className={r.pop >= 0 ? 'text-bull' : 'text-bear'}>{signedPct(r.pop)}</span>
            </dd>
          </div>
        </dl>
        <p className="text-lg" data-testid="ipo-verdict">
          {r.score >= 1
            ? t('ipo.great')
            : r.outcome === 'good'
              ? t('ipo.goodLow')
              : t(`ipo.verdict.${r.outcome}`)}
        </p>
        <Button onClick={() => onDone(ipoValues(r))}>{t('ipo.debrief')}</Button>
      </section>
    );

  return (
    <section
      ref={box}
      aria-labelledby="ipo-title"
      className="ipo-panel relative grid gap-4 rounded-[var(--radius-md)] border p-4"
    >
      <header className="grid gap-1">
        <h2 id="ipo-title" className="text-3xl">
          {t('ipo.title')}
        </h2>
        <p className="text-text-2 text-sm" data-testid="ipo-step">
          {t(`ipo.step.${step}`)}
        </p>
      </header>
      <PopLayer pops={pops} />

      {step === 'prospectus' && (
        <div className="grid gap-3">
          <p>{t('ipo.brief')}</p>
          <dl className="ipo-sheet grid gap-2 rounded-[var(--radius-sm)] border p-3">
            <div className="flex items-baseline justify-between gap-3">
              <dt>{t('ipo.ops')}</dt>
              <dd className="whitespace-nowrap" data-num>
                {formatNumber(NEW_SHARES)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt>{t('ipo.opv')}</dt>
              <dd className="whitespace-nowrap" data-num>
                {formatNumber(SOLD_SHARES)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt>{t('ipo.range')}</dt>
              <dd className="whitespace-nowrap" data-num>
                {formatEur(RANGE_MIN)} – {formatEur(RANGE_MAX)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt>{t('ipo.after')}</dt>
              <dd className="whitespace-nowrap" data-num>
                {formatNumber(SHARES_AFTER)}
              </dd>
            </div>
          </dl>
          <p className="text-text-2 text-sm">{t('ipo.cnmv')}</p>
          <Button onClick={() => setStep('book')}>{t('ipo.openBook')}</Button>
        </div>
      )}

      {step === 'book' && (
        <div className="grid gap-3">
          <p>{t('ipo.bookIntro', { offer: formatNumber(OFFER) })}</p>
          <div
            role="radiogroup"
            aria-label={t('ipo.pick')}
            className="grid gap-1"
            data-testid="ipo-book"
          >
            {[...PRICES].reverse().map((p) => {
              const d = demandAt(s, p);
              const covered = d >= OFFER;
              const chosen = p === price;
              return (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={chosen}
                  onClick={() => setPrice(p)}
                  className={`ipo-row grid min-h-12 grid-cols-[4.5rem_1fr_4rem] items-center gap-2 rounded-[var(--radius-sm)] px-2 text-left ${chosen ? 'ipo-chosen' : ''}`}
                >
                  <span data-num>{formatEur(p)}</span>
                  <span className="ipo-track relative h-5" aria-hidden="true">
                    <span
                      className={`ipo-bar absolute inset-y-0 left-0 w-full ${covered ? 'ipo-ok' : 'ipo-short'}`}
                      style={{ transform: `scaleX(${d / maxDemand})` }}
                    />
                    <span
                      className="ipo-offer absolute inset-y-0"
                      style={{ left: `${(OFFER / maxDemand) * 100}%` }}
                    />
                  </span>
                  <span className="text-right" data-num>
                    {formatNumber(coverage(s, p), 1)}×
                  </span>
                </button>
              );
            })}
            <p className="text-text-2 text-xs">{t('ipo.bookNote')}</p>
          </div>
          <p data-testid="ipo-live">
            {t('ipo.live', {
              price: formatEur(price),
              demand: millions(demandAt(s, price)),
              cov: formatNumber(coverage(s, price), 2),
              ops: formatEur(price * NEW_SHARES, 0),
              opv: formatEur(price * SOLD_SHARES, 0),
            })}
          </p>
          {failedAt !== null && failedAt === price && (
            <p role="status" className="text-bear" data-testid="ipo-failed">
              {t('ipo.failed', { demand: millions(demandAt(s, price)), offer: millions(OFFER) })}
            </p>
          )}
          <Button onClick={fix}>{t('ipo.fix', { price: formatEur(price) })}</Button>
        </div>
      )}

      {step === 'debut' && (
        <Glow pulse={glow} className="rounded-[var(--radius-md)]">
          <section aria-label={t('ipo.debut')} className="grid gap-3 p-1">
            <p>{t('ipo.debutIntro', { price: formatEur(price) })}</p>
            <div className="justify-self-center">
              <CandleReveal candle={candle} onDone={onFormed} />
            </div>
            <p className="text-center text-xl" data-num data-testid="ipo-close">
              {formatEur(r.first)}{' '}
              <span className={r.pop >= 0 ? 'text-bull' : 'text-bear'}>{signedPct(r.pop)}</span>
            </p>
            <div hidden={!formed} className="grid gap-2">
              <p role="status" className={r.outcome === 'good' ? 'text-bull' : ''}>
                {r.outcome === 'good' ? '✓ ' : '✗ '}
                {t(`ipo.debutWhy.${r.outcome}`)}
              </p>
              <p className="text-text-2 text-sm">{t('ipo.secondary')}</p>
              <Button onClick={() => setStep('done')}>{t('ipo.summary')}</Button>
            </div>
          </section>
        </Glow>
      )}
    </section>
  );
}
