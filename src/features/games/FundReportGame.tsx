import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Button } from '../../components/Button';
import {
  ddOptions,
  endValue,
  h1,
  h2,
  maxDrawdown,
  mwr,
  mwrOptions,
  nav,
  reportResult,
  reportValues,
  roi,
  setupReport,
  sharpe,
  sharpeOptions,
  twr,
  twrOptions,
  vol,
  volMonthly,
  worstMonth,
  type ReportAnswer,
} from '../../engine/games/fund-report';
import { t } from '../../i18n';
import { formatNumber } from '../../lib/format';
import { haptic, HAPTIC } from '../../lib/haptics';
import { playSound } from '../../lib/sound';
import { AskStep, PopLayer, shake, usePops } from './kit';
import './fund-report-game.css';

interface Props {
  seed: number;
  /** Al terminar y pulsar «Ver qué ha pasado»: las cifras de la partida para la explicación y los ejercicios. */
  onDone: (values: Record<string, number>) => void;
}

type Step = 'twr' | 'mwr' | 'dd' | 'sharpe' | 'done';
/** Porcentajes con signo menos tipográfico: −3,23 %. */
const pct = (v: number) =>
  `${v < 0 ? '−' : ''}${formatNumber(Math.abs(v), Number.isInteger(v) ? 0 : 2)}\u00a0%`;
const money = (v: number) => `${formatNumber(v, Number.isInteger(v) ? 0 : 2)}\u00a0€`;
const ratio = (v: number) => `${v < 0 ? '−' : ''}${formatNumber(Math.abs(v), 2)}`;

/** Pantalla del informe: etiquetas y cifras en una rejilla que se reparte sola. */
function Board({ rows }: { rows: [label: string, value: ReactNode][] }) {
  return (
    <div className="fr-board grid gap-2 rounded-[var(--radius-sm)] border p-3">
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

/** Valor liquidativo mes a mes, con su descripción para lector de pantalla. */
function NavChart({ data, months }: { data: number[]; months: number[] }) {
  const lo = Math.min(...data) * 0.99;
  const hi = Math.max(...data) * 1.01;
  const x = (i: number) => 8 + (i / (data.length - 1)) * 284;
  const y = (v: number) => 102 - ((v - lo) / (hi - lo)) * 94;
  return (
    <svg
      viewBox="0 0 300 110"
      className="fr-board h-auto w-full rounded-[var(--radius-sm)] border"
      role="img"
      aria-label={t('fundReportGame.chartAria', {
        months: months.map((m) => `${m > 0 ? '+' : m < 0 ? '−' : ''}${Math.abs(m)}`).join(', '),
      })}
    >
      <polyline
        points={data.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
        fill="none"
        stroke="var(--brand)"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function FundReportGame({ seed, onDone }: Props) {
  const s = useMemo(() => setupReport(seed), [seed]);
  const series = useMemo(() => nav(s), [s]);
  const [step, setStep] = useState<Step>('twr');
  const [answer, setAnswer] = useState<Partial<ReportAnswer>>({});
  const [glow, setGlow] = useState(0);
  const box = useRef<HTMLElement>(null);
  const { pops, pop } = usePops();

  const feedback = (ok: boolean) => {
    if (ok) {
      setGlow((g) => g + 1);
      playSound('hit');
      haptic(HAPTIC.success);
      pop(t('fundReportGame.hit'), 'up', 50, 20);
    } else {
      playSound('miss');
      haptic(HAPTIC.failure);
      if (box.current) shake(box.current);
    }
  };
  const pick = (key: keyof ReportAnswer, value: number, ok: boolean) => {
    setAnswer((a) => ({ ...a, [key]: value }));
    feedback(ok);
  };

  if (step === 'done') {
    const full: ReportAnswer = {
      twr: answer.twr ?? 0,
      mwr: answer.mwr ?? 0,
      dd: answer.dd ?? 0,
      sharpe: answer.sharpe ?? 0,
    };
    const r = reportResult(s, full);
    const row = (label: string, ok: boolean) => (
      <div>
        <dt className="text-text-2 text-sm">{label}</dt>
        <dd className={`text-lg ${ok ? 'text-bull' : 'text-bear'}`}>
          {ok ? `✓ ${t('fundReportGame.yes')}` : `✗ ${t('fundReportGame.no')}`}
        </dd>
      </div>
    );
    return (
      <section
        aria-labelledby="fr-done"
        className="fr-panel grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
        data-testid="fr-done"
      >
        <h2 id="fr-done" className="text-3xl">
          {t('fundReportGame.doneTitle')}
        </h2>
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
          {row(t('fundReportGame.row.twr'), r.twrHit)}
          {row(t('fundReportGame.row.mwr'), r.mwrHit)}
          {row(t('fundReportGame.row.dd'), r.ddHit)}
          {row(t('fundReportGame.row.sharpe'), r.sharpeHit)}
        </dl>
        <p className="text-lg" data-testid="fr-verdict">
          {r.score >= 1
            ? t('fundReportGame.great')
            : r.score >= 0.5
              ? t('fundReportGame.ok')
              : t('fundReportGame.bad')}
        </p>
        <Button onClick={() => onDone(reportValues(s, full))}>{t('fundReportGame.debrief')}</Button>
      </section>
    );
  }

  return (
    <section
      ref={box}
      aria-labelledby="fr-title"
      className="fr-panel relative grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
    >
      <header className="grid gap-1">
        <h2 id="fr-title" className="text-3xl">
          {t('fundReportGame.title')}
        </h2>
        <p className="text-text-2 text-sm" data-testid="fr-step">
          {t(`fundReportGame.step.${step}`)}
        </p>
      </header>
      <PopLayer pops={pops} />

      {step === 'twr' && (
        <div className="grid gap-3">
          <p>{t('fundReportGame.briefTwr')}</p>
          <Board
            rows={[
              [t('fundReportGame.board.h1'), pct(h1(s))],
              [t('fundReportGame.board.h2'), pct(h2(s))],
            ]}
          />
          <AskStep<number>
            question={t('fundReportGame.askTwr')}
            options={twrOptions(s).map((o) => ({ value: o, label: pct(o) }))}
            chosen={answer.twr}
            right={twr(s)}
            why={t('fundReportGame.whyTwr', { h1: pct(h1(s)), h2: pct(h2(s)), v: pct(twr(s)) })}
            nextLabel={t('fundReportGame.next')}
            glow={glow}
            testId="fr-why"
            onPick={(v) => pick('twr', v, v === twr(s))}
            onNext={() => setStep('mwr')}
          />
        </div>
      )}

      {step === 'mwr' && (
        <div className="grid gap-3">
          <p>{t('fundReportGame.briefMwr', { start: money(s.start), added: money(s.added) })}</p>
          <Board
            rows={[
              [t('fundReportGame.board.start'), money(s.start)],
              [t('fundReportGame.board.added'), money(s.added)],
              [t('fundReportGame.board.end'), money(endValue(s))],
            ]}
          />
          <AskStep<number>
            question={t('fundReportGame.askMwr')}
            options={mwrOptions(s).map((o) => ({ value: o, label: pct(o) }))}
            chosen={answer.mwr}
            right={mwr(s)}
            why={t('fundReportGame.whyMwr', {
              v: pct(mwr(s)),
              twr: pct(twr(s)),
              roi: pct(roi(s)),
            })}
            nextLabel={t('fundReportGame.next')}
            glow={glow}
            testId="fr-why"
            onPick={(v) => pick('mwr', v, v === mwr(s))}
            onNext={() => setStep('dd')}
          />
        </div>
      )}

      {step === 'dd' && (
        <div className="grid gap-3">
          <p>{t('fundReportGame.briefDd')}</p>
          <NavChart data={series} months={s.months} />
          <AskStep<number>
            question={t('fundReportGame.askDd')}
            options={ddOptions(s).map((o) => ({ value: o, label: pct(o) }))}
            chosen={answer.dd}
            right={maxDrawdown(s)}
            why={t('fundReportGame.whyDd', {
              v: pct(maxDrawdown(s)),
              worst: pct(worstMonth(s)),
            })}
            nextLabel={t('fundReportGame.next')}
            glow={glow}
            testId="fr-why"
            onPick={(v) => pick('dd', v, v === maxDrawdown(s))}
            onNext={() => setStep('sharpe')}
          />
        </div>
      )}

      {step === 'sharpe' && (
        <div className="grid gap-3">
          <p>{t('fundReportGame.briefSharpe')}</p>
          <Board
            rows={[
              [t('fundReportGame.board.twr'), pct(twr(s))],
              [t('fundReportGame.board.rf'), pct(s.rf)],
              [t('fundReportGame.board.volM'), pct(volMonthly(s))],
              [t('fundReportGame.board.vol'), pct(vol(s))],
            ]}
          />
          <AskStep<number>
            question={t('fundReportGame.askSharpe')}
            options={sharpeOptions(s).map((o) => ({ value: o, label: ratio(o) }))}
            chosen={answer.sharpe}
            right={sharpe(s)}
            why={t('fundReportGame.whySharpe', {
              twr: pct(twr(s)),
              rf: pct(s.rf),
              vol: pct(vol(s)),
              v: ratio(sharpe(s)),
            })}
            nextLabel={t('fundReportGame.summary')}
            glow={glow}
            testId="fr-why"
            onPick={(v) => pick('sharpe', v, v === sharpe(s))}
            onNext={() => setStep('done')}
          />
        </div>
      )}
    </section>
  );
}
