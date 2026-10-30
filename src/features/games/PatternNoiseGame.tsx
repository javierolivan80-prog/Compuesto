import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Button } from '../../components/Button';
import {
  cost,
  exposure,
  loser,
  loss,
  lossOptions,
  lossPct,
  move,
  net,
  netOptions,
  patternResult,
  patternValues,
  randomWalk,
  setupPattern,
  STOCKS,
  winner,
  type MomentumPick,
  type PatternAnswer,
} from '../../engine/games/pattern-noise';
import { t } from '../../i18n';
import { formatNumber } from '../../lib/format';
import { haptic, HAPTIC } from '../../lib/haptics';
import { playSound } from '../../lib/sound';
import { AskStep, PopLayer, shake, usePops } from './kit';
import './pattern-noise-game.css';

interface Props {
  seed: number;
  /** Al terminar y pulsar «Ver qué ha pasado»: las cifras de la partida para la explicación y los ejercicios. */
  onDone: (values: Record<string, number>) => void;
}

type Step = 'chart' | 'net' | 'momentum' | 'cfd' | 'done';
/** Porcentajes con signo menos tipográfico: −24 %, 17,75 %. */
const pct = (v: number) =>
  `${v < 0 ? '−' : ''}${formatNumber(Math.abs(v), Number.isInteger(v) ? 0 : 2)}\u00a0%`;
const money = (v: number) => `${formatNumber(v, Number.isInteger(v) ? 0 : 2)}\u00a0€`;

/** Pantalla de la mesa: etiquetas y cifras en una rejilla que se reparte sola. */
function Board({ rows }: { rows: [label: string, value: ReactNode][] }) {
  return (
    <div className="pn-board grid gap-2 rounded-[var(--radius-sm)] border p-3">
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

/** Gráfico de líneas mínimo de una serie de precios, con su descripción para lector de pantalla. */
function Spark({ label, data }: { label: string; data: number[] }) {
  const lo = Math.min(...data);
  const hi = Math.max(...data);
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * 300},${70 - ((v - lo) / (hi - lo || 1)) * 60}`)
    .join(' ');
  return (
    <figure className="pn-board grid gap-1 rounded-[var(--radius-sm)] border p-3">
      <figcaption className="text-text-2 text-sm">{label}</figcaption>
      <svg
        viewBox="0 0 300 80"
        className="h-auto w-full"
        role="img"
        aria-label={t('patternNoiseGame.chartAria', {
          label,
          first: formatNumber(data[0]!, 2),
          last: formatNumber(data[data.length - 1]!, 2),
          lo: formatNumber(lo, 2),
          hi: formatNumber(hi, 2),
        })}
      >
        <polyline points={pts} fill="none" stroke="var(--brand)" strokeWidth="1.5" />
      </svg>
    </figure>
  );
}

export function PatternNoiseGame({ seed, onDone }: Props) {
  const s = useMemo(() => setupPattern(seed), [seed]);
  const walkA = useMemo(() => randomWalk(s.seedA), [s]);
  const walkB = useMemo(() => randomWalk(s.seedB), [s]);
  const [step, setStep] = useState<Step>('chart');
  const [answer, setAnswer] = useState<Partial<PatternAnswer>>({});
  const [glow, setGlow] = useState(0);
  const box = useRef<HTMLElement>(null);
  const { pops, pop } = usePops();
  const best = STOCKS[winner(s)]!;
  const worst = STOCKS[loser(s)]!;

  const feedback = (ok: boolean) => {
    if (ok) {
      setGlow((g) => g + 1);
      playSound('hit');
      haptic(HAPTIC.success);
      pop(t('patternNoiseGame.hit'), 'up', 50, 20);
    } else {
      playSound('miss');
      haptic(HAPTIC.failure);
      if (box.current) shake(box.current);
    }
  };
  const pick = <K extends keyof PatternAnswer>(key: K, value: PatternAnswer[K], ok: boolean) => {
    setAnswer((a) => ({ ...a, [key]: value }));
    feedback(ok);
  };

  if (step === 'done') {
    const full: PatternAnswer = {
      chart: answer.chart ?? 'a',
      net: answer.net ?? 0,
      pick: answer.pick ?? 'none',
      loss: answer.loss ?? 0,
    };
    const r = patternResult(s, full);
    const row = (label: string, ok: boolean) => (
      <div>
        <dt className="text-text-2 text-sm">{label}</dt>
        <dd className={`text-lg ${ok ? 'text-bull' : 'text-bear'}`}>
          {ok ? `✓ ${t('patternNoiseGame.yes')}` : `✗ ${t('patternNoiseGame.no')}`}
        </dd>
      </div>
    );
    return (
      <section
        aria-labelledby="pn-done"
        className="pn-panel grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
        data-testid="pn-done"
      >
        <h2 id="pn-done" className="text-3xl">
          {t('patternNoiseGame.doneTitle')}
        </h2>
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
          {row(t('patternNoiseGame.row.chart'), r.chartHit)}
          {row(t('patternNoiseGame.row.net'), r.netHit)}
          {row(t('patternNoiseGame.row.momentum'), r.pickHit)}
          {row(t('patternNoiseGame.row.cfd'), r.lossHit)}
        </dl>
        <p className="text-lg" data-testid="pn-verdict">
          {r.score >= 1
            ? t('patternNoiseGame.great')
            : r.score >= 0.5
              ? t('patternNoiseGame.ok')
              : t('patternNoiseGame.bad')}
        </p>
        <Button onClick={() => onDone(patternValues(s, full))}>
          {t('patternNoiseGame.debrief')}
        </Button>
      </section>
    );
  }

  return (
    <section
      ref={box}
      aria-labelledby="pn-title"
      className="pn-panel relative grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
    >
      <header className="grid gap-1">
        <h2 id="pn-title" className="text-3xl">
          {t('patternNoiseGame.title')}
        </h2>
        <p className="text-text-2 text-sm" data-testid="pn-step">
          {t(`patternNoiseGame.step.${step}`)}
        </p>
      </header>
      <PopLayer pops={pops} />

      {step === 'chart' && (
        <div className="grid gap-3">
          <p>{t('patternNoiseGame.briefChart')}</p>
          <Spark label={t('patternNoiseGame.seriesA')} data={walkA} />
          <Spark label={t('patternNoiseGame.seriesB')} data={walkB} />
          <AskStep<'a' | 'b' | 'unknown'>
            question={t('patternNoiseGame.askChart')}
            options={(['a', 'b', 'unknown'] as const).map((v) => ({
              value: v,
              label: t(`patternNoiseGame.chart.${v}`),
            }))}
            chosen={answer.chart}
            right="unknown"
            why={t('patternNoiseGame.whyChart')}
            nextLabel={t('patternNoiseGame.next')}
            glow={glow}
            testId="pn-why"
            onPick={(v) => pick('chart', v, v === 'unknown')}
            onNext={() => setStep('net')}
          />
        </div>
      )}

      {step === 'net' && (
        <div className="grid gap-3">
          <p>{t('patternNoiseGame.briefNet')}</p>
          <Board
            rows={[
              [t('patternNoiseGame.board.gross'), pct(s.gross)],
              [t('patternNoiseGame.board.trades'), formatNumber(s.trades)],
              [t('patternNoiseGame.board.cost'), pct(cost(s))],
            ]}
          />
          <AskStep<number>
            question={t('patternNoiseGame.askNet')}
            options={netOptions(s).map((o) => ({ value: o, label: pct(o) }))}
            chosen={answer.net}
            right={net(s)}
            why={t('patternNoiseGame.whyNet', {
              gross: pct(s.gross),
              trades: formatNumber(s.trades),
              cost: pct(cost(s)),
              v: pct(net(s)),
            })}
            nextLabel={t('patternNoiseGame.next')}
            glow={glow}
            testId="pn-why"
            onPick={(v) => pick('net', v, v === net(s))}
            onNext={() => setStep('momentum')}
          />
        </div>
      )}

      {step === 'momentum' && (
        <div className="grid gap-3">
          <p>{t('patternNoiseGame.briefMomentum')}</p>
          <Board rows={STOCKS.map((name, i) => [name, pct(s.past[i]!)])} />
          <AskStep<MomentumPick>
            question={t('patternNoiseGame.askMomentum')}
            options={(['momentum', 'reversal', 'none'] as const).map((v) => ({
              value: v,
              label: t(`patternNoiseGame.pick.${v}`, { best, worst }),
            }))}
            chosen={answer.pick}
            right="momentum"
            why={t('patternNoiseGame.whyMomentum', { best, worst })}
            nextLabel={t('patternNoiseGame.next')}
            glow={glow}
            testId="pn-why"
            onPick={(v) => pick('pick', v, v === 'momentum')}
            onNext={() => setStep('cfd')}
          />
        </div>
      )}

      {step === 'cfd' && (
        <div className="grid gap-3">
          <p>
            {t('patternNoiseGame.briefCfd', {
              deposit: money(s.deposit),
              lev: formatNumber(s.lev),
              move: pct(move(s)),
            })}
          </p>
          <Board
            rows={[
              [t('patternNoiseGame.board.deposit'), money(s.deposit)],
              [t('patternNoiseGame.board.lev'), `${formatNumber(s.lev)}:1`],
              [t('patternNoiseGame.board.move'), pct(-move(s))],
            ]}
          />
          <AskStep<number>
            question={t('patternNoiseGame.askCfd')}
            options={lossOptions(s).map((o) => ({ value: o, label: money(o) }))}
            chosen={answer.loss}
            right={loss(s)}
            why={t('patternNoiseGame.whyCfd', {
              exposure: money(exposure(s)),
              move: pct(move(s)),
              v: money(loss(s)),
              share: pct(lossPct(s)),
            })}
            nextLabel={t('patternNoiseGame.summary')}
            glow={glow}
            testId="pn-why"
            onPick={(v) => pick('loss', v, v === loss(s))}
            onNext={() => setStep('done')}
          />
        </div>
      )}
    </section>
  );
}
