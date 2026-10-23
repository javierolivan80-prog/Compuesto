import { useMemo, useRef, useState } from 'react';
import { Button } from '../../components/Button';
import {
  ecbResult,
  ecbValues,
  extraInterest,
  mortgageOptions,
  RIGHT_QE,
  rightFx,
  setupEcb,
  SPREAD,
  surpriseBp,
  taylor,
  taylorOptions,
  TARGET,
  type EcbAnswer,
  type FxMove,
  type QeEffect,
} from '../../engine/games/ecb-meeting';
import { t } from '../../i18n';
import { formatEur, formatNumber } from '../../lib/format';
import { haptic, HAPTIC } from '../../lib/haptics';
import { playSound } from '../../lib/sound';
import { AskStep, PopLayer, shake, usePops } from './kit';
import './ecb-game.css';

interface Props {
  seed: number;
  /** Al terminar y pulsar «Ver qué ha pasado»: las cifras de la partida para la explicación y los ejercicios. */
  onDone: (values: Record<string, number>) => void;
}

type Step = 'taylor' | 'decision' | 'mortgage' | 'qe' | 'done';
/** Sin ceros sobrantes: 4 %, 4,5 %, 2,75 %. */
const num = (v: number) =>
  formatNumber(v, Number.isInteger(v) ? 0 : Number.isInteger(Math.round(v * 100) / 10) ? 1 : 2);
const pct = (v: number) => `${num(v)}\u00a0%`;
const bp = (v: number) => t('ecbGame.bp', { v: formatNumber(Math.abs(v)) });
const eur = (v: number) => formatEur(v, 0);

/** Lo descontado frente a lo decidido, como en la pantalla de la mesa. */
function Board({ priced, move }: { priced: number; move: number }) {
  const diff = move - priced;
  const signed = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${bp(v)}`;
  return (
    <dl
      className="eg-board grid grid-cols-[repeat(auto-fit,minmax(min(100%,5.5rem),1fr))] gap-2 rounded-[var(--radius-sm)] border p-3"
      data-num
    >
      <div>
        <dt className="text-text-2 text-sm">{t('ecbGame.board.priced')}</dt>
        <dd className="text-xl">{signed(priced)}</dd>
      </div>
      <div>
        <dt className="text-text-2 text-sm">{t('ecbGame.board.move')}</dt>
        <dd className="text-xl">{signed(move)}</dd>
      </div>
      <div>
        <dt className="text-text-2 text-sm">{t('ecbGame.board.surprise')}</dt>
        <dd className="text-xl" data-testid="eg-surprise">
          {`${diff > 0 ? '▲ ' : diff < 0 ? '▼ ' : ''}${signed(diff)}`}
        </dd>
      </div>
    </dl>
  );
}

export function EcbGame({ seed, onDone }: Props) {
  const s = useMemo(() => setupEcb(seed), [seed]);
  const [step, setStep] = useState<Step>('taylor');
  const [answer, setAnswer] = useState<Partial<EcbAnswer>>({});
  const [glow, setGlow] = useState(0);
  const box = useRef<HTMLElement>(null);
  const { pops, pop } = usePops();

  const feedback = (ok: boolean) => {
    if (ok) {
      setGlow((g) => g + 1);
      playSound('hit');
      haptic(HAPTIC.success);
      pop(t('ecbGame.hit'), 'up', 50, 20);
    } else {
      playSound('miss');
      haptic(HAPTIC.failure);
      if (box.current) shake(box.current);
    }
  };
  const pick = (key: keyof EcbAnswer, value: EcbAnswer[keyof EcbAnswer], ok: boolean) => {
    setAnswer((a) => ({ ...a, [key]: value }));
    feedback(ok);
  };

  if (step === 'done') {
    const full: EcbAnswer = {
      taylor: answer.taylor ?? 0,
      fx: answer.fx ?? (rightFx(s) === 'up' ? 'down' : 'up'),
      extra: answer.extra ?? 0,
      qe: answer.qe ?? 'none',
    };
    const r = ecbResult(s, full);
    const row = (label: string, ok: boolean) => (
      <div>
        <dt className="text-text-2 text-sm">{label}</dt>
        <dd className={`text-lg ${ok ? 'text-bull' : 'text-bear'}`}>
          {ok ? `✓ ${t('ecbGame.yes')}` : `✗ ${t('ecbGame.no')}`}
        </dd>
      </div>
    );
    return (
      <section
        aria-labelledby="eg-done"
        className="eg-panel grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
        data-testid="eg-done"
      >
        <h2 id="eg-done" className="text-3xl">
          {t('ecbGame.doneTitle')}
        </h2>
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
          {row(t('ecbGame.row.taylor'), r.taylorHit)}
          {row(t('ecbGame.row.fx'), r.fxHit)}
          {row(t('ecbGame.row.mortgage'), r.extraHit)}
          {row(t('ecbGame.row.qe'), r.qeHit)}
        </dl>
        <p className="text-lg" data-testid="eg-verdict">
          {r.score >= 1 ? t('ecbGame.great') : r.score >= 0.5 ? t('ecbGame.ok') : t('ecbGame.bad')}
        </p>
        <Button onClick={() => onDone(ecbValues(s, full))}>{t('ecbGame.debrief')}</Button>
      </section>
    );
  }

  const rates = { neutral: pct(s.neutral), inflation: pct(s.inflation), target: pct(TARGET) };
  const move = s.moveBp > 0 ? 'hike' : s.moveBp < 0 ? 'cut' : 'hold';
  const mortgage = {
    principal: eur(s.principal),
    e0: pct(s.euribor0),
    e1: pct(s.euribor1),
  };

  return (
    <section
      ref={box}
      aria-labelledby="eg-title"
      className="eg-panel relative grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
    >
      <header className="grid gap-1">
        <h2 id="eg-title" className="text-3xl">
          {t('ecbGame.title')}
        </h2>
        <p className="text-text-2 text-sm" data-testid="eg-step">
          {t(`ecbGame.step.${step}`)}
        </p>
      </header>
      <PopLayer pops={pops} />

      {step === 'taylor' && (
        <div className="grid gap-3">
          <p>{t('ecbGame.briefTaylor', rates)}</p>
          <AskStep<number>
            question={t('ecbGame.askTaylor')}
            options={taylorOptions(s).map((o) => ({ value: o, label: pct(o) }))}
            chosen={answer.taylor}
            right={taylor(s)}
            why={t('ecbGame.whyTaylor', { ...rates, v: pct(taylor(s)) })}
            nextLabel={t('ecbGame.next')}
            glow={glow}
            testId="eg-why"
            onPick={(v) => pick('taylor', v, v === taylor(s))}
            onNext={() => setStep('decision')}
          />
        </div>
      )}

      {step === 'decision' && (
        <div className="grid gap-3">
          <p>
            {t(`ecbGame.priced.${s.pricedBp > 0 ? 'hike' : 'hold'}`, { bp: bp(s.pricedBp) })}{' '}
            {t(`ecbGame.move.${move}`, { bp: bp(s.moveBp) })}
          </p>
          <Board priced={s.pricedBp} move={s.moveBp} />
          <AskStep<FxMove>
            question={t('ecbGame.askFx')}
            options={(['up', 'down', 'flat'] as const).map((v) => ({
              value: v,
              label: t(`ecbGame.fx.${v}`),
            }))}
            chosen={answer.fx}
            right={rightFx(s)}
            why={t(`ecbGame.whyFx.${rightFx(s)}`, { surprise: bp(surpriseBp(s)) })}
            nextLabel={t('ecbGame.next')}
            glow={glow}
            testId="eg-why"
            onPick={(v) => pick('fx', v, v === rightFx(s))}
            onNext={() => setStep('mortgage')}
          />
        </div>
      )}

      {step === 'mortgage' && (
        <div className="grid gap-3">
          <p>{t('ecbGame.briefMortgage', { ...mortgage, spread: pct(SPREAD) })}</p>
          <AskStep<number>
            question={t('ecbGame.askMortgage')}
            options={mortgageOptions(s).map((o) => ({ value: o, label: eur(o) }))}
            chosen={answer.extra}
            right={extraInterest(s)}
            why={t('ecbGame.whyMortgage', { ...mortgage, v: eur(extraInterest(s)) })}
            nextLabel={t('ecbGame.next')}
            glow={glow}
            testId="eg-why"
            onPick={(v) => pick('extra', v, v === extraInterest(s))}
            onNext={() => setStep('qe')}
          />
        </div>
      )}

      {step === 'qe' && (
        <div className="grid gap-3">
          <p>{t('ecbGame.briefQe')}</p>
          <AskStep<QeEffect>
            question={t('ecbGame.askQe')}
            options={(['priceUp', 'priceDown', 'none'] as const).map((v) => ({
              value: v,
              label: t(`ecbGame.qe.${v}`),
            }))}
            chosen={answer.qe}
            right={RIGHT_QE}
            why={t('ecbGame.whyQe')}
            nextLabel={t('ecbGame.summary')}
            glow={glow}
            testId="eg-why"
            onPick={(v) => pick('qe', v, v === RIGHT_QE)}
            onNext={() => setStep('done')}
          />
        </div>
      )}
    </section>
  );
}
