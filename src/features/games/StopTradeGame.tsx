import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Button } from '../../components/Button';
import { IMPULSIVE_STEPS, START_VALUE } from '../../engine/games/impulsive';
import {
  breakeven,
  breakevenOptions,
  entry,
  exitOf,
  pathC,
  result,
  resultOptions,
  riskEur,
  setupStop,
  shares,
  sharesOptions,
  stopPrice,
  stopResult,
  stopValues,
  targetPrice,
  temptDay,
  type StopAnswer,
  type StopMove,
} from '../../engine/games/stop-trade';
import { t } from '../../i18n';
import { formatNumber } from '../../lib/format';
import { haptic, HAPTIC } from '../../lib/haptics';
import { playSound } from '../../lib/sound';
import { AskStep, PopLayer, shake, usePops } from './kit';
import './stop-trade-game.css';

interface Props {
  seed: number;
  /** Al terminar y pulsar «Ver qué ha pasado»: las cifras de la partida para la explicación y los ejercicios. */
  onDone: (values: Record<string, number>) => void;
}

type Step = 'size' | 'rr' | 'path' | 'tempt' | 'done';
const price = (v: number) => `${formatNumber(v, 2)}\u00a0€`;
/** Importes con signo: −100 €, 24 €. */
const money = (v: number) =>
  `${v < 0 ? '−' : ''}${formatNumber(Math.abs(v), Number.isInteger(v) ? 0 : 2)}\u00a0€`;
const pct = (v: number) => `${formatNumber(v, Number.isInteger(v) ? 0 : 1)}\u00a0%`;

/** Pantalla de la mesa: etiquetas y cifras en una rejilla que se reparte sola. */
function Board({ rows }: { rows: [label: string, value: ReactNode][] }) {
  return (
    <div className="st-board grid gap-2 rounded-[var(--radius-sm)] border p-3">
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

/** Las 30 sesiones con las líneas del stop y del objetivo, y su descripción para lector de pantalla. */
function PathChart({ path, stop, target }: { path: number[]; stop: number; target: number }) {
  const lo = Math.min(...path, stop) * 0.99;
  const hi = Math.max(...path, target) * 1.01;
  const x = (i: number) => 8 + (i / IMPULSIVE_STEPS) * 284;
  const y = (v: number) => 112 - ((v - lo) / (hi - lo)) * 104;
  const minDay = path.indexOf(Math.min(...path.slice(1)), 1);
  const maxDay = path.indexOf(Math.max(...path.slice(1)), 1);
  return (
    <svg
      viewBox="0 0 300 120"
      className="st-board h-auto w-full rounded-[var(--radius-sm)] border"
      role="img"
      aria-label={t('stopTradeGame.chartAria', {
        stop: price(stop / 100),
        target: price(target / 100),
        min: price(path[minDay]! / 100),
        minDay,
        max: price(path[maxDay]! / 100),
        maxDay,
        close: price(path[IMPULSIVE_STEPS]! / 100),
      })}
    >
      <line
        x1="8"
        x2="292"
        y1={y(target)}
        y2={y(target)}
        stroke="var(--bull)"
        strokeDasharray="4 3"
      />
      <line x1="8" x2="292" y1={y(stop)} y2={y(stop)} stroke="var(--bear)" strokeDasharray="4 3" />
      <polyline
        points={path.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
        fill="none"
        stroke="var(--brand)"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function StopTradeGame({ seed, onDone }: Props) {
  const s = useMemo(() => setupStop(seed), [seed]);
  const path = useMemo(() => pathC(s), [s]);
  const exit = useMemo(() => exitOf(s), [s]);
  const tempt = useMemo(() => temptDay(s), [s]);
  const [step, setStep] = useState<Step>('size');
  const [answer, setAnswer] = useState<Partial<StopAnswer>>({});
  const [glow, setGlow] = useState(0);
  const box = useRef<HTMLElement>(null);
  const { pops, pop } = usePops();
  const stopC = Math.round(stopPrice(s) * 100);
  const targetC = Math.round(targetPrice(s) * 100);

  const feedback = (ok: boolean) => {
    if (ok) {
      setGlow((g) => g + 1);
      playSound('hit');
      haptic(HAPTIC.success);
      pop(t('stopTradeGame.hit'), 'up', 50, 20);
    } else {
      playSound('miss');
      haptic(HAPTIC.failure);
      if (box.current) shake(box.current);
    }
  };
  const pick = <K extends keyof StopAnswer>(key: K, value: StopAnswer[K], ok: boolean) => {
    setAnswer((a) => ({ ...a, [key]: value }));
    feedback(ok);
  };

  if (step === 'done') {
    const full: StopAnswer = {
      shares: answer.shares ?? 0,
      breakeven: answer.breakeven ?? 0,
      result: answer.result ?? 0,
      move: answer.move ?? 'lower',
    };
    const r = stopResult(s, full);
    const row = (label: string, ok: boolean) => (
      <div>
        <dt className="text-text-2 text-sm">{label}</dt>
        <dd className={`text-lg ${ok ? 'text-bull' : 'text-bear'}`}>
          {ok ? `✓ ${t('stopTradeGame.yes')}` : `✗ ${t('stopTradeGame.no')}`}
        </dd>
      </div>
    );
    return (
      <section
        aria-labelledby="st-done"
        className="st-panel grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
        data-testid="st-done"
      >
        <h2 id="st-done" className="text-3xl">
          {t('stopTradeGame.doneTitle')}
        </h2>
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
          {row(t('stopTradeGame.row.size'), r.sharesHit)}
          {row(t('stopTradeGame.row.rr'), r.breakevenHit)}
          {row(t('stopTradeGame.row.path'), r.resultHit)}
          {row(t('stopTradeGame.row.tempt'), r.moveHit)}
        </dl>
        <p className="text-lg" data-testid="st-verdict">
          {r.score >= 1
            ? t('stopTradeGame.great')
            : r.score >= 0.5
              ? t('stopTradeGame.ok')
              : t('stopTradeGame.bad')}
        </p>
        <Button onClick={() => onDone(stopValues(s, full))}>{t('stopTradeGame.debrief')}</Button>
      </section>
    );
  }

  return (
    <section
      ref={box}
      aria-labelledby="st-title"
      className="st-panel relative grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
    >
      <header className="grid gap-1">
        <h2 id="st-title" className="text-3xl">
          {t('stopTradeGame.title')}
        </h2>
        <p className="text-text-2 text-sm" data-testid="st-step">
          {t(`stopTradeGame.step.${step}`)}
        </p>
      </header>
      <PopLayer pops={pops} />

      {step === 'size' && (
        <div className="grid gap-3">
          <p>{t('stopTradeGame.briefSize', { risk: pct(s.riskPct) })}</p>
          <Board
            rows={[
              [t('stopTradeGame.board.capital'), money(START_VALUE)],
              [t('stopTradeGame.board.risk'), `${pct(s.riskPct)} · ${money(riskEur(s))}`],
              [t('stopTradeGame.board.entry'), price(entry(s))],
              [t('stopTradeGame.board.stop'), price(stopPrice(s))],
            ]}
          />
          <AskStep<number>
            question={t('stopTradeGame.askSize')}
            options={sharesOptions(s).map((o) => ({
              value: o,
              label: t('stopTradeGame.sharesLabel', { qty: formatNumber(o) }),
            }))}
            chosen={answer.shares}
            right={shares(s)}
            why={t('stopTradeGame.whySize', {
              risk: money(riskEur(s)),
              entry: price(entry(s)),
              stop: price(stopPrice(s)),
              v: formatNumber(shares(s)),
            })}
            nextLabel={t('stopTradeGame.next')}
            glow={glow}
            testId="st-why"
            onPick={(v) => pick('shares', v, v === shares(s))}
            onNext={() => setStep('rr')}
          />
        </div>
      )}

      {step === 'rr' && (
        <div className="grid gap-3">
          <p>
            {t('stopTradeGame.briefRr', {
              target: price(targetPrice(s)),
              rr: formatNumber(s.rr, Number.isInteger(s.rr) ? 0 : 1),
            })}
          </p>
          <AskStep<number>
            question={t('stopTradeGame.askRr')}
            options={breakevenOptions(s).map((o) => ({ value: o, label: pct(o) }))}
            chosen={answer.breakeven}
            right={breakeven(s)}
            why={t('stopTradeGame.whyRr', {
              rr: formatNumber(s.rr, Number.isInteger(s.rr) ? 0 : 1),
              v: pct(breakeven(s)),
            })}
            nextLabel={t('stopTradeGame.next')}
            glow={glow}
            testId="st-why"
            onPick={(v) => pick('breakeven', v, v === breakeven(s))}
            onNext={() => setStep('path')}
          />
        </div>
      )}

      {step === 'path' && (
        <div className="grid gap-3">
          <p>
            {t('stopTradeGame.briefPath', {
              stop: price(stopPrice(s)),
              target: price(targetPrice(s)),
            })}
          </p>
          <PathChart path={path} stop={stopC} target={targetC} />
          <AskStep<number>
            question={t('stopTradeGame.askPath', { n: formatNumber(shares(s)) })}
            options={resultOptions(s).map((o) => ({ value: o, label: money(o) }))}
            chosen={answer.result}
            right={result(s)}
            why={t(`stopTradeGame.whyPath.${exit.outcome}`, {
              day: exit.day,
              price: price(exit.priceC / 100),
              v: money(result(s)),
            })}
            nextLabel={t('stopTradeGame.next')}
            glow={glow}
            testId="st-why"
            onPick={(v) => pick('result', v, v === result(s))}
            onNext={() => setStep('tempt')}
          />
        </div>
      )}

      {step === 'tempt' && (
        <div className="grid gap-3">
          <p>
            {t('stopTradeGame.briefTempt', {
              day: tempt,
              price: price(path[tempt]! / 100),
              stop: price(stopPrice(s)),
            })}
          </p>
          <article className="st-board rounded-[var(--radius-sm)] border p-3" data-testid="st-news">
            <p className="text-text-2 mb-1 text-xs">{t('stopTradeGame.news')}</p>
            {s.market.news[Math.max(0, tempt - 1)]!.text}
          </article>
          <AskStep<StopMove>
            question={t('stopTradeGame.askTempt')}
            options={(['keep', 'lower', 'average'] as const).map((v) => ({
              value: v,
              label: t(`stopTradeGame.move.${v}`),
            }))}
            chosen={answer.move}
            right="keep"
            why={t('stopTradeGame.whyTempt')}
            nextLabel={t('stopTradeGame.summary')}
            glow={glow}
            testId="st-why"
            onPick={(v) => pick('move', v, v === 'keep')}
            onNext={() => setStep('done')}
          />
        </div>
      )}
    </section>
  );
}
