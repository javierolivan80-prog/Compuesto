import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Button } from '../../components/Button';
import {
  committeeResult,
  committeeValues,
  DECISIONS,
  elCollateral,
  elOptions,
  expectedLoss,
  marginIncome,
  provision,
  provisionOptions,
  rightDecision,
  setupCommittee,
  stageOf,
  type CommitteeAnswer,
  type Decision,
  type Stage,
} from '../../engine/games/risk-committee';
import { t } from '../../i18n';
import { formatNumber } from '../../lib/format';
import { haptic, HAPTIC } from '../../lib/haptics';
import { playSound } from '../../lib/sound';
import { AskStep, PopLayer, shake, usePops } from './kit';
import './committee-game.css';

interface Props {
  seed: number;
  /** Al terminar y pulsar «Ver qué ha pasado»: las cifras de la partida para la explicación y los ejercicios. */
  onDone: (values: Record<string, number>) => void;
}

type Step = 'el' | 'decision' | 'stage' | 'provision' | 'done';
/** Sin ceros sobrantes: 9, 19,2, 3,75. */
const num = (v: number) =>
  formatNumber(v, Number.isInteger(v) ? 0 : Number.isInteger(Math.round(v * 100) / 10) ? 1 : 2);
const pct = (v: number) => `${num(v)}\u00a0%`;
/** Importes en miles de €. */
const keur = (v: number) => `${num(v)}\u00a0mil\u00a0€`;

/** Expediente del comité: etiquetas y cifras en una rejilla que se reparte sola. */
function Board({ rows, note }: { rows: [label: string, value: ReactNode][]; note?: string }) {
  return (
    <div className="cg-board grid gap-2 rounded-[var(--radius-sm)] border p-3">
      <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,8rem),1fr))] gap-2" data-num>
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

export function CommitteeGame({ seed, onDone }: Props) {
  const s = useMemo(() => setupCommittee(seed), [seed]);
  const [step, setStep] = useState<Step>('el');
  const [answer, setAnswer] = useState<Partial<CommitteeAnswer>>({});
  const [glow, setGlow] = useState(0);
  const box = useRef<HTMLElement>(null);
  const { pops, pop } = usePops();
  const decision = rightDecision(s);
  const stage = stageOf(s);

  const feedback = (ok: boolean) => {
    if (ok) {
      setGlow((g) => g + 1);
      playSound('hit');
      haptic(HAPTIC.success);
      pop(t('committeeGame.hit'), 'up', 50, 20);
    } else {
      playSound('miss');
      haptic(HAPTIC.failure);
      if (box.current) shake(box.current);
    }
  };
  const pick = (
    key: keyof CommitteeAnswer,
    value: CommitteeAnswer[keyof CommitteeAnswer],
    ok: boolean,
  ) => {
    setAnswer((a) => ({ ...a, [key]: value }));
    feedback(ok);
  };

  if (step === 'done') {
    const full: CommitteeAnswer = {
      el: answer.el ?? 0,
      decision: answer.decision ?? (decision === 'approve' ? 'reject' : 'approve'),
      stage: answer.stage ?? (stage === 1 ? 3 : 1),
      provision: answer.provision ?? 0,
    };
    const r = committeeResult(s, full);
    const row = (label: string, ok: boolean) => (
      <div>
        <dt className="text-text-2 text-sm">{label}</dt>
        <dd className={`text-lg ${ok ? 'text-bull' : 'text-bear'}`}>
          {ok ? `✓ ${t('committeeGame.yes')}` : `✗ ${t('committeeGame.no')}`}
        </dd>
      </div>
    );
    return (
      <section
        aria-labelledby="cg-done"
        className="cg-panel grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
        data-testid="cg-done"
      >
        <h2 id="cg-done" className="text-3xl">
          {t('committeeGame.doneTitle')}
        </h2>
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
          {row(t('committeeGame.row.el'), r.elHit)}
          {row(t('committeeGame.row.decision'), r.decisionHit)}
          {row(t('committeeGame.row.stage'), r.stageHit)}
          {row(t('committeeGame.row.provision'), r.provisionHit)}
        </dl>
        <p className="text-lg" data-testid="cg-verdict">
          {r.score >= 1
            ? t('committeeGame.great')
            : r.score >= 0.5
              ? t('committeeGame.ok')
              : t('committeeGame.bad')}
        </p>
        <Button onClick={() => onDone(committeeValues(s, full))}>
          {t('committeeGame.debrief')}
        </Button>
      </section>
    );
  }

  const loan = { pd: pct(s.pd), lgd: pct(s.lgd), ead: keur(s.ead) };
  const portfolio = {
    pd12: pct(s.pd12),
    pdLife: pct(s.pdLife),
    lgd: pct(s.lgd2),
    ead: keur(s.ead2),
  };

  return (
    <section
      ref={box}
      aria-labelledby="cg-title"
      className="cg-panel relative grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
    >
      <header className="grid gap-1">
        <h2 id="cg-title" className="text-3xl">
          {t('committeeGame.title')}
        </h2>
        <p className="text-text-2 text-sm" data-testid="cg-step">
          {t(`committeeGame.step.${step}`)}
        </p>
      </header>
      <PopLayer pops={pops} />

      {step === 'el' && (
        <div className="grid gap-3">
          <p>{t('committeeGame.briefEl')}</p>
          <Board
            rows={[
              [t('committeeGame.board.ead'), loan.ead],
              [t('committeeGame.board.pd'), loan.pd],
              [t('committeeGame.board.lgd'), loan.lgd],
            ]}
            note={t('committeeGame.units')}
          />
          <AskStep<number>
            question={t('committeeGame.askEl')}
            options={elOptions(s).map((o) => ({ value: o, label: keur(o) }))}
            chosen={answer.el}
            right={expectedLoss(s)}
            why={t('committeeGame.whyEl', { ...loan, v: keur(expectedLoss(s)) })}
            nextLabel={t('committeeGame.next')}
            glow={glow}
            testId="cg-why"
            onPick={(v) => pick('el', v, v === expectedLoss(s))}
            onNext={() => setStep('decision')}
          />
        </div>
      )}

      {step === 'decision' && (
        <div className="grid gap-3">
          <p>
            {t('committeeGame.briefDecision', {
              margin: pct(s.margin),
              income: keur(marginIncome(s)),
              lgdc: pct(s.lgdCollateral),
            })}
          </p>
          <AskStep<Decision>
            question={t('committeeGame.askDecision')}
            options={DECISIONS.map((v) => ({ value: v, label: t(`committeeGame.decision.${v}`) }))}
            chosen={answer.decision}
            right={decision}
            why={t(`committeeGame.whyDecision.${decision}`, {
              income: keur(marginIncome(s)),
              el: keur(expectedLoss(s)),
              elc: keur(elCollateral(s)),
            })}
            nextLabel={t('committeeGame.next')}
            glow={glow}
            testId="cg-why"
            onPick={(v) => pick('decision', v, v === decision)}
            onNext={() => setStep('stage')}
          />
        </div>
      )}

      {step === 'stage' && (
        <div className="grid gap-3">
          <p>{t('committeeGame.briefStage')}</p>
          <Board
            rows={[
              [t('committeeGame.board.days'), formatNumber(s.days)],
              [
                t('committeeGame.board.notches'),
                t('committeeGame.board.notchesValue', { v: formatNumber(s.notches) }),
              ],
            ]}
          />
          <AskStep<Stage>
            question={t('committeeGame.askStage')}
            options={([1, 2, 3] as const).map((v) => ({
              value: v,
              label: t(`committeeGame.stage.${v}`),
            }))}
            chosen={answer.stage}
            right={stage}
            why={t(`committeeGame.whyStage.${stage}`)}
            nextLabel={t('committeeGame.next')}
            glow={glow}
            testId="cg-why"
            onPick={(v) => pick('stage', v, v === stage)}
            onNext={() => setStep('provision')}
          />
        </div>
      )}

      {step === 'provision' && (
        <div className="grid gap-3">
          <p>{t('committeeGame.briefProvision', { ead: portfolio.ead, lgd: portfolio.lgd })}</p>
          <Board
            rows={[
              [t('committeeGame.board.pd12'), portfolio.pd12],
              [t('committeeGame.board.pdLife'), portfolio.pdLife],
              [t('committeeGame.board.lgd'), portfolio.lgd],
              [t('committeeGame.board.ead'), portfolio.ead],
            ]}
          />
          <AskStep<number>
            question={t('committeeGame.askProvision')}
            options={provisionOptions(s).map((o) => ({ value: o, label: keur(o) }))}
            chosen={answer.provision}
            right={provision(s)}
            why={t(`committeeGame.whyProvision.${stage}`, {
              ...portfolio,
              v: keur(provision(s)),
            })}
            nextLabel={t('committeeGame.summary')}
            glow={glow}
            testId="cg-why"
            onPick={(v) => pick('provision', v, v === provision(s))}
            onNext={() => setStep('done')}
          />
        </div>
      )}
    </section>
  );
}
