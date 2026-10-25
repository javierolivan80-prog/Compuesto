import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Button } from '../../components/Button';
import {
  bankResult,
  bankValues,
  justified,
  justifiedOptions,
  justifiedR,
  pvtc,
  pvtcOptions,
  rightPick,
  rote,
  roteOptions,
  setupBank,
  tangible,
  type BankAnswer,
  type Pick,
} from '../../engine/games/bank-valuation';
import { t } from '../../i18n';
import { formatNumber } from '../../lib/format';
import { haptic, HAPTIC } from '../../lib/haptics';
import { playSound } from '../../lib/sound';
import { AskStep, PopLayer, shake, usePops } from './kit';
import './bank-game.css';

interface Props {
  seed: number;
  /** Al terminar y pulsar «Ver qué ha pasado»: las cifras de la partida para la explicación y los ejercicios. */
  onDone: (values: Record<string, number>) => void;
}

type Step = 'rote' | 'pvtc' | 'justified' | 'pick' | 'done';
/** Porcentajes sin ceros sobrantes: 12 %, 10,5 %. */
const pct = (v: number) => `${formatNumber(v, Number.isInteger(v) ? 0 : 1)}\u00a0%`;
/** Múltiplos con dos decimales, como en un informe de research: 1,10x. */
const mult = (v: number) => `${formatNumber(v, 2)}x`;
const amount = (v: number) => formatNumber(v);

/** Ficha del banco: etiquetas y cifras en una rejilla que se reparte sola. */
function Board({ rows, note }: { rows: [label: string, value: ReactNode][]; note?: string }) {
  return (
    <div className="bv-board grid gap-2 rounded-[var(--radius-sm)] border p-3">
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

export function BankGame({ seed, onDone }: Props) {
  const s = useMemo(() => setupBank(seed), [seed]);
  const [step, setStep] = useState<Step>('rote');
  const [answer, setAnswer] = useState<Partial<BankAnswer>>({});
  const [glow, setGlow] = useState(0);
  const box = useRef<HTMLElement>(null);
  const { pops, pop } = usePops();
  const winner = rightPick(s);

  const feedback = (ok: boolean) => {
    if (ok) {
      setGlow((g) => g + 1);
      playSound('hit');
      haptic(HAPTIC.success);
      pop(t('bankGame.hit'), 'up', 50, 20);
    } else {
      playSound('miss');
      haptic(HAPTIC.failure);
      if (box.current) shake(box.current);
    }
  };
  const pick = (key: keyof BankAnswer, value: BankAnswer[keyof BankAnswer], ok: boolean) => {
    setAnswer((a) => ({ ...a, [key]: value }));
    feedback(ok);
  };

  if (step === 'done') {
    const full: BankAnswer = {
      rote: answer.rote ?? 0,
      pvtc: answer.pvtc ?? 0,
      justified: answer.justified ?? 0,
      pick: answer.pick ?? 'same',
    };
    const r = bankResult(s, full);
    const row = (label: string, ok: boolean) => (
      <div>
        <dt className="text-text-2 text-sm">{label}</dt>
        <dd className={`text-lg ${ok ? 'text-bull' : 'text-bear'}`}>
          {ok ? `✓ ${t('bankGame.yes')}` : `✗ ${t('bankGame.no')}`}
        </dd>
      </div>
    );
    return (
      <section
        aria-labelledby="bv-done"
        className="bv-panel grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
        data-testid="bv-done"
      >
        <h2 id="bv-done" className="text-3xl">
          {t('bankGame.doneTitle')}
        </h2>
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
          {row(t('bankGame.row.rote'), r.roteHit)}
          {row(t('bankGame.row.pvtc'), r.pvtcHit)}
          {row(t('bankGame.row.justified'), r.justifiedHit)}
          {row(t('bankGame.row.pick'), r.pickHit)}
        </dl>
        <p className="text-lg" data-testid="bv-verdict">
          {r.score >= 1
            ? t('bankGame.great')
            : r.score >= 0.5
              ? t('bankGame.ok')
              : t('bankGame.bad')}
        </p>
        <Button onClick={() => onDone(bankValues(s, full))}>{t('bankGame.debrief')}</Button>
      </section>
    );
  }

  return (
    <section
      ref={box}
      aria-labelledby="bv-title"
      className="bv-panel relative grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
    >
      <header className="grid gap-1">
        <h2 id="bv-title" className="text-3xl">
          {t('bankGame.title')}
        </h2>
        <p className="text-text-2 text-sm" data-testid="bv-step">
          {t(`bankGame.step.${step}`)}
        </p>
      </header>
      <PopLayer pops={pops} />

      {step === 'rote' && (
        <div className="grid gap-3">
          <p>{t('bankGame.briefRote')}</p>
          <Board
            rows={[
              [t('bankGame.board.ni'), amount(s.ni)],
              [t('bankGame.board.equity'), amount(s.equity)],
              [t('bankGame.board.intangibles'), amount(s.intangibles)],
            ]}
            note={t('bankGame.units')}
          />
          <AskStep<number>
            question={t('bankGame.askRote')}
            options={roteOptions(s).map((o) => ({ value: o, label: pct(o) }))}
            chosen={answer.rote}
            right={rote(s)}
            why={t('bankGame.whyRote', {
              ni: amount(s.ni),
              equity: amount(s.equity),
              intangibles: amount(s.intangibles),
              v: pct(rote(s)),
            })}
            nextLabel={t('bankGame.next')}
            glow={glow}
            testId="bv-why"
            onPick={(v) => pick('rote', v, v === rote(s))}
            onNext={() => setStep('pvtc')}
          />
        </div>
      )}

      {step === 'pvtc' && (
        <div className="grid gap-3">
          <p>{t('bankGame.briefPvtc', { cap: amount(s.cap) })}</p>
          <Board
            rows={[
              [t('bankGame.board.cap'), amount(s.cap)],
              [t('bankGame.board.equity'), amount(s.equity)],
              [t('bankGame.board.intangibles'), amount(s.intangibles)],
            ]}
            note={t('bankGame.units')}
          />
          <AskStep<number>
            question={t('bankGame.askPvtc')}
            options={pvtcOptions(s).map((o) => ({ value: o, label: mult(o) }))}
            chosen={answer.pvtc}
            right={pvtc(s)}
            why={t('bankGame.whyPvtc', {
              cap: amount(s.cap),
              tangible: amount(tangible(s)),
              v: mult(pvtc(s)),
            })}
            nextLabel={t('bankGame.next')}
            glow={glow}
            testId="bv-why"
            onPick={(v) => pick('pvtc', v, v === pvtc(s))}
            onNext={() => setStep('justified')}
          />
        </div>
      )}

      {step === 'justified' && (
        <div className="grid gap-3">
          <p>{t('bankGame.briefJustified', { ke: pct(s.ke), g: pct(s.g) })}</p>
          <Board
            rows={[
              [t('bankGame.board.rote'), pct(rote(s))],
              [t('bankGame.board.ke'), pct(s.ke)],
              [t('bankGame.board.g'), pct(s.g)],
            ]}
          />
          <AskStep<number>
            question={t('bankGame.askJustified')}
            options={justifiedOptions(s).map((o) => ({ value: o, label: mult(o) }))}
            chosen={answer.justified}
            right={justified(s)}
            why={t('bankGame.whyJustified', {
              rote: pct(rote(s)),
              ke: pct(s.ke),
              g: pct(s.g),
              v: mult(justified(s)),
            })}
            nextLabel={t('bankGame.next')}
            glow={glow}
            testId="bv-why"
            onPick={(v) => pick('justified', v, v === justified(s))}
            onNext={() => setStep('pick')}
          />
        </div>
      )}

      {step === 'pick' && (
        <div className="grid gap-3">
          <p>{t('bankGame.briefPick', { roteR: pct(s.roteR), pvtcR: mult(s.pvtcR) })}</p>
          <Board
            rows={[
              [`${t('bankGame.pick.malvarrosa')} · ${t('bankGame.board.pvtc')}`, mult(pvtc(s))],
              [
                `${t('bankGame.pick.malvarrosa')} · ${t('bankGame.board.justified')}`,
                mult(justified(s)),
              ],
              [`${t('bankGame.pick.russafa')} · ${t('bankGame.board.rote')}`, pct(s.roteR)],
              [`${t('bankGame.pick.russafa')} · ${t('bankGame.board.pvtc')}`, mult(s.pvtcR)],
            ]}
          />
          <AskStep<Pick>
            question={t('bankGame.askPick')}
            options={(['malvarrosa', 'russafa', 'same'] as const).map((v) => ({
              value: v,
              label: t(`bankGame.pick.${v}`),
            }))}
            chosen={answer.pick}
            right={winner}
            why={t(`bankGame.whyPick.${winner}`, {
              jM: mult(justified(s)),
              pM: mult(pvtc(s)),
              jR: mult(justifiedR(s)),
              pR: mult(s.pvtcR),
            })}
            nextLabel={t('bankGame.summary')}
            glow={glow}
            testId="bv-why"
            onPick={(v) => pick('pick', v, v === winner)}
            onNext={() => setStep('done')}
          />
        </div>
      )}
    </section>
  );
}
