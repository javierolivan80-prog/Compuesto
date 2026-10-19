import { useMemo, useRef, useState } from 'react';
import { Button } from '../../components/Button';
import {
  CALLS,
  luckResult,
  luckValues,
  mean,
  meanOptions,
  MONTHS,
  NORMAL_TAIL,
  setupLuck,
  stdev,
  TRADERS,
  type LuckAnswer,
} from '../../engine/games/luck-or-skill';
import { t } from '../../i18n';
import { formatNumber } from '../../lib/format';
import { haptic, HAPTIC } from '../../lib/haptics';
import { playSound } from '../../lib/sound';
import { AskStep, PopLayer, shake, usePops } from './kit';
import './luck-game.css';

interface Props {
  seed: number;
  /** Al terminar y pulsar «Ver qué ha pasado»: las cifras de la partida para la explicación y los ejercicios. */
  onDone: (values: Record<string, number>) => void;
}

type Step = 'mean' | 'volatile' | 'tails' | 'genius' | 'done';
const pct = (v: number, d = 2) => `${formatNumber(v, d)}\u00a0%`;
const r2 = (x: number) => Math.round(x * 100) / 100;

/** Las doce rentabilidades mensuales de un fondo como barras (▲ verdes arriba, ▼ rojas abajo). */
function Bars({ xs, label, scale }: { xs: number[]; label: string; scale: number }) {
  return (
    <figure className="grid gap-1">
      <svg
        viewBox="0 0 320 96"
        className="h-auto w-full"
        role="img"
        aria-label={t('luckGame.barsAria', {
          label,
          list: xs.map((x) => formatNumber(x, 1)).join('; '),
        })}
      >
        <line x1="8" x2="312" y1="48" y2="48" stroke="var(--line)" />
        {xs.map((x, i) => {
          const h = (Math.abs(x) / scale) * 44;
          return (
            <rect
              key={i}
              x={14 + i * 25}
              y={x >= 0 ? 48 - h : 48}
              width="18"
              height={Math.max(h, 1)}
              rx="2"
              fill={x >= 0 ? 'var(--bull)' : 'var(--bear)'}
            />
          );
        })}
      </svg>
      <figcaption className="text-text-2 text-sm">{label}</figcaption>
    </figure>
  );
}

export function LuckGame({ seed, onDone }: Props) {
  const s = useMemo(() => setupLuck(seed), [seed]);
  const [step, setStep] = useState<Step>('mean');
  const [answer, setAnswer] = useState<Partial<LuckAnswer>>({});
  const [glow, setGlow] = useState(0);
  const box = useRef<HTMLElement>(null);
  const { pops, pop } = usePops();
  const scale = Math.max(...s.a.map(Math.abs), ...s.b.map(Math.abs));
  const goodMean = r2(mean(s.a));
  const moreVolatile = stdev(s.b) > stdev(s.a) ? 'b' : 'a';

  const feedback = (ok: boolean) => {
    if (ok) {
      setGlow((g) => g + 1);
      playSound('hit');
      haptic(HAPTIC.success);
      pop(t('luckGame.hit'), 'up', 50, 20);
    } else {
      playSound('miss');
      haptic(HAPTIC.failure);
      if (box.current) shake(box.current);
    }
  };

  if (step === 'done') {
    const full: LuckAnswer = {
      mean: answer.mean ?? 0,
      volatile: answer.volatile ?? 'a',
      tails: answer.tails ?? 'normal',
      genius: answer.genius ?? true,
    };
    const r = luckResult(s, full);
    const row = (label: string, ok: boolean) => (
      <div>
        <dt className="text-text-2 text-sm">{label}</dt>
        <dd className={`text-lg ${ok ? 'text-bull' : 'text-bear'}`}>
          {ok ? `✓ ${t('luckGame.yes')}` : `✗ ${t('luckGame.no')}`}
        </dd>
      </div>
    );
    return (
      <section
        aria-labelledby="lg-done"
        className="lg-panel grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
        data-testid="lg-done"
      >
        <h2 id="lg-done" className="text-3xl">
          {t('luckGame.doneTitle')}
        </h2>
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
          {row(t('luckGame.row.mean'), r.meanHit)}
          {row(t('luckGame.row.volatile'), r.volatileHit)}
          {row(t('luckGame.row.tails'), r.tailsHit)}
          {row(t('luckGame.row.genius'), r.geniusHit)}
        </dl>
        <p className="text-lg" data-testid="lg-verdict">
          {r.score >= 1
            ? t('luckGame.great')
            : r.score >= 0.5
              ? t('luckGame.ok')
              : t('luckGame.bad')}
        </p>
        <Button onClick={() => onDone(luckValues(s, full))}>{t('luckGame.debrief')}</Button>
      </section>
    );
  }

  const pick = (key: keyof LuckAnswer, value: LuckAnswer[keyof LuckAnswer], ok: boolean) => {
    setAnswer((a) => ({ ...a, [key]: value }));
    feedback(ok);
  };

  return (
    <section
      ref={box}
      aria-labelledby="lg-title"
      className="lg-panel relative grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
    >
      <header className="grid gap-1">
        <h2 id="lg-title" className="text-3xl">
          {t('luckGame.title')}
        </h2>
        <p className="text-text-2 text-sm" data-testid="lg-step">
          {t(`luckGame.step.${step}`)}
        </p>
      </header>
      <PopLayer pops={pops} />

      {(step === 'mean' || step === 'volatile') && (
        <div className="grid gap-3">
          <p>
            {t(step === 'mean' ? 'luckGame.briefStats' : 'luckGame.briefStatsB', { n: MONTHS })}
          </p>
          <Bars xs={s.a} label={t('luckGame.fundA')} scale={scale} />
          {step === 'volatile' && <Bars xs={s.b} label={t('luckGame.fundB')} scale={scale} />}
          {step === 'mean' ? (
            <AskStep<number>
              question={t('luckGame.askMean')}
              options={meanOptions(s).map((o) => ({ value: o, label: pct(o) }))}
              chosen={answer.mean}
              right={goodMean}
              why={t('luckGame.whyMean', { m: pct(goodMean) })}
              nextLabel={t('luckGame.next')}
              testId="lg-why"
              glow={glow}
              onPick={(v) => pick('mean', v, v === goodMean)}
              onNext={() => setStep('volatile')}
            />
          ) : (
            <AskStep<'a' | 'b'>
              question={t('luckGame.askVolatile', { m: pct(goodMean) })}
              options={(['a', 'b'] as const).map((v) => ({
                value: v,
                label: t(`luckGame.fund.${v}`),
              }))}
              chosen={answer.volatile}
              right={moreVolatile}
              why={t('luckGame.whyVolatile', {
                sa: pct(stdev(s.a)),
                sb: pct(stdev(s.b)),
                minB: pct(Math.min(...s.b), 1),
              })}
              nextLabel={t('luckGame.next')}
              testId="lg-why"
              glow={glow}
              onPick={(v) => pick('volatile', v, v === moreVolatile)}
              onNext={() => setStep('tails')}
            />
          )}
        </div>
      )}

      {step === 'tails' && (
        <div className="grid gap-3">
          <p>{t('luckGame.briefTails')}</p>
          <AskStep<'normal' | 'more'>
            question={t('luckGame.askTails')}
            options={[
              {
                value: 'normal',
                label: t('luckGame.tails.normal', { n: formatNumber(NORMAL_TAIL, 1) }),
              },
              { value: 'more', label: t('luckGame.tails.more') },
            ]}
            chosen={answer.tails}
            right="more"
            why={t('luckGame.whyTails', { n: formatNumber(NORMAL_TAIL, 1), fat: s.fatTailMonths })}
            nextLabel={t('luckGame.next')}
            testId="lg-why"
            glow={glow}
            onPick={(v) => pick('tails', v, v === 'more')}
            onNext={() => setStep('genius')}
          />
        </div>
      )}

      {step === 'genius' && (
        <div className="grid gap-3">
          <p>{t('luckGame.briefGenius', { traders: TRADERS, calls: CALLS, perfect: s.perfect })}</p>
          <AskStep<boolean>
            question={t('luckGame.askGenius')}
            options={[
              { value: true, label: t('luckGame.genius.yes') },
              { value: false, label: t('luckGame.genius.no') },
            ]}
            chosen={answer.genius}
            right={false}
            why={t('luckGame.whyGenius', { traders: TRADERS, calls: CALLS })}
            nextLabel={t('luckGame.summary')}
            testId="lg-why"
            glow={glow}
            onPick={(v) => pick('genius', v, !v)}
            onNext={() => setStep('done')}
          />
        </div>
      )}
    </section>
  );
}
