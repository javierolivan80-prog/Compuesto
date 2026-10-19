import { useMemo, useRef, useState } from 'react';
import { Button } from '../../components/Button';
import {
  dividendOptions,
  futurePnl,
  minDividend,
  pnlOptions,
  PRODUCTS,
  savingOptions,
  setupWindow,
  taxSaving,
  windowResult,
  windowValues,
  type WindowAnswer,
} from '../../engine/games/bank-window';
import { t } from '../../i18n';
import { formatEur, formatNumber } from '../../lib/format';
import { haptic, HAPTIC } from '../../lib/haptics';
import { playSound } from '../../lib/sound';
import { AskStep, PopLayer, shake, usePops } from './kit';
import './window-game.css';

interface Props {
  seed: number;
  /** Al terminar y pulsar «Ver qué ha pasado»: las cifras de la partida para la explicación y los ejercicios. */
  onDone: (values: Record<string, number>) => void;
}

type Step = 'complex' | 'pension' | 'socimi' | 'future' | 'done';
const pct = (v: number) => `${formatNumber(v, 0)}\u00a0%`;
const eur = (v: number) => formatEur(v, 0);
const signedEur = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${formatEur(Math.abs(v), 0)}`;

export function WindowGame({ seed, onDone }: Props) {
  const s = useMemo(() => setupWindow(seed), [seed]);
  const [step, setStep] = useState<Step>('complex');
  const [complex, setComplex] = useState<(boolean | null)[]>(PRODUCTS.map(() => null));
  const [checked, setChecked] = useState(false);
  const [answer, setAnswer] = useState<Partial<Omit<WindowAnswer, 'complex'>>>({});
  const [glow, setGlow] = useState(0);
  const box = useRef<HTMLElement>(null);
  const { pops, pop } = usePops();

  const feedback = (ok: boolean) => {
    if (ok) {
      setGlow((g) => g + 1);
      playSound('hit');
      haptic(HAPTIC.success);
      pop(t('windowGame.hit'), 'up', 50, 20);
    } else {
      playSound('miss');
      haptic(HAPTIC.failure);
      if (box.current) shake(box.current);
    }
  };
  const pick = (key: 'saving' | 'dividend' | 'pnl', value: number, ok: boolean) => {
    setAnswer((a) => ({ ...a, [key]: value }));
    feedback(ok);
  };

  if (step === 'done') {
    const full: WindowAnswer = {
      complex: complex.map((c) => c ?? false),
      saving: answer.saving ?? 0,
      dividend: answer.dividend ?? 0,
      pnl: answer.pnl ?? 0,
    };
    const r = windowResult(s, full);
    const row = (label: string, ok: boolean) => (
      <div>
        <dt className="text-text-2 text-sm">{label}</dt>
        <dd className={`text-lg ${ok ? 'text-bull' : 'text-bear'}`}>
          {ok ? `✓ ${t('windowGame.yes')}` : `✗ ${t('windowGame.no')}`}
        </dd>
      </div>
    );
    return (
      <section
        aria-labelledby="wn-done"
        className="wn-panel grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
        data-testid="wn-done"
      >
        <h2 id="wn-done" className="text-3xl">
          {t('windowGame.doneTitle')}
        </h2>
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
          <div>
            <dt className="text-text-2 text-sm">{t('windowGame.row.complex')}</dt>
            <dd className="text-lg" data-num>
              {t('windowGame.hitsOf', { n: r.complexHits, total: PRODUCTS.length })}
            </dd>
          </div>
          {row(t('windowGame.row.pension'), r.savingHit)}
          {row(t('windowGame.row.socimi'), r.dividendHit)}
          {row(t('windowGame.row.future'), r.pnlHit)}
        </dl>
        <p className="text-lg" data-testid="wn-verdict">
          {r.score >= 1
            ? t('windowGame.great')
            : r.score >= 0.6
              ? t('windowGame.ok')
              : t('windowGame.bad')}
        </p>
        <Button onClick={() => onDone(windowValues(s, full))}>{t('windowGame.debrief')}</Button>
      </section>
    );
  }

  return (
    <section
      ref={box}
      aria-labelledby="wn-title"
      className="wn-panel relative grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
    >
      <header className="grid gap-1">
        <h2 id="wn-title" className="text-3xl">
          {t('windowGame.title')}
        </h2>
        <p className="text-text-2 text-sm" data-testid="wn-step">
          {t(`windowGame.step.${step}`)}
        </p>
      </header>
      <PopLayer pops={pops} />

      {step === 'complex' && (
        <div className="grid gap-3">
          <p>{t('windowGame.briefComplex')}</p>
          <ul className="grid gap-3">
            {PRODUCTS.map((p, i) => (
              <li key={p.id} className="grid gap-2">
                <p id={`wn-p-${p.id}`}>{t(`windowGame.product.${p.id}`)}</p>
                <div
                  role="radiogroup"
                  aria-labelledby={`wn-p-${p.id}`}
                  className="grid grid-cols-2 gap-2"
                >
                  {[false, true].map((v) => (
                    <Button
                      key={String(v)}
                      role="radio"
                      aria-checked={complex[i] === v}
                      variant={complex[i] === v ? 'primary' : 'secondary'}
                      disabled={checked}
                      onClick={() => setComplex(complex.map((old, k) => (k === i ? v : old)))}
                    >
                      {t(v ? 'windowGame.complex' : 'windowGame.simple')}
                    </Button>
                  ))}
                </div>
                {checked && (
                  <p
                    className={complex[i] === p.complex ? 'text-bull text-sm' : 'text-bear text-sm'}
                  >
                    {complex[i] === p.complex ? '✓ ' : '✗ '}
                    {t(`windowGame.productWhy.${p.id}`)}
                  </p>
                )}
              </li>
            ))}
          </ul>
          {!checked ? (
            <Button
              disabled={complex.some((c) => c === null)}
              onClick={() => {
                setChecked(true);
                feedback(PRODUCTS.every((p, i) => complex[i] === p.complex));
              }}
            >
              {t('windowGame.check')}
            </Button>
          ) : (
            <Button onClick={() => setStep('pension')}>{t('windowGame.next')}</Button>
          )}
        </div>
      )}

      {step === 'pension' && (
        <div className="grid gap-3">
          <p>{t('windowGame.briefPension', { c: eur(s.contribution), m: pct(s.marginal) })}</p>
          <AskStep<number>
            question={t('windowGame.askSaving')}
            options={savingOptions(s).map((o) => ({ value: o, label: eur(o) }))}
            chosen={answer.saving}
            right={taxSaving(s)}
            why={t('windowGame.whySaving', {
              c: eur(s.contribution),
              m: pct(s.marginal),
              v: eur(taxSaving(s)),
            })}
            nextLabel={t('windowGame.next')}
            glow={glow}
            testId="wn-why"
            onPick={(v) => pick('saving', v, v === taxSaving(s))}
            onNext={() => setStep('socimi')}
          />
        </div>
      )}

      {step === 'socimi' && (
        <div className="grid gap-3">
          <p>{t('windowGame.briefSocimi', { p: eur(s.rentProfit * 1000) })}</p>
          <AskStep<number>
            question={t('windowGame.askDividend')}
            options={dividendOptions(s).map((o) => ({ value: o, label: eur(o * 1000) }))}
            chosen={answer.dividend}
            right={minDividend(s)}
            why={t('windowGame.whyDividend', { v: eur(minDividend(s) * 1000) })}
            nextLabel={t('windowGame.next')}
            glow={glow}
            testId="wn-why"
            onPick={(v) => pick('dividend', v, v === minDividend(s))}
            onNext={() => setStep('future')}
          />
        </div>
      )}

      {step === 'future' && (
        <div className="grid gap-3">
          <p>{t('windowGame.briefFuture', { units: s.units, f0: s.f0, f1: s.f1 })}</p>
          <AskStep<number>
            question={t('windowGame.askPnl')}
            options={pnlOptions(s).map((o) => ({ value: o, label: signedEur(o) }))}
            chosen={answer.pnl}
            right={futurePnl(s)}
            why={t('windowGame.whyPnl', {
              f0: s.f0,
              f1: s.f1,
              units: s.units,
              v: signedEur(futurePnl(s)),
            })}
            nextLabel={t('windowGame.summary')}
            glow={glow}
            testId="wn-why"
            onPick={(v) => pick('pnl', v, v === futurePnl(s))}
            onNext={() => setStep('done')}
          />
        </div>
      )}
    </section>
  );
}
