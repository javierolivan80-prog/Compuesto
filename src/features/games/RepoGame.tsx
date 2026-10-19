import { useMemo, useRef, useState } from 'react';
import { Button } from '../../components/Button';
import {
  interest,
  interestOptions,
  loan,
  loanOptions,
  repoResult,
  repoValues,
  setupRepo,
  type RepoAnswer,
} from '../../engine/games/repo-night';
import { t } from '../../i18n';
import { formatEur, formatNumber } from '../../lib/format';
import { haptic, HAPTIC } from '../../lib/haptics';
import { playSound } from '../../lib/sound';
import { AskStep, PopLayer, shake, usePops } from './kit';
import './repo-game.css';

interface Props {
  seed: number;
  /** Al terminar y pulsar «Ver qué ha pasado»: las cifras de la partida para la explicación y los ejercicios. */
  onDone: (values: Record<string, number>) => void;
}

type Step = 'repo' | 'interest' | 'recourse' | 'done';
const pct = (v: number, d = 1) => `${formatNumber(v, d)}\u00a0%`;
const mill = (v: number) => t('repoGame.millions', { v: formatNumber(v, 2) });

export function RepoGame({ seed, onDone }: Props) {
  const s = useMemo(() => setupRepo(seed), [seed]);
  const [step, setStep] = useState<Step>('repo');
  const [answer, setAnswer] = useState<Partial<RepoAnswer>>({});
  const [glow, setGlow] = useState(0);
  const box = useRef<HTMLElement>(null);
  const { pops, pop } = usePops();

  const feedback = (ok: boolean) => {
    if (ok) {
      setGlow((g) => g + 1);
      playSound('hit');
      haptic(HAPTIC.success);
      pop(t('repoGame.hit'), 'up', 50, 20);
    } else {
      playSound('miss');
      haptic(HAPTIC.failure);
      if (box.current) shake(box.current);
    }
  };
  const pick = (key: keyof RepoAnswer, value: RepoAnswer[keyof RepoAnswer], ok: boolean) => {
    setAnswer((a) => ({ ...a, [key]: value }));
    feedback(ok);
  };

  if (step === 'done') {
    const full: RepoAnswer = {
      loan: answer.loan ?? 0,
      interest: answer.interest ?? 0,
      recourse: answer.recourse ?? 'titulizacion',
    };
    const r = repoResult(s, full);
    const row = (label: string, ok: boolean) => (
      <div>
        <dt className="text-text-2 text-sm">{label}</dt>
        <dd className={`text-lg ${ok ? 'text-bull' : 'text-bear'}`}>
          {ok ? `✓ ${t('repoGame.yes')}` : `✗ ${t('repoGame.no')}`}
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
          {t('repoGame.doneTitle')}
        </h2>
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
          {row(t('repoGame.row.loan'), r.loanHit)}
          {row(t('repoGame.row.interest'), r.interestHit)}
          {row(t('repoGame.row.recourse'), r.recourseHit)}
        </dl>
        <p className="text-lg" data-testid="rg-verdict">
          {r.score >= 1
            ? t('repoGame.great')
            : r.score >= 0.6
              ? t('repoGame.ok')
              : t('repoGame.bad')}
        </p>
        <Button onClick={() => onDone(repoValues(s, full))}>{t('repoGame.debrief')}</Button>
      </section>
    );
  }

  return (
    <section
      ref={box}
      aria-labelledby="rg-title"
      className="rg-panel relative grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
    >
      <header className="grid gap-1">
        <h2 id="rg-title" className="text-3xl">
          {t('repoGame.title')}
        </h2>
        <p className="text-text-2 text-sm" data-testid="rg-step">
          {t(`repoGame.step.${step}`)}
        </p>
      </header>
      <PopLayer pops={pops} />

      {step === 'repo' && (
        <div className="grid gap-3">
          <p>
            {t('repoGame.briefRepo', {
              collateral: mill(s.collateral),
              haircut: pct(s.haircut, 0),
            })}
          </p>
          <AskStep<number>
            question={t('repoGame.askLoan')}
            options={loanOptions(s).map((o) => ({ value: o, label: mill(o) }))}
            chosen={answer.loan}
            right={loan(s)}
            why={t('repoGame.whyLoan', {
              collateral: mill(s.collateral),
              haircut: pct(s.haircut, 0),
              loan: mill(loan(s)),
            })}
            nextLabel={t('repoGame.next')}
            glow={glow}
            testId="rg-why"
            onPick={(v) => pick('loan', v, v === loan(s))}
            onNext={() => setStep('interest')}
          />
        </div>
      )}

      {step === 'interest' && (
        <div className="grid gap-3">
          <p>
            {t('repoGame.briefInterest', {
              loan: mill(loan(s)),
              rate: pct(s.rate),
              days: s.days,
            })}
          </p>
          <AskStep<number>
            question={t('repoGame.askInterest', { days: s.days })}
            options={interestOptions(s).map((o) => ({ value: o, label: formatEur(o, 0) }))}
            chosen={answer.interest}
            right={interest(s)}
            why={t('repoGame.whyInterest', {
              loan: formatNumber(loan(s) * 1e6),
              rate: pct(s.rate),
              days: s.days,
              v: formatEur(interest(s), 0),
            })}
            nextLabel={t('repoGame.next')}
            glow={glow}
            testId="rg-why"
            onPick={(v) => pick('interest', v, v === interest(s))}
            onNext={() => setStep('recourse')}
          />
        </div>
      )}

      {step === 'recourse' && (
        <div className="grid gap-3">
          <p>{t('repoGame.briefRecourse')}</p>
          <AskStep<'cedula' | 'titulizacion'>
            question={t('repoGame.askRecourse')}
            options={[
              { value: 'cedula', label: t('repoGame.instrument.cedula') },
              { value: 'titulizacion', label: t('repoGame.instrument.titulizacion') },
            ]}
            chosen={answer.recourse}
            right="cedula"
            why={t('repoGame.whyRecourse')}
            nextLabel={t('repoGame.summary')}
            glow={glow}
            testId="rg-why"
            onPick={(v) => pick('recourse', v, v === 'cedula')}
            onNext={() => setStep('done')}
          />
        </div>
      )}
    </section>
  );
}
