import { useMemo, useRef, useState } from 'react';
import { Button } from '../../components/Button';
import {
  AMOUNT,
  dollarOptions,
  dollars,
  eurReturn,
  fxResult,
  fxValues,
  hedged,
  rightCompare,
  setupFx,
  unhedged,
  type FxAnswer,
} from '../../engine/games/fx-trip';
import { t } from '../../i18n';
import { formatEur, formatNumber } from '../../lib/format';
import { haptic, HAPTIC } from '../../lib/haptics';
import { playSound } from '../../lib/sound';
import { AskStep, PopLayer, shake, usePops } from './kit';
import './fx-game.css';

interface Props {
  seed: number;
  /** Al terminar y pulsar «Ver qué ha pasado»: las cifras de la partida para la explicación y los ejercicios. */
  onDone: (values: Record<string, number>) => void;
}

type Step = 'buy' | 'year' | 'hedge' | 'done';
const pct = (v: number, d = 1) => `${formatNumber(v, d)}\u00a0%`;
const usd = (v: number) => `${formatNumber(Math.round(v))}\u00a0$`;
const eur = (v: number) => formatEur(Math.round(v), 0);

export function FxGame({ seed, onDone }: Props) {
  const s = useMemo(() => setupFx(seed), [seed]);
  const [step, setStep] = useState<Step>('buy');
  const [answer, setAnswer] = useState<Partial<FxAnswer>>({});
  const [glow, setGlow] = useState(0);
  const box = useRef<HTMLElement>(null);
  const { pops, pop } = usePops();

  const feedback = (ok: boolean) => {
    if (ok) {
      setGlow((g) => g + 1);
      playSound('hit');
      haptic(HAPTIC.success);
      pop(t('fxGame.hit'), 'up', 50, 20);
    } else {
      playSound('miss');
      haptic(HAPTIC.failure);
      if (box.current) shake(box.current);
    }
  };
  const pick = (key: keyof FxAnswer, value: FxAnswer[keyof FxAnswer], ok: boolean) => {
    setAnswer((a) => ({ ...a, [key]: value }));
    feedback(ok);
  };

  if (step === 'done') {
    const full: FxAnswer = {
      dollars: answer.dollars ?? 0,
      compare: answer.compare ?? 'more',
      hedge: answer.hedge ?? false,
    };
    const r = fxResult(s, full);
    const row = (label: string, ok: boolean) => (
      <div>
        <dt className="text-text-2 text-sm">{label}</dt>
        <dd className={`text-lg ${ok ? 'text-bull' : 'text-bear'}`}>
          {ok ? `✓ ${t('fxGame.yes')}` : `✗ ${t('fxGame.no')}`}
        </dd>
      </div>
    );
    return (
      <section
        aria-labelledby="xg-done"
        className="xg-panel grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
        data-testid="xg-done"
      >
        <h2 id="xg-done" className="text-3xl">
          {t('fxGame.doneTitle')}
        </h2>
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
          {row(t('fxGame.row.dollars'), r.dollarsHit)}
          {row(t('fxGame.row.compare'), r.compareHit)}
          {row(t('fxGame.row.hedge'), r.hedgeHit)}
        </dl>
        <p className="text-lg" data-testid="xg-verdict">
          {r.score >= 1 ? t('fxGame.great') : r.score >= 0.6 ? t('fxGame.ok') : t('fxGame.bad')}
        </p>
        <Button onClick={() => onDone(fxValues(s, full))}>{t('fxGame.debrief')}</Button>
      </section>
    );
  }

  return (
    <section
      ref={box}
      aria-labelledby="xg-title"
      className="xg-panel relative grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
    >
      <header className="grid gap-1">
        <h2 id="xg-title" className="text-3xl">
          {t('fxGame.title')}
        </h2>
        <p className="text-text-2 text-sm" data-testid="xg-step">
          {t(`fxGame.step.${step}`)}
        </p>
      </header>
      <PopLayer pops={pops} />

      {step === 'buy' && (
        <div className="grid gap-3">
          <p>{t('fxGame.briefBuy', { amount: eur(AMOUNT), rate: formatNumber(s.rate0, 2) })}</p>
          <AskStep<number>
            question={t('fxGame.askDollars')}
            options={dollarOptions(s).map((o) => ({ value: o, label: usd(o) }))}
            chosen={answer.dollars}
            right={Math.round(dollars(s))}
            why={t('fxGame.whyDollars', {
              amount: eur(AMOUNT),
              rate: formatNumber(s.rate0, 2),
              usd: usd(dollars(s)),
            })}
            nextLabel={t('fxGame.next')}
            glow={glow}
            testId="xg-why"
            onPick={(v) => pick('dollars', v, v === Math.round(dollars(s)))}
            onNext={() => setStep('year')}
          />
        </div>
      )}

      {step === 'year' && (
        <div className="grid gap-3">
          <p>
            {t('fxGame.briefYear', {
              etf: pct(s.etf, 0),
              rate0: formatNumber(s.rate0, 2),
              rate1: formatNumber(s.rate1, 2),
            })}
          </p>
          <AskStep<'more' | 'less'>
            question={t('fxGame.askCompare', { etf: pct(s.etf, 0) })}
            options={[
              { value: 'more', label: t('fxGame.compare.more', { etf: pct(s.etf, 0) }) },
              { value: 'less', label: t('fxGame.compare.less', { etf: pct(s.etf, 0) }) },
            ]}
            chosen={answer.compare}
            right={rightCompare(s)}
            why={t(rightCompare(s) === 'less' ? 'fxGame.whyLess' : 'fxGame.whyMore', {
              usdEnd: usd(dollars(s) * (1 + s.etf / 100)),
              rate1: formatNumber(s.rate1, 2),
              eurEnd: eur(unhedged(s)),
              ret: pct(eurReturn(s), 2),
            })}
            nextLabel={t('fxGame.next')}
            glow={glow}
            testId="xg-why"
            onPick={(v) => pick('compare', v, v === rightCompare(s))}
            onNext={() => setStep('hedge')}
          />
        </div>
      )}

      {step === 'hedge' && (
        <div className="grid gap-3">
          <p>{t('fxGame.briefHedge', { cost: pct(s.hedgeCost) })}</p>
          <AskStep<boolean>
            question={t('fxGame.askHedge')}
            options={[
              { value: true, label: t('fxGame.hedge.yes', { cost: pct(s.hedgeCost) }) },
              { value: false, label: t('fxGame.hedge.no') },
            ]}
            chosen={answer.hedge}
            right
            why={t('fxGame.whyHedge', {
              hedged: eur(hedged(s)),
              ret: pct(s.etf - s.hedgeCost),
              cost: pct(s.hedgeCost),
            })}
            nextLabel={t('fxGame.summary')}
            glow={glow}
            testId="xg-why"
            onPick={(v) => pick('hedge', v, v)}
            onNext={() => setStep('done')}
          />
        </div>
      )}
    </section>
  );
}
