import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Button } from '../../components/Button';
import {
  edgeResult,
  edgeValues,
  ev,
  evOptions,
  falsePositives,
  fpOptions,
  posterior,
  posteriorOptions,
  setupEdge,
  sharpe,
  significant,
  tOptions,
  tStat,
  type EdgeAnswer,
} from '../../engine/games/edge-test';
import { t } from '../../i18n';
import { formatNumber } from '../../lib/format';
import { haptic, HAPTIC } from '../../lib/haptics';
import { playSound } from '../../lib/sound';
import { AskStep, PopLayer, shake, usePops } from './kit';
import './edge-test-game.css';

interface Props {
  seed: number;
  /** Al terminar y pulsar «Ver qué ha pasado»: las cifras de la partida para la explicación y los ejercicios. */
  onDone: (values: Record<string, number>) => void;
}

type Step = 'ev' | 't' | 'fp' | 'post' | 'done';
/** Importes con signo menos tipográfico: −12 €. */
const money = (v: number) =>
  `${v < 0 ? '−' : ''}${formatNumber(Math.abs(v), Number.isInteger(v) ? 0 : 2)}\u00a0€`;
const num = (v: number, d: number) => formatNumber(v, d);
const pct = (v: number, d = 0) => `${formatNumber(v, d)}\u00a0%`;
/** Número con los decimales justos: 2, 0,4. */
const plain = (v: number) => formatNumber(v, Number.isInteger(v) ? 0 : 1);

/** Pantalla del comité: etiquetas y cifras en una rejilla que se reparte sola. */
function Board({ rows }: { rows: [label: string, value: ReactNode][] }) {
  return (
    <div className="et-board grid gap-2 rounded-[var(--radius-sm)] border p-3">
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

export function EdgeTestGame({ seed, onDone }: Props) {
  const s = useMemo(() => setupEdge(seed), [seed]);
  const [step, setStep] = useState<Step>('ev');
  const [answer, setAnswer] = useState<Partial<EdgeAnswer>>({});
  const [glow, setGlow] = useState(0);
  const box = useRef<HTMLElement>(null);
  const { pops, pop } = usePops();

  const feedback = (ok: boolean) => {
    if (ok) {
      setGlow((g) => g + 1);
      playSound('hit');
      haptic(HAPTIC.success);
      pop(t('edgeTestGame.hit'), 'up', 50, 20);
    } else {
      playSound('miss');
      haptic(HAPTIC.failure);
      if (box.current) shake(box.current);
    }
  };
  const pick = (key: keyof EdgeAnswer, value: number, ok: boolean) => {
    setAnswer((a) => ({ ...a, [key]: value }));
    feedback(ok);
  };

  if (step === 'done') {
    const full: EdgeAnswer = {
      ev: answer.ev ?? 0,
      t: answer.t ?? 0,
      fp: answer.fp ?? 0,
      post: answer.post ?? 0,
    };
    const r = edgeResult(s, full);
    const row = (label: string, ok: boolean) => (
      <div>
        <dt className="text-text-2 text-sm">{label}</dt>
        <dd className={`text-lg ${ok ? 'text-bull' : 'text-bear'}`}>
          {ok ? `✓ ${t('edgeTestGame.yes')}` : `✗ ${t('edgeTestGame.no')}`}
        </dd>
      </div>
    );
    return (
      <section
        aria-labelledby="et-done"
        className="et-panel grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
        data-testid="et-done"
      >
        <h2 id="et-done" className="text-3xl">
          {t('edgeTestGame.doneTitle')}
        </h2>
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
          {row(t('edgeTestGame.row.ev'), r.evHit)}
          {row(t('edgeTestGame.row.t'), r.tHit)}
          {row(t('edgeTestGame.row.fp'), r.fpHit)}
          {row(t('edgeTestGame.row.post'), r.postHit)}
        </dl>
        <p className="text-lg" data-testid="et-verdict">
          {r.score >= 1
            ? t('edgeTestGame.great')
            : r.score >= 0.5
              ? t('edgeTestGame.ok')
              : t('edgeTestGame.bad')}
        </p>
        <Button onClick={() => onDone(edgeValues(s, full))}>{t('edgeTestGame.debrief')}</Button>
      </section>
    );
  }

  return (
    <section
      ref={box}
      aria-labelledby="et-title"
      className="et-panel relative grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
    >
      <header className="grid gap-1">
        <h2 id="et-title" className="text-3xl">
          {t('edgeTestGame.title')}
        </h2>
        <p className="text-text-2 text-sm" data-testid="et-step">
          {t(`edgeTestGame.step.${step}`)}
        </p>
      </header>
      <PopLayer pops={pops} />

      {step === 'ev' && (
        <div className="grid gap-3">
          <p>{t('edgeTestGame.briefEv')}</p>
          <Board
            rows={[
              [t('edgeTestGame.board.win'), pct(s.winPct)],
              [t('edgeTestGame.board.avgWin'), money(s.avgWin)],
              [t('edgeTestGame.board.avgLoss'), money(s.avgLoss)],
            ]}
          />
          <AskStep<number>
            question={t('edgeTestGame.askEv')}
            options={evOptions(s).map((o) => ({ value: o, label: money(o) }))}
            chosen={answer.ev}
            right={ev(s)}
            why={t(`edgeTestGame.whyEv.${ev(s) > 0 ? 'pos' : 'neg'}`, {
              win: num(s.winPct / 100, 2),
              lose: num(1 - s.winPct / 100, 2),
              g: money(s.avgWin),
              l: money(s.avgLoss),
              v: money(ev(s)),
            })}
            nextLabel={t('edgeTestGame.next')}
            glow={glow}
            testId="et-why"
            onPick={(v) => pick('ev', v, v === ev(s))}
            onNext={() => setStep('t')}
          />
        </div>
      )}

      {step === 't' && (
        <div className="grid gap-3">
          <p>{t('edgeTestGame.briefT')}</p>
          <Board
            rows={[
              [t('edgeTestGame.board.sharpe'), num(sharpe(s), 2)],
              [t('edgeTestGame.board.years'), formatNumber(s.years)],
            ]}
          />
          <AskStep<number>
            question={t('edgeTestGame.askT')}
            options={tOptions(s).map((o) => ({ value: o, label: num(o, 2) }))}
            chosen={answer.t}
            right={tStat(s)}
            why={t(`edgeTestGame.whyT.${significant(s) ? 'yes' : 'no'}`, {
              sharpe: num(sharpe(s), 2),
              years: formatNumber(s.years),
              v: num(tStat(s), 2),
            })}
            nextLabel={t('edgeTestGame.next')}
            glow={glow}
            testId="et-why"
            onPick={(v) => pick('t', v, v === tStat(s))}
            onNext={() => setStep('fp')}
          />
        </div>
      )}

      {step === 'fp' && (
        <div className="grid gap-3">
          <p>{t('edgeTestGame.briefFp', { n: formatNumber(s.tests) })}</p>
          <AskStep<number>
            question={t('edgeTestGame.askFp')}
            options={fpOptions(s).map((o) => ({ value: o, label: plain(o) }))}
            chosen={answer.fp}
            right={falsePositives(s)}
            why={t('edgeTestGame.whyFp', {
              n: formatNumber(s.tests),
              v: plain(falsePositives(s)),
            })}
            nextLabel={t('edgeTestGame.next')}
            glow={glow}
            testId="et-why"
            onPick={(v) => pick('fp', v, v === falsePositives(s))}
            onNext={() => setStep('post')}
          />
        </div>
      )}

      {step === 'post' && (
        <div className="grid gap-3">
          <p>{t('edgeTestGame.briefPost')}</p>
          <Board
            rows={[
              [t('edgeTestGame.board.prior'), pct(s.prior)],
              [t('edgeTestGame.board.sens'), pct(s.sens)],
              [t('edgeTestGame.board.fpr'), pct(s.fpr)],
            ]}
          />
          <AskStep<number>
            question={t('edgeTestGame.askPost')}
            options={posteriorOptions(s).map((o) => ({ value: o, label: pct(o, 1) }))}
            chosen={answer.post}
            right={posterior(s)}
            why={t('edgeTestGame.whyPost', {
              prior: pct(s.prior),
              sens: pct(s.sens),
              fpr: pct(s.fpr),
              true: formatNumber((s.sens * s.prior) / 100, 1),
              false: formatNumber((s.fpr * (100 - s.prior)) / 100, 1),
              v: pct(posterior(s), 1),
            })}
            nextLabel={t('edgeTestGame.summary')}
            glow={glow}
            testId="et-why"
            onPick={(v) => pick('post', v, v === posterior(s))}
            onNext={() => setStep('done')}
          />
        </div>
      )}
    </section>
  );
}
