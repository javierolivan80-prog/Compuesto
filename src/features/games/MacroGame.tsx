import { useMemo, useRef, useState } from 'react';
import { Button } from '../../components/Button';
import {
  macroResult,
  macroValues,
  rateOptions,
  rightBondMove,
  rightCycle,
  setupMacro,
  surprise,
  unemploymentRate,
  yoy,
  yoyOptions,
  type BondMove,
  type Cycle,
  type MacroAnswer,
} from '../../engine/games/macro-day';
import { t } from '../../i18n';
import { formatNumber } from '../../lib/format';
import { haptic, HAPTIC } from '../../lib/haptics';
import { playSound } from '../../lib/sound';
import { AskStep, PopLayer, shake, usePops } from './kit';
import './macro-game.css';

interface Props {
  seed: number;
  /** Al terminar y pulsar «Ver qué ha pasado»: las cifras de la partida para la explicación y los ejercicios. */
  onDone: (values: Record<string, number>) => void;
}

type Step = 'cpi' | 'surprise' | 'pmi' | 'jobs' | 'done';
const pct = (v: number) => `${formatNumber(v, 1)}\u00a0%`;
/** Con signo; nunca «−0,0». */
const signed = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${formatNumber(Math.abs(v), 1)}`;
const mill = (v: number) => t('macroGame.millions', { v: formatNumber(v, 2) });

/** El dato frente al consenso, como en la pantalla de la mesa. */
function Board({ consensus, actual }: { consensus: number; actual: number }) {
  const diff = Math.round((actual - consensus) * 10) / 10;
  return (
    <dl className="mg-board grid grid-cols-[repeat(auto-fit,minmax(min(100%,5.5rem),1fr))] gap-2 rounded-[var(--radius-sm)] border p-3" data-num>
      <div>
        <dt className="text-text-2 text-sm">{t('macroGame.board.consensus')}</dt>
        <dd className="text-xl">{pct(consensus)}</dd>
      </div>
      <div>
        <dt className="text-text-2 text-sm">{t('macroGame.board.actual')}</dt>
        <dd className="text-xl">{pct(actual)}</dd>
      </div>
      <div>
        <dt className="text-text-2 text-sm">{t('macroGame.board.surprise')}</dt>
        <dd className="text-xl" data-testid="mg-surprise">
          {`${diff > 0 ? '▲ ' : '▼ '}${signed(diff)}`}
        </dd>
      </div>
    </dl>
  );
}

export function MacroGame({ seed, onDone }: Props) {
  const s = useMemo(() => setupMacro(seed), [seed]);
  const [step, setStep] = useState<Step>('cpi');
  const [answer, setAnswer] = useState<Partial<MacroAnswer>>({});
  const [glow, setGlow] = useState(0);
  const box = useRef<HTMLElement>(null);
  const { pops, pop } = usePops();

  const feedback = (ok: boolean) => {
    if (ok) {
      setGlow((g) => g + 1);
      playSound('hit');
      haptic(HAPTIC.success);
      pop(t('macroGame.hit'), 'up', 50, 20);
    } else {
      playSound('miss');
      haptic(HAPTIC.failure);
      if (box.current) shake(box.current);
    }
  };
  const pick = (key: keyof MacroAnswer, value: MacroAnswer[keyof MacroAnswer], ok: boolean) => {
    setAnswer((a) => ({ ...a, [key]: value }));
    feedback(ok);
  };

  if (step === 'done') {
    const full: MacroAnswer = {
      yoy: answer.yoy ?? 0,
      bond: answer.bond ?? 'flat',
      cycle: answer.cycle ?? (rightCycle(s) === 'expansion' ? 'contraction' : 'expansion'),
      rate: answer.rate ?? 0,
    };
    const r = macroResult(s, full);
    const row = (label: string, ok: boolean) => (
      <div>
        <dt className="text-text-2 text-sm">{label}</dt>
        <dd className={`text-lg ${ok ? 'text-bull' : 'text-bear'}`}>
          {ok ? `✓ ${t('macroGame.yes')}` : `✗ ${t('macroGame.no')}`}
        </dd>
      </div>
    );
    return (
      <section
        aria-labelledby="mg-done"
        className="mg-panel grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
        data-testid="mg-done"
      >
        <h2 id="mg-done" className="text-3xl">
          {t('macroGame.doneTitle')}
        </h2>
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
          {row(t('macroGame.row.cpi'), r.yoyHit)}
          {row(t('macroGame.row.surprise'), r.bondHit)}
          {row(t('macroGame.row.pmi'), r.cycleHit)}
          {row(t('macroGame.row.jobs'), r.rateHit)}
        </dl>
        <p className="text-lg" data-testid="mg-verdict">
          {r.score >= 1
            ? t('macroGame.great')
            : r.score >= 0.5
              ? t('macroGame.ok')
              : t('macroGame.bad')}
        </p>
        <Button onClick={() => onDone(macroValues(s, full))}>{t('macroGame.debrief')}</Button>
      </section>
    );
  }

  return (
    <section
      ref={box}
      aria-labelledby="mg-title"
      className="mg-panel relative grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
    >
      <header className="grid gap-1">
        <h2 id="mg-title" className="text-3xl">
          {t('macroGame.title')}
        </h2>
        <p className="text-text-2 text-sm" data-testid="mg-step">
          {t(`macroGame.step.${step}`)}
        </p>
      </header>
      <PopLayer pops={pops} />

      {step === 'cpi' && (
        <div className="grid gap-3">
          <p>
            {t('macroGame.briefCpi', {
              prev: formatNumber(s.cpiPrev, 1),
              now: formatNumber(s.cpiNow, 1),
            })}
          </p>
          <AskStep<number>
            question={t('macroGame.askCpi')}
            options={yoyOptions(s).map((o) => ({ value: o, label: pct(o) }))}
            chosen={answer.yoy}
            right={yoy(s)}
            why={t('macroGame.whyCpi', {
              prev: formatNumber(s.cpiPrev, 1),
              now: formatNumber(s.cpiNow, 1),
              v: pct(yoy(s)),
            })}
            nextLabel={t('macroGame.next')}
            glow={glow}
            testId="mg-why"
            onPick={(v) => pick('yoy', v, v === yoy(s))}
            onNext={() => setStep('surprise')}
          />
        </div>
      )}

      {step === 'surprise' && (
        <div className="grid gap-3">
          <p>{t('macroGame.briefSurprise')}</p>
          <Board consensus={s.consensus} actual={yoy(s)} />
          <AskStep<BondMove>
            question={t('macroGame.askBond')}
            options={(['up', 'down', 'flat'] as const).map((v) => ({
              value: v,
              label: t(`macroGame.bond.${v}`),
            }))}
            chosen={answer.bond}
            right={rightBondMove(s)}
            why={t(`macroGame.whyBond.${rightBondMove(s)}`, {
              surprise: signed(surprise(s)),
            })}
            nextLabel={t('macroGame.next')}
            glow={glow}
            testId="mg-why"
            onPick={(v) => pick('bond', v, v === rightBondMove(s))}
            onNext={() => setStep('pmi')}
          />
        </div>
      )}

      {step === 'pmi' && (
        <div className="grid gap-3">
          <p>{t('macroGame.briefPmi', { pmi: formatNumber(s.pmi, 1) })}</p>
          <AskStep<Cycle>
            question={t('macroGame.askPmi')}
            options={(['expansion', 'contraction'] as const).map((v) => ({
              value: v,
              label: t(`macroGame.cycle.${v}`),
            }))}
            chosen={answer.cycle}
            right={rightCycle(s)}
            why={t(`macroGame.whyPmi.${rightCycle(s)}`, { pmi: formatNumber(s.pmi, 1) })}
            nextLabel={t('macroGame.next')}
            glow={glow}
            testId="mg-why"
            onPick={(v) => pick('cycle', v, v === rightCycle(s))}
            onNext={() => setStep('jobs')}
          />
        </div>
      )}

      {step === 'jobs' && (
        <div className="grid gap-3">
          <p>
            {t('macroGame.briefJobs', { active: mill(s.active), unemployed: mill(s.unemployed) })}
          </p>
          <AskStep<number>
            question={t('macroGame.askJobs')}
            options={rateOptions(s).map((o) => ({ value: o, label: pct(o) }))}
            chosen={answer.rate}
            right={unemploymentRate(s)}
            why={t('macroGame.whyJobs', {
              active: mill(s.active),
              unemployed: mill(s.unemployed),
              v: pct(unemploymentRate(s)),
            })}
            nextLabel={t('macroGame.summary')}
            glow={glow}
            testId="mg-why"
            onPick={(v) => pick('rate', v, v === unemploymentRate(s))}
            onNext={() => setStep('done')}
          />
        </div>
      )}
    </section>
  );
}
