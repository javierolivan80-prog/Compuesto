import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Button } from '../../components/Button';
import {
  apr,
  CET1_REFERENCE,
  cet1Options,
  cet1Ratio,
  lcr,
  lcrOptions,
  nii,
  niiOptions,
  setupStress,
  stressedRatio,
  stressOptions,
  stressResult,
  stressValues,
  type StressAnswer,
} from '../../engine/games/stress-test';
import { t } from '../../i18n';
import { formatNumber } from '../../lib/format';
import { haptic, HAPTIC } from '../../lib/haptics';
import { playSound } from '../../lib/sound';
import { AskStep, PopLayer, shake, usePops } from './kit';
import './stress-game.css';

interface Props {
  seed: number;
  /** Al terminar y pulsar «Ver qué ha pasado»: las cifras de la partida para la explicación y los ejercicios. */
  onDone: (values: Record<string, number>) => void;
}

type Step = 'nii' | 'cet1' | 'stress' | 'lcr' | 'done';
/** Tipos sin ceros sobrantes: 4 %, 1,5 %. */
const rate = (v: number) => `${formatNumber(v, Number.isInteger(v) ? 0 : 1)}\u00a0%`;
/** Ratios siempre con un decimal, como en un informe de solvencia: 13,1 %, 8,0 %. */
const ratio = (v: number) => `${formatNumber(v, 1)}\u00a0%`;
const amount = (v: number) => formatNumber(v);
const meur = (v: number) => `${formatNumber(v)}\u00a0M€`;

/** Panel de indicadores: etiquetas y cifras en una rejilla que se reparte sola. */
function Board({ rows, note }: { rows: [label: string, value: ReactNode][]; note?: string }) {
  return (
    <div className="sg-board grid gap-2 rounded-[var(--radius-sm)] border p-3">
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

export function StressGame({ seed, onDone }: Props) {
  const s = useMemo(() => setupStress(seed), [seed]);
  const [step, setStep] = useState<Step>('nii');
  const [answer, setAnswer] = useState<Partial<StressAnswer>>({});
  const [glow, setGlow] = useState(0);
  const box = useRef<HTMLElement>(null);
  const { pops, pop } = usePops();

  const feedback = (ok: boolean) => {
    if (ok) {
      setGlow((g) => g + 1);
      playSound('hit');
      haptic(HAPTIC.success);
      pop(t('stressGame.hit'), 'up', 50, 20);
    } else {
      playSound('miss');
      haptic(HAPTIC.failure);
      if (box.current) shake(box.current);
    }
  };
  const pick = (key: keyof StressAnswer, value: number, ok: boolean) => {
    setAnswer((a) => ({ ...a, [key]: value }));
    feedback(ok);
  };

  if (step === 'done') {
    const full: StressAnswer = {
      nii: answer.nii ?? 0,
      cet1: answer.cet1 ?? 0,
      stressed: answer.stressed ?? 0,
      lcr: answer.lcr ?? 0,
    };
    const r = stressResult(s, full);
    const row = (label: string, ok: boolean) => (
      <div>
        <dt className="text-text-2 text-sm">{label}</dt>
        <dd className={`text-lg ${ok ? 'text-bull' : 'text-bear'}`}>
          {ok ? `✓ ${t('stressGame.yes')}` : `✗ ${t('stressGame.no')}`}
        </dd>
      </div>
    );
    return (
      <section
        aria-labelledby="sg-done"
        className="sg-panel grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
        data-testid="sg-done"
      >
        <h2 id="sg-done" className="text-3xl">
          {t('stressGame.doneTitle')}
        </h2>
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
          {row(t('stressGame.row.nii'), r.niiHit)}
          {row(t('stressGame.row.cet1'), r.cet1Hit)}
          {row(t('stressGame.row.stress'), r.stressedHit)}
          {row(t('stressGame.row.lcr'), r.lcrHit)}
        </dl>
        <p className="text-lg" data-testid="sg-verdict">
          {r.score >= 1
            ? t('stressGame.great')
            : r.score >= 0.5
              ? t('stressGame.ok')
              : t('stressGame.bad')}
        </p>
        <Button onClick={() => onDone(stressValues(s, full))}>{t('stressGame.debrief')}</Button>
      </section>
    );
  }

  const stressed = stressedRatio(s);
  const pass = stressed >= CET1_REFERENCE;

  return (
    <section
      ref={box}
      aria-labelledby="sg-title"
      className="sg-panel relative grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
    >
      <header className="grid gap-1">
        <h2 id="sg-title" className="text-3xl">
          {t('stressGame.title')}
        </h2>
        <p className="text-text-2 text-sm" data-testid="sg-step">
          {t(`stressGame.step.${step}`)}
        </p>
      </header>
      <PopLayer pops={pops} />

      {step === 'nii' && (
        <div className="grid gap-3">
          <p>{t('stressGame.briefNii')}</p>
          <Board
            rows={[
              [t('stressGame.board.loans'), amount(s.loans)],
              [t('stressGame.board.rLoans'), rate(s.rLoans)],
              [t('stressGame.board.deposits'), amount(s.deposits)],
              [t('stressGame.board.rDeposits'), rate(s.rDeposits)],
            ]}
            note={t('stressGame.units')}
          />
          <AskStep<number>
            question={t('stressGame.askNii')}
            options={niiOptions(s).map((o) => ({ value: o, label: meur(o) }))}
            chosen={answer.nii}
            right={nii(s)}
            why={t('stressGame.whyNii', {
              loans: amount(s.loans),
              rLoans: rate(s.rLoans),
              deposits: amount(s.deposits),
              rDeposits: rate(s.rDeposits),
              v: meur(nii(s)),
            })}
            nextLabel={t('stressGame.next')}
            glow={glow}
            testId="sg-why"
            onPick={(v) => pick('nii', v, v === nii(s))}
            onNext={() => setStep('cet1')}
          />
        </div>
      )}

      {step === 'cet1' && (
        <div className="grid gap-3">
          <p>{t('stressGame.briefCet1')}</p>
          <Board
            rows={[
              [t('stressGame.board.mortgages'), amount(s.mortgages)],
              [t('stressGame.board.corporates'), amount(s.corporates)],
              [t('stressGame.board.cet1'), amount(s.cet1)],
            ]}
            note={t('stressGame.units')}
          />
          <AskStep<number>
            question={t('stressGame.askCet1')}
            options={cet1Options(s).map((o) => ({ value: o, label: ratio(o) }))}
            chosen={answer.cet1}
            right={cet1Ratio(s)}
            why={t('stressGame.whyCet1', {
              mortgages: amount(s.mortgages),
              corporates: amount(s.corporates),
              apr: amount(apr(s)),
              cet1: amount(s.cet1),
              v: ratio(cet1Ratio(s)),
            })}
            nextLabel={t('stressGame.next')}
            glow={glow}
            testId="sg-why"
            onPick={(v) => pick('cet1', v, v === cet1Ratio(s))}
            onNext={() => setStep('stress')}
          />
        </div>
      )}

      {step === 'stress' && (
        <div className="grid gap-3">
          <p>{t('stressGame.briefStress', { losses: amount(s.losses), rise: rate(s.aprRise) })}</p>
          <Board
            rows={[
              [t('stressGame.board.cet1'), amount(s.cet1)],
              [t('stressGame.board.apr'), amount(apr(s))],
              [t('stressGame.board.losses'), amount(s.losses)],
              [t('stressGame.board.aprRise'), rate(s.aprRise)],
            ]}
            note={t('stressGame.units')}
          />
          <AskStep<number>
            question={t('stressGame.askStress')}
            options={stressOptions(s).map((o) => ({ value: o, label: ratio(o) }))}
            chosen={answer.stressed}
            right={stressed}
            why={t(`stressGame.whyStress.${pass ? 'pass' : 'fail'}`, {
              cet1: amount(s.cet1),
              losses: amount(s.losses),
              apr: amount(apr(s)),
              rise: rate(s.aprRise),
              v: ratio(stressed),
            })}
            nextLabel={t('stressGame.next')}
            glow={glow}
            testId="sg-why"
            onPick={(v) => pick('stressed', v, v === stressed)}
            onNext={() => setStep('lcr')}
          />
        </div>
      )}

      {step === 'lcr' && (
        <div className="grid gap-3">
          <p>{t('stressGame.briefLcr')}</p>
          <Board
            rows={[
              [t('stressGame.board.hqla'), amount(s.hqla)],
              [t('stressGame.board.outflows'), amount(s.outflows)],
              [t('stressGame.board.inflows'), amount(s.inflows)],
            ]}
            note={t('stressGame.units')}
          />
          <AskStep<number>
            question={t('stressGame.askLcr')}
            options={lcrOptions(s).map((o) => ({ value: o, label: ratio(o) }))}
            chosen={answer.lcr}
            right={lcr(s)}
            why={t('stressGame.whyLcr', {
              hqla: amount(s.hqla),
              outflows: amount(s.outflows),
              inflows: amount(s.inflows),
              v: ratio(lcr(s)),
            })}
            nextLabel={t('stressGame.summary')}
            glow={glow}
            testId="sg-why"
            onPick={(v) => pick('lcr', v, v === lcr(s))}
            onNext={() => setStep('done')}
          />
        </div>
      )}
    </section>
  );
}
