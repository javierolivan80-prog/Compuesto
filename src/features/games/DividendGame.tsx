import { useMemo, useRef, useState } from 'react';
import { AnimatedNumber } from '../../components/AnimatedNumber';
import { Button } from '../../components/Button';
import {
  BROKERS,
  CAPTURE_QTY,
  cheapestBroker,
  commission,
  dividendResult,
  dividendValues,
  RETENTION,
  setupDividend,
  type ExGuess,
} from '../../engine/games/dividend-day';
import { t } from '../../i18n';
import { formatEur, formatNumber } from '../../lib/format';
import { haptic, HAPTIC } from '../../lib/haptics';
import { playSound } from '../../lib/sound';
import { CandleReveal } from './CandleReveal';
import { Glow, PopLayer, shake, usePops } from './kit';
import './dividend-game.css';

interface Props {
  seed: number;
  /** Al terminar y pulsar «Ver qué ha pasado»: las cifras de la partida para la explicación y los ejercicios. */
  onDone: (values: Record<string, number>) => void;
}

type Step = 'broker' | 'meeting' | 'ex' | 'pay' | 'done';

export function DividendGame({ seed, onDone }: Props) {
  const s = useMemo(() => setupDividend(seed), [seed]);
  const [step, setStep] = useState<Step>('broker');
  const [broker, setBroker] = useState<number | null>(null);
  const [capture, setCapture] = useState<boolean | null>(null);
  const [exGuess, setExGuess] = useState<ExGuess | null>(null);
  const [formed, setFormed] = useState(false);
  const [glow, setGlow] = useState(0);
  const box = useRef<HTMLElement>(null);
  const { pops, pop } = usePops();
  const cheapest = cheapestBroker(s);
  const amount = s.n * s.p0;
  const candle = useMemo(
    () => ({
      open: s.pBefore,
      close: s.pEx,
      high: s.pBefore * 1.002,
      low: s.pEx * 0.998,
    }),
    [s],
  );
  const r = dividendResult(s, {
    broker: broker ?? 0,
    capture: !!capture,
    exGuess: exGuess ?? 'same',
  });

  const feedback = (ok: boolean) => {
    if (ok) {
      setGlow((n) => n + 1);
      playSound('hit');
      haptic(HAPTIC.success);
      pop(t('dividend.hit'), 'up', 50, 20);
    } else {
      playSound('miss');
      haptic(HAPTIC.failure);
      if (box.current) shake(box.current);
    }
  };

  const day = {
    broker: t('dividend.day.broker'),
    meeting: t('dividend.day.meeting'),
    ex: t('dividend.day.ex'),
    pay: t('dividend.day.pay'),
    done: t('dividend.day.done'),
  }[step];
  const stepNo = ['broker', 'meeting', 'ex', 'pay', 'done'].indexOf(step) + 1;

  if (step === 'done')
    return (
      <section
        aria-labelledby="dv-done"
        className="dv-panel grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
        data-testid="dv-done"
      >
        <p className="text-text-2 text-sm">
          {t('dividend.stepOf', { n: 5, total: 5 })} · {day}
        </p>
        <h2 id="dv-done" className="text-3xl">
          {t('dividend.doneTitle', { price: formatEur(s.pEnd) })}
        </h2>
        <dl
          className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3"
          data-num
        >
          <div>
            <dt className="text-text-2 text-sm">{t('dividend.cost')}</dt>
            <dd className="text-xl">{formatEur(r.cost)}</dd>
          </div>
          <div>
            <dt className="text-text-2 text-sm">{t('dividend.sale')}</dt>
            <dd className="text-xl">{formatEur(r.sale)}</dd>
          </div>
          <div>
            <dt className="text-text-2 text-sm">{t('dividend.gain')}</dt>
            <dd className={`text-xl ${r.gain >= 0 ? 'text-bull' : 'text-bear'}`}>
              {r.gain >= 0 ? '+' : '−'}
              {formatEur(Math.abs(r.gain))}
            </dd>
          </div>
          <div>
            <dt className="text-text-2 text-sm">{t('dividend.grossShort')}</dt>
            <dd className="text-bull text-xl">+{formatEur(r.gross)}</dd>
          </div>
          <div className="col-span-full">
            <dt className="text-text-2 text-sm">{t('dividend.total', { n: formatNumber(s.n) })}</dt>
            <dd
              className={`text-2xl ${r.total >= 0 ? 'text-bull' : 'text-bear'}`}
              data-testid="dv-total"
            >
              {r.total >= 0 ? '▲ +' : '▼ −'}
              {formatNumber(Math.abs(r.total), 2)} %
            </dd>
          </div>
          {capture && (
            <div className="col-span-full">
              <dt className="text-text-2 text-sm">
                {t('dividend.captureLine', { n: formatNumber(CAPTURE_QTY) })}
              </dt>
              <dd className="text-bear text-xl" data-testid="dv-capture-cost">
                −{formatEur(r.capLoss)}
              </dd>
            </div>
          )}
        </dl>
        <p className="text-lg" data-testid="dv-verdict">
          {r.score >= 1
            ? t('dividend.great')
            : r.score >= 0.6
              ? t('dividend.ok')
              : t('dividend.bad')}
        </p>
        <Button onClick={() => onDone(dividendValues(r))}>{t('dividend.debrief')}</Button>
      </section>
    );

  return (
    <section
      ref={box}
      aria-labelledby="dv-title"
      className="dv-panel relative grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
    >
      <header className="grid gap-1">
        <h2 id="dv-title" className="text-3xl">
          {t('dividend.title')}
        </h2>
        <p className="text-text-2 text-sm" data-testid="dv-step">
          {t('dividend.stepOf', { n: stepNo, total: 5 })} · {day}
        </p>
      </header>
      <PopLayer pops={pops} />

      {step === 'broker' && (
        <div className="grid gap-3">
          <p>
            {t('dividend.brief', {
              n: formatNumber(s.n),
              price: formatEur(s.p0),
              amount: formatEur(amount),
            })}
          </p>
          <div className="grid gap-2" role="group" aria-label={t('dividend.pickBroker')}>
            {BROKERS.map((b, i) => {
              const fee = commission(b, amount);
              const chosen = broker === i;
              return (
                <div key={b.id} className="grid gap-1">
                  <Button
                    variant={chosen ? 'primary' : 'secondary'}
                    aria-pressed={chosen}
                    disabled={broker !== null}
                    onClick={() => {
                      setBroker(i);
                      feedback(i === cheapest);
                    }}
                    className="justify-start text-left"
                  >
                    {t(`dividend.brokers.${b.id}.name`)} · {t(`dividend.brokers.${b.id}.fee`)}
                  </Button>
                  {broker !== null && (
                    <p className="text-text-2 px-1 text-sm" data-num>
                      {i === cheapest ? '✓ ' : ''}
                      {t('dividend.feeFor', { fee: formatEur(fee) })}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          {broker !== null && (
            <>
              <p role="status" className={broker === cheapest ? 'text-bull' : ''}>
                {broker === cheapest ? t('dividend.brokerRight') : t('dividend.brokerWrong')}
              </p>
              <Button onClick={() => setStep('meeting')}>{t('dividend.next')}</Button>
            </>
          )}
        </div>
      )}

      {step === 'meeting' && (
        <div className="grid gap-3">
          <Glow pulse={glow} className="rounded-[var(--radius-md)]">
            <article className="border-line bg-surface-2 grid gap-1 rounded-[var(--radius-md)] border-y-2 p-4">
              <p className="text-text-2 text-xs tracking-widest uppercase">{t('dividend.paper')}</p>
              <h3 className="text-2xl leading-tight">
                {t('dividend.announce', { div: formatEur(s.div) })}
              </h3>
            </article>
          </Glow>
          <p>{t('dividend.captureAsk', { n: formatNumber(CAPTURE_QTY) })}</p>
          {capture === null ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setCapture(true);
                  feedback(false);
                }}
              >
                {t('dividend.captureYes', { n: formatNumber(CAPTURE_QTY) })}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setCapture(false);
                  feedback(true);
                }}
              >
                {t('dividend.captureNo')}
              </Button>
            </div>
          ) : (
            <>
              <p role="status" className={!capture ? 'text-bull' : ''}>
                {capture
                  ? t('dividend.captureDone', { n: formatNumber(CAPTURE_QTY) })
                  : t('dividend.captureSkip')}
              </p>
              <Button onClick={() => setStep('ex')}>{t('dividend.next')}</Button>
            </>
          )}
        </div>
      )}

      {step === 'ex' && (
        <div className="grid gap-3">
          <p>{t('dividend.exAsk', { price: formatEur(s.pBefore), div: formatEur(s.div) })}</p>
          {exGuess === null ? (
            <div className="grid gap-2" role="group" aria-label={t('dividend.exGroup')}>
              {(['down', 'same', 'up'] as const).map((g) => (
                <Button
                  key={g}
                  variant="secondary"
                  onClick={() => {
                    setExGuess(g);
                    setFormed(false);
                  }}
                >
                  {t(`dividend.ex.${g}`, {
                    price: formatEur(
                      g === 'down' ? s.pEx : g === 'up' ? s.pBefore + s.div : s.pBefore,
                    ),
                  })}
                </Button>
              ))}
            </div>
          ) : (
            <section aria-label={t('dividend.exResult')} className="grid gap-3">
              <div className="justify-self-center">
                <CandleReveal
                  candle={candle}
                  onDone={() => {
                    if (formed) return;
                    setFormed(true);
                    feedback(exGuess === 'down');
                  }}
                />
              </div>
              <p className="text-center text-xl" data-num data-testid="dv-ex">
                ▼ {formatEur(s.pEx)}
              </p>
              <div hidden={!formed} className="grid gap-2">
                <p role="status" className={exGuess === 'down' ? 'text-bull' : ''}>
                  {exGuess === 'down' ? '✓ ' : '✗ '}
                  {t('dividend.exWhy', { div: formatEur(s.div) })}
                </p>
                {capture && (
                  <p data-testid="dv-capture">
                    {t('dividend.captureResult', {
                      n: formatNumber(CAPTURE_QTY),
                      loss: formatEur(r.capLoss),
                      retained: formatEur((CAPTURE_QTY * s.div * RETENTION) / 100),
                    })}
                  </p>
                )}
                <Button onClick={() => setStep('pay')}>{t('dividend.next')}</Button>
              </div>
            </section>
          )}
        </div>
      )}

      {step === 'pay' && (
        <div className="grid gap-3">
          <p>{t('dividend.payIntro', { n: formatNumber(s.n), div: formatEur(s.div) })}</p>
          <dl className="dv-ledger grid gap-1 rounded-[var(--radius-sm)] border p-3">
            <div className="flex items-baseline justify-between gap-3">
              <dt>{t('dividend.gross')}</dt>
              <dd data-num>{formatEur(r.gross)}</dd>
            </div>
            <div className="text-bear flex items-baseline justify-between gap-3">
              <dt>{t('dividend.retention', { pct: RETENTION })}</dt>
              <dd data-num>−{formatEur(r.retained)}</dd>
            </div>
            <div className="border-line flex items-baseline justify-between gap-3 border-t pt-1">
              <dt>{t('dividend.net')}</dt>
              <dd className="text-2xl whitespace-nowrap" data-num data-testid="dv-net">
                <AnimatedNumber value={r.net} initial={0} format={(v) => formatEur(v)} />
              </dd>
            </div>
          </dl>
          <p className="text-text-2 text-sm">{t('dividend.retentionNote')}</p>
          <Button onClick={() => setStep('done')}>{t('dividend.sell')}</Button>
        </div>
      )}
    </section>
  );
}
