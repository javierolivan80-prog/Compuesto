import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Button } from '../../components/Button';
import {
  cvarOptions,
  cvarPct,
  DAYS,
  expected,
  expectedOptions,
  machineResult,
  machineValues,
  setupMachine,
  sigma,
  varEur,
  varOptions,
  varPct,
  worstLosses,
  Z,
  zone,
  type MachineAnswer,
  type Move,
} from '../../engine/games/time-machine';
import { t } from '../../i18n';
import { formatNumber } from '../../lib/format';
import { haptic, HAPTIC } from '../../lib/haptics';
import { playSound } from '../../lib/sound';
import { AskStep, PopLayer, shake, usePops } from './kit';
import './time-machine-game.css';

interface Props {
  seed: number;
  /** Al terminar y pulsar «Ver qué ha pasado»: las cifras de la partida para la explicación y los ejercicios. */
  onDone: (values: Record<string, number>) => void;
}

type Step = 'var' | 'cvar' | 'backtest' | 'decision' | 'done';
const pct = (v: number, d?: number) =>
  `${formatNumber(v, d ?? (Number.isInteger(v) ? 0 : 2))}\u00a0%`;
const money = (v: number) => `${formatNumber(v, Number.isInteger(v) ? 0 : 2)}\u00a0€`;
const plain = (v: number) => formatNumber(v, Number.isInteger(v) ? 0 : 1);

/** Pantalla de la mesa de riesgos: etiquetas y cifras en una rejilla que se reparte sola. */
function Board({ rows }: { rows: [label: string, value: ReactNode][] }) {
  return (
    <div className="tm-board grid gap-2 rounded-[var(--radius-sm)] border p-3">
      <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,7rem),1fr))] gap-2" data-num>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-text-2 text-sm">{label}</dt>
            <dd className="text-xl">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function TimeMachineGame({ seed, onDone }: Props) {
  const s = useMemo(() => setupMachine(seed), [seed]);
  const [step, setStep] = useState<Step>('var');
  const [answer, setAnswer] = useState<Partial<MachineAnswer>>({});
  const [glow, setGlow] = useState(0);
  const box = useRef<HTMLElement>(null);
  const { pops, pop } = usePops();

  const feedback = (ok: boolean) => {
    if (ok) {
      setGlow((g) => g + 1);
      playSound('hit');
      haptic(HAPTIC.success);
      pop(t('timeMachineGame.hit'), 'up', 50, 20);
    } else {
      playSound('miss');
      haptic(HAPTIC.failure);
      if (box.current) shake(box.current);
    }
  };
  const pick = <K extends keyof MachineAnswer>(key: K, value: MachineAnswer[K], ok: boolean) => {
    setAnswer((a) => ({ ...a, [key]: value }));
    feedback(ok);
  };

  if (step === 'done') {
    const full: MachineAnswer = {
      var: answer.var ?? 0,
      cvar: answer.cvar ?? 0,
      expected: answer.expected ?? 0,
      move: answer.move ?? 'sell',
    };
    const r = machineResult(s, full);
    const row = (label: string, ok: boolean) => (
      <div>
        <dt className="text-text-2 text-sm">{label}</dt>
        <dd className={`text-lg ${ok ? 'text-bull' : 'text-bear'}`}>
          {ok ? `✓ ${t('timeMachineGame.yes')}` : `✗ ${t('timeMachineGame.no')}`}
        </dd>
      </div>
    );
    return (
      <section
        aria-labelledby="tm-done"
        className="tm-panel grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
        data-testid="tm-done"
      >
        <h2 id="tm-done" className="text-3xl">
          {t('timeMachineGame.doneTitle')}
        </h2>
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
          {row(t('timeMachineGame.row.var'), r.varHit)}
          {row(t('timeMachineGame.row.cvar'), r.cvarHit)}
          {row(t('timeMachineGame.row.backtest'), r.expectedHit)}
          {row(t('timeMachineGame.row.decision'), r.moveHit)}
        </dl>
        <p className="text-lg" data-testid="tm-verdict">
          {r.score >= 1
            ? t('timeMachineGame.great')
            : r.score >= 0.5
              ? t('timeMachineGame.ok')
              : t('timeMachineGame.bad')}
        </p>
        <Button onClick={() => onDone(machineValues(s, full))}>
          {t('timeMachineGame.debrief')}
        </Button>
      </section>
    );
  }

  return (
    <section
      ref={box}
      aria-labelledby="tm-title"
      className="tm-panel relative grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
    >
      <header className="grid gap-1">
        <h2 id="tm-title" className="text-3xl">
          {t('timeMachineGame.title')}
        </h2>
        <p className="text-text-2 text-sm" data-testid="tm-step">
          {t(`timeMachineGame.step.${step}`, { crisis: s.crisis })}
        </p>
        <p className="text-text-2 text-xs">{t('timeMachineGame.disclaimer')}</p>
      </header>
      <PopLayer pops={pops} />

      {step === 'var' && (
        <div className="grid gap-3">
          <p>
            {t('timeMachineGame.briefVar', { conf: pct(s.conf), z: formatNumber(Z[s.conf], 3) })}
          </p>
          <Board
            rows={[
              [t('timeMachineGame.board.value'), money(s.value)],
              [t('timeMachineGame.board.sigma'), pct(sigma(s), 1)],
              [t('timeMachineGame.board.conf'), pct(s.conf)],
            ]}
          />
          <AskStep<number>
            question={t('timeMachineGame.askVar')}
            options={varOptions(s).map((o) => ({ value: o, label: money(o) }))}
            chosen={answer.var}
            right={varEur(s)}
            why={t('timeMachineGame.whyVar', {
              z: formatNumber(Z[s.conf], 3),
              sigma: pct(sigma(s), 1),
              pct: pct(varPct(s), 2),
              v: money(varEur(s)),
            })}
            nextLabel={t('timeMachineGame.next')}
            glow={glow}
            testId="tm-why"
            onPick={(v) => pick('var', v, v === varEur(s))}
            onNext={() => setStep('cvar')}
          />
        </div>
      )}

      {step === 'cvar' && (
        <div className="grid gap-3">
          <p>{t('timeMachineGame.briefCvar', { var: pct(varPct(s), 2) })}</p>
          <Board
            rows={worstLosses(s).map((w, i) => [
              t('timeMachineGame.board.day', { n: i + 1 }),
              `−${pct(w, 1)}`,
            ])}
          />
          <AskStep<number>
            question={t('timeMachineGame.askCvar')}
            options={cvarOptions(s).map((o) => ({ value: o, label: pct(o, 2) }))}
            chosen={answer.cvar}
            right={cvarPct(s)}
            why={t('timeMachineGame.whyCvar', { v: pct(cvarPct(s), 2), var: pct(varPct(s), 2) })}
            nextLabel={t('timeMachineGame.next')}
            glow={glow}
            testId="tm-why"
            onPick={(v) => pick('cvar', v, v === cvarPct(s))}
            onNext={() => setStep('backtest')}
          />
        </div>
      )}

      {step === 'backtest' && (
        <div className="grid gap-3">
          <p>
            {t('timeMachineGame.briefBacktest', {
              days: DAYS,
              conf: pct(s.conf),
              observed: s.observed,
            })}
          </p>
          <AskStep<number>
            question={t('timeMachineGame.askBacktest')}
            options={expectedOptions(s).map((o) => ({ value: o, label: plain(o) }))}
            chosen={answer.expected}
            right={expected(s)}
            why={t(`timeMachineGame.whyBacktest.${zone(s)}`, {
              v: plain(expected(s)),
              days: DAYS,
              rate: pct(100 - s.conf),
              observed: s.observed,
            })}
            nextLabel={t('timeMachineGame.next')}
            glow={glow}
            testId="tm-why"
            onPick={(v) => pick('expected', v, v === expected(s))}
            onNext={() => setStep('decision')}
          />
        </div>
      )}

      {step === 'decision' && (
        <div className="grid gap-3">
          <p>{t(`timeMachineGame.briefDecision.${s.crisis}`)}</p>
          <AskStep<Move>
            question={t('timeMachineGame.askDecision')}
            options={(['hold', 'sell', 'lever'] as const).map((v) => ({
              value: v,
              label: t(`timeMachineGame.move.${v}`),
            }))}
            chosen={answer.move}
            right="hold"
            why={t('timeMachineGame.whyDecision')}
            nextLabel={t('timeMachineGame.summary')}
            glow={glow}
            testId="tm-why"
            onPick={(v) => pick('move', v, v === 'hold')}
            onNext={() => setStep('done')}
          />
        </div>
      )}
    </section>
  );
}
