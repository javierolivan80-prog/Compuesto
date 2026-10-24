import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Button } from '../../components/Button';
import {
  accountOptions,
  carryOptions,
  carryReturn,
  currentAccount,
  forward,
  forwardOptions,
  fxDeskResult,
  fxDeskValues,
  setupFxDesk,
  type Country,
  type FxDeskAnswer,
} from '../../engine/games/fx-desk';
import { t } from '../../i18n';
import { formatNumber } from '../../lib/format';
import { haptic, HAPTIC } from '../../lib/haptics';
import { playSound } from '../../lib/sound';
import { AskStep, PopLayer, shake, usePops } from './kit';
import './fx-desk-game.css';

interface Props {
  seed: number;
  /** Al terminar y pulsar «Ver qué ha pasado»: las cifras de la partida para la explicación y los ejercicios. */
  onDone: (values: Record<string, number>) => void;
}

type Step = 'account' | 'forward' | 'carry' | 'country' | 'done';
/** Sin ceros sobrantes y con el signo menos tipográfico: 2 %, −2,5 %, 1,12. */
const num = (v: number) =>
  `${v < 0 ? '−' : ''}${formatNumber(Math.abs(v), Number.isInteger(v) ? 0 : Number.isInteger(Math.round(v * 100) / 10) ? 1 : 2)}`;
const pct = (v: number) => `${num(v)}\u00a0%`;
/** Cambios con cuatro decimales, como en una pantalla de divisas. */
const fx4 = (v: number) => formatNumber(v, 4);
const amount = (v: number) => `${v < 0 ? '−' : ''}${formatNumber(Math.abs(v))}`;

/** Pizarra de datos de la mesa: etiquetas y cifras en una rejilla que se reparte sola. */
function Board({ rows, note }: { rows: [label: string, value: ReactNode][]; note?: string }) {
  return (
    <div className="fd-board grid gap-2 rounded-[var(--radius-sm)] border p-3">
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

export function FxDeskGame({ seed, onDone }: Props) {
  const s = useMemo(() => setupFxDesk(seed), [seed]);
  const [step, setStep] = useState<Step>('account');
  const [answer, setAnswer] = useState<Partial<FxDeskAnswer>>({});
  const [glow, setGlow] = useState(0);
  const box = useRef<HTMLElement>(null);
  const { pops, pop } = usePops();

  const feedback = (ok: boolean) => {
    if (ok) {
      setGlow((g) => g + 1);
      playSound('hit');
      haptic(HAPTIC.success);
      pop(t('fxDeskGame.hit'), 'up', 50, 20);
    } else {
      playSound('miss');
      haptic(HAPTIC.failure);
      if (box.current) shake(box.current);
    }
  };
  const pick = (key: keyof FxDeskAnswer, value: FxDeskAnswer[keyof FxDeskAnswer], ok: boolean) => {
    setAnswer((a) => ({ ...a, [key]: value }));
    feedback(ok);
  };

  if (step === 'done') {
    const full: FxDeskAnswer = {
      account: answer.account ?? 0,
      forward: answer.forward ?? 0,
      carry: answer.carry ?? 0,
      country: answer.country ?? 'same',
    };
    const r = fxDeskResult(s, full);
    const row = (label: string, ok: boolean) => (
      <div>
        <dt className="text-text-2 text-sm">{label}</dt>
        <dd className={`text-lg ${ok ? 'text-bull' : 'text-bear'}`}>
          {ok ? `✓ ${t('fxDeskGame.yes')}` : `✗ ${t('fxDeskGame.no')}`}
        </dd>
      </div>
    );
    return (
      <section
        aria-labelledby="fd-done"
        className="fd-panel grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
        data-testid="fd-done"
      >
        <h2 id="fd-done" className="text-3xl">
          {t('fxDeskGame.doneTitle')}
        </h2>
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
          {row(t('fxDeskGame.row.account'), r.accountHit)}
          {row(t('fxDeskGame.row.forward'), r.forwardHit)}
          {row(t('fxDeskGame.row.carry'), r.carryHit)}
          {row(t('fxDeskGame.row.country'), r.countryHit)}
        </dl>
        <p className="text-lg" data-testid="fd-verdict">
          {r.score >= 1
            ? t('fxDeskGame.great')
            : r.score >= 0.5
              ? t('fxDeskGame.ok')
              : t('fxDeskGame.bad')}
        </p>
        <Button onClick={() => onDone(fxDeskValues(s, full))}>{t('fxDeskGame.debrief')}</Button>
      </section>
    );
  }

  const balance = (v: number) =>
    t('fxDeskGame.amount', {
      v: amount(v),
      kind: t(v >= 0 ? 'fxDeskGame.surplus' : 'fxDeskGame.deficit'),
    });
  const rates = { spot: fx4(s.spot), iEur: pct(s.iEur), iUsd: pct(s.iUsd) };
  const carry = { iHigh: pct(s.iHigh), iFund: pct(s.iFund), dep: pct(s.depreciation) };
  const countryBoard = (c: 'a' | 'b') => {
    const [cc, debt] = c === 'a' ? [s.ccA, s.debtA] : [s.ccB, s.debtB];
    return (
      <div className="grid gap-1" data-testid={`fd-country-${c}`}>
        <p className="font-medium">{t('fxDeskGame.board.country', { c: c.toUpperCase() })}</p>
        <Board
          rows={[
            [t('fxDeskGame.board.cc'), pct(cc)],
            [t('fxDeskGame.board.debt'), pct(debt)],
          ]}
        />
      </div>
    );
  };

  return (
    <section
      ref={box}
      aria-labelledby="fd-title"
      className="fd-panel relative grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
    >
      <header className="grid gap-1">
        <h2 id="fd-title" className="text-3xl">
          {t('fxDeskGame.title')}
        </h2>
        <p className="text-text-2 text-sm" data-testid="fd-step">
          {t(`fxDeskGame.step.${step}`)}
        </p>
      </header>
      <PopLayer pops={pops} />

      {step === 'account' && (
        <div className="grid gap-3">
          <p>{t('fxDeskGame.briefAccount')}</p>
          <Board
            rows={[
              [t('fxDeskGame.board.exports'), amount(s.exports)],
              [t('fxDeskGame.board.imports'), amount(s.imports)],
              [t('fxDeskGame.board.income'), amount(s.income)],
            ]}
            note={t('fxDeskGame.units')}
          />
          <AskStep<number>
            question={t('fxDeskGame.askAccount')}
            options={accountOptions(s).map((o) => ({ value: o, label: balance(o) }))}
            chosen={answer.account}
            right={currentAccount(s)}
            why={t('fxDeskGame.whyAccount', {
              exports: amount(s.exports),
              imports: amount(s.imports),
              income: amount(s.income),
              v: balance(currentAccount(s)),
            })}
            nextLabel={t('fxDeskGame.next')}
            glow={glow}
            testId="fd-why"
            onPick={(v) => pick('account', v, v === currentAccount(s))}
            onNext={() => setStep('forward')}
          />
        </div>
      )}

      {step === 'forward' && (
        <div className="grid gap-3">
          <p>{t('fxDeskGame.briefForward', rates)}</p>
          <Board
            rows={[
              [t('fxDeskGame.board.spot'), rates.spot],
              [t('fxDeskGame.board.iEur'), rates.iEur],
              [t('fxDeskGame.board.iUsd'), rates.iUsd],
            ]}
          />
          <AskStep<number>
            question={t('fxDeskGame.askForward')}
            options={forwardOptions(s).map((o) => ({ value: o, label: fx4(o) }))}
            chosen={answer.forward}
            right={forward(s)}
            why={t('fxDeskGame.whyForward', { ...rates, v: fx4(forward(s)) })}
            nextLabel={t('fxDeskGame.next')}
            glow={glow}
            testId="fd-why"
            onPick={(v) => pick('forward', v, v === forward(s))}
            onNext={() => setStep('carry')}
          />
        </div>
      )}

      {step === 'carry' && (
        <div className="grid gap-3">
          <p>{t('fxDeskGame.briefCarry', carry)}</p>
          <Board
            rows={[
              [t('fxDeskGame.board.iHigh'), carry.iHigh],
              [t('fxDeskGame.board.iFund'), carry.iFund],
              [t('fxDeskGame.board.depreciation'), carry.dep],
            ]}
          />
          <AskStep<number>
            question={t('fxDeskGame.askCarry')}
            options={carryOptions(s).map((o) => ({ value: o, label: pct(o) }))}
            chosen={answer.carry}
            right={carryReturn(s)}
            why={t('fxDeskGame.whyCarry', { ...carry, v: pct(carryReturn(s)) })}
            nextLabel={t('fxDeskGame.next')}
            glow={glow}
            testId="fd-why"
            onPick={(v) => pick('carry', v, v === carryReturn(s))}
            onNext={() => setStep('country')}
          />
        </div>
      )}

      {step === 'country' && (
        <div className="grid gap-3">
          <p>{t('fxDeskGame.briefCountry')}</p>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-3">
            {countryBoard('a')}
            {countryBoard('b')}
          </div>
          <AskStep<Country>
            question={t('fxDeskGame.askCountry')}
            options={(['a', 'b', 'same'] as const).map((v) => ({
              value: v,
              label: t(`fxDeskGame.country.${v}`),
            }))}
            chosen={answer.country}
            right={s.vulnerable}
            why={t('fxDeskGame.whyCountry', { c: s.vulnerable.toUpperCase() })}
            nextLabel={t('fxDeskGame.summary')}
            glow={glow}
            testId="fd-why"
            onPick={(v) => pick('country', v, v === s.vulnerable)}
            onNext={() => setStep('done')}
          />
        </div>
      )}
    </section>
  );
}
