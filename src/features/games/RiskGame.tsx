import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Button } from '../../components/Button';
import {
  debtRatio0,
  nextRatio,
  phaseOf,
  PHASES,
  premiumResult,
  premiumValues,
  ratioOptions,
  sectorFor,
  setupPremium,
  spreadBp,
  spreadOptions,
  type Phase,
  type PremiumAnswer,
  type Sector,
} from '../../engine/games/risk-premium';
import { t } from '../../i18n';
import { formatNumber } from '../../lib/format';
import { haptic, HAPTIC } from '../../lib/haptics';
import { playSound } from '../../lib/sound';
import { AskStep, PopLayer, shake, usePops } from './kit';
import './risk-game.css';

interface Props {
  seed: number;
  /** Al terminar y pulsar «Ver qué ha pasado»: las cifras de la partida para la explicación y los ejercicios. */
  onDone: (values: Record<string, number>) => void;
}

type Step = 'phase' | 'sector' | 'spread' | 'debt' | 'done';
/** Sin ceros sobrantes: 2 %, 3,4 %, 3,45 %; los negativos con signo menos tipográfico. */
const num = (v: number) =>
  `${v < 0 ? '−' : ''}${formatNumber(Math.abs(v), Number.isInteger(v) ? 0 : Number.isInteger(Math.round(v * 100) / 10) ? 1 : 2)}`;
const pct = (v: number) => `${num(v)}\u00a0%`;
const bp = (v: number) => t('riskGame.bp', { v: num(v) });
const amount = (v: number) => formatNumber(v, 0);

/** Pizarra de datos de la mesa: etiquetas y cifras en una rejilla que se reparte sola. */
function Board({ rows, note }: { rows: [label: string, value: ReactNode][]; note?: string }) {
  return (
    <div className="rg-board grid gap-2 rounded-[var(--radius-sm)] border p-3">
      <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,7rem),1fr))] gap-2" data-num>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-text-2 text-sm">{label}</dt>
            <dd className="text-xl">{value}</dd>
          </div>
        ))}
      </dl>
      {note ? <p className="text-text-2 text-sm">{note}</p> : null}
    </div>
  );
}

export function RiskGame({ seed, onDone }: Props) {
  const s = useMemo(() => setupPremium(seed), [seed]);
  const [step, setStep] = useState<Step>('phase');
  const [answer, setAnswer] = useState<Partial<PremiumAnswer>>({});
  const [glow, setGlow] = useState(0);
  const box = useRef<HTMLElement>(null);
  const { pops, pop } = usePops();
  const phase = phaseOf(s);
  const sector = sectorFor(phase);

  const feedback = (ok: boolean) => {
    if (ok) {
      setGlow((g) => g + 1);
      playSound('hit');
      haptic(HAPTIC.success);
      pop(t('riskGame.hit'), 'up', 50, 20);
    } else {
      playSound('miss');
      haptic(HAPTIC.failure);
      if (box.current) shake(box.current);
    }
  };
  const pick = (
    key: keyof PremiumAnswer,
    value: PremiumAnswer[keyof PremiumAnswer],
    ok: boolean,
  ) => {
    setAnswer((a) => ({ ...a, [key]: value }));
    feedback(ok);
  };

  if (step === 'done') {
    const full: PremiumAnswer = {
      phase: answer.phase ?? (phase === 'boom' ? 'recession' : 'boom'),
      sector: answer.sector ?? (sector === 'cyclical' ? 'defensive' : 'cyclical'),
      spread: answer.spread ?? 0,
      ratio: answer.ratio ?? 0,
    };
    const r = premiumResult(s, full);
    const row = (label: string, ok: boolean) => (
      <div>
        <dt className="text-text-2 text-sm">{label}</dt>
        <dd className={`text-lg ${ok ? 'text-bull' : 'text-bear'}`}>
          {ok ? `✓ ${t('riskGame.yes')}` : `✗ ${t('riskGame.no')}`}
        </dd>
      </div>
    );
    return (
      <section
        aria-labelledby="rg-done"
        className="rg-panel grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
        data-testid="rg-done"
      >
        <h2 id="rg-done" className="text-3xl">
          {t('riskGame.doneTitle')}
        </h2>
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
          {row(t('riskGame.row.phase'), r.phaseHit)}
          {row(t('riskGame.row.sector'), r.sectorHit)}
          {row(t('riskGame.row.spread'), r.spreadHit)}
          {row(t('riskGame.row.debt'), r.ratioHit)}
        </dl>
        <p className="text-lg" data-testid="rg-verdict">
          {r.score >= 1
            ? t('riskGame.great')
            : r.score >= 0.5
              ? t('riskGame.ok')
              : t('riskGame.bad')}
        </p>
        <Button onClick={() => onDone(premiumValues(s, full))}>{t('riskGame.debrief')}</Button>
      </section>
    );
  }

  const macro = {
    growth: pct(s.growth),
    potential: pct(s.potential),
    prev: pct(s.inflPrev),
    now: pct(s.inflNow),
    pmi: num(s.pmi),
  };
  const rising = s.inflNow > s.inflPrev;
  const debt = {
    debt: amount(s.debt),
    gdp: amount(s.gdp),
    deficit: amount(s.deficit),
    g: pct(s.nominalGrowth),
  };

  return (
    <section
      ref={box}
      aria-labelledby="rg-title"
      className="rg-panel relative grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
    >
      <header className="grid gap-1">
        <h2 id="rg-title" className="text-3xl">
          {t('riskGame.title')}
        </h2>
        <p className="text-text-2 text-sm" data-testid="rg-step">
          {t(`riskGame.step.${step}`)}
        </p>
      </header>
      <PopLayer pops={pops} />

      {step === 'phase' && (
        <div className="grid gap-3">
          <p>{t('riskGame.briefPhase')}</p>
          <Board
            rows={[
              [t('riskGame.board.growth'), macro.growth],
              [t('riskGame.board.potential'), macro.potential],
              [
                t('riskGame.board.inflation'),
                <span data-testid="rg-inflation">{`${macro.prev} → ${macro.now} ${rising ? '▲' : '▼'}`}</span>,
              ],
              [t('riskGame.board.pmi'), macro.pmi],
            ]}
          />
          <AskStep<Phase>
            question={t('riskGame.askPhase')}
            options={PHASES.map((v) => ({ value: v, label: t(`riskGame.phase.${v}`) }))}
            chosen={answer.phase}
            right={phase}
            why={t(`riskGame.whyPhase.${phase}`, macro)}
            nextLabel={t('riskGame.next')}
            glow={glow}
            testId="rg-why"
            onPick={(v) => pick('phase', v, v === phase)}
            onNext={() => setStep('sector')}
          />
        </div>
      )}

      {step === 'sector' && (
        <div className="grid gap-3">
          <AskStep<Sector>
            question={t('riskGame.askSector')}
            options={(['cyclical', 'defensive'] as const).map((v) => ({
              value: v,
              label: t(`riskGame.sector.${v}`),
            }))}
            chosen={answer.sector}
            right={sector}
            why={t(`riskGame.whySector.${sector}`, { phase: t(`riskGame.phaseIn.${phase}`) })}
            nextLabel={t('riskGame.next')}
            glow={glow}
            testId="rg-why"
            onPick={(v) => pick('sector', v, v === sector)}
            onNext={() => setStep('spread')}
          />
        </div>
      )}

      {step === 'spread' && (
        <div className="grid gap-3">
          <p>{t('riskGame.briefSpread', { spain: pct(s.spain), bund: pct(s.bund) })}</p>
          <Board
            rows={[
              [t('riskGame.board.spain'), pct(s.spain)],
              [t('riskGame.board.bund'), pct(s.bund)],
            ]}
          />
          <AskStep<number>
            question={t('riskGame.askSpread')}
            options={spreadOptions(s).map((o) => ({ value: o, label: bp(o) }))}
            chosen={answer.spread}
            right={spreadBp(s)}
            why={t('riskGame.whySpread', {
              spain: pct(s.spain),
              bund: pct(s.bund),
              v: bp(spreadBp(s)),
            })}
            nextLabel={t('riskGame.next')}
            glow={glow}
            testId="rg-why"
            onPick={(v) => pick('spread', v, v === spreadBp(s))}
            onNext={() => setStep('debt')}
          />
        </div>
      )}

      {step === 'debt' && (
        <div className="grid gap-3">
          <p>{t('riskGame.briefDebt', debt)}</p>
          <Board
            rows={[
              [t('riskGame.board.debt'), debt.debt],
              [t('riskGame.board.gdp'), debt.gdp],
              [t('riskGame.board.deficit'), debt.deficit],
              [t('riskGame.board.nominal'), debt.g],
            ]}
            note={t('riskGame.units')}
          />
          <AskStep<number>
            question={t('riskGame.askDebt')}
            options={ratioOptions(s).map((o) => ({ value: o, label: pct(o) }))}
            chosen={answer.ratio}
            right={nextRatio(s)}
            why={t('riskGame.whyDebt', {
              ...debt,
              v: pct(nextRatio(s)),
              r0: pct(debtRatio0(s)),
            })}
            nextLabel={t('riskGame.summary')}
            glow={glow}
            testId="rg-why"
            onPick={(v) => pick('ratio', v, v === nextRatio(s))}
            onNext={() => setStep('done')}
          />
        </div>
      )}
    </section>
  );
}
