import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Button } from '../../components/Button';
import {
  ask,
  bid,
  darkSaving,
  deskResult,
  deskValues,
  effectiveBp,
  effectiveOptions,
  fill,
  impactBp,
  litAvg,
  mid,
  mid5,
  quotedBp,
  realizedBp,
  realizedOptions,
  rightMove,
  savingOptions,
  setupDesk,
  type DeskAnswer,
  type MakerMove,
} from '../../engine/games/order-desk';
import { t } from '../../i18n';
import { formatNumber } from '../../lib/format';
import { haptic, HAPTIC } from '../../lib/haptics';
import { playSound } from '../../lib/sound';
import { AskStep, PopLayer, shake, usePops } from './kit';
import './order-desk-game.css';

interface Props {
  seed: number;
  /** Al terminar y pulsar «Ver qué ha pasado»: las cifras de la partida para la explicación y los ejercicios. */
  onDone: (values: Record<string, number>) => void;
}

type Step = 'effective' | 'realized' | 'dark' | 'maker' | 'done';
/** Puntos básicos con un decimal y signo menos tipográfico: 60,0 pb, −6,7 pb. */
const bp = (v: number) => `${v < 0 ? '−' : ''}${formatNumber(Math.abs(v), 1)}\u00a0pb`;
const price = (v: number) => `${formatNumber(v, 2)}\u00a0€`;
/** El punto medio a 5 minutos puede caer en medio céntimo: 10,015 €. */
const price3 = (v: number) =>
  `${formatNumber(v, Number.isInteger(Math.round(v * 1000) / 10) ? 2 : 3)}\u00a0€`;
const money = (v: number) => `${formatNumber(v, Number.isInteger(v) ? 0 : 2)}\u00a0€`;

/** Pantalla de la mesa: etiquetas y cifras en una rejilla que se reparte sola. */
function Board({ rows }: { rows: [label: string, value: ReactNode][] }) {
  return (
    <div className="od-board grid gap-2 rounded-[var(--radius-sm)] border p-3">
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

export function OrderDeskGame({ seed, onDone }: Props) {
  const s = useMemo(() => setupDesk(seed), [seed]);
  const [step, setStep] = useState<Step>('effective');
  const [answer, setAnswer] = useState<Partial<DeskAnswer>>({});
  const [glow, setGlow] = useState(0);
  const box = useRef<HTMLElement>(null);
  const { pops, pop } = usePops();
  const move = rightMove(s);

  const feedback = (ok: boolean) => {
    if (ok) {
      setGlow((g) => g + 1);
      playSound('hit');
      haptic(HAPTIC.success);
      pop(t('orderDeskGame.hit'), 'up', 50, 20);
    } else {
      playSound('miss');
      haptic(HAPTIC.failure);
      if (box.current) shake(box.current);
    }
  };
  const pick = (key: keyof DeskAnswer, value: DeskAnswer[keyof DeskAnswer], ok: boolean) => {
    setAnswer((a) => ({ ...a, [key]: value }));
    feedback(ok);
  };

  if (step === 'done') {
    const full: DeskAnswer = {
      effective: answer.effective ?? 0,
      realized: answer.realized ?? 0,
      saving: answer.saving ?? 0,
      move: answer.move ?? 'narrow',
    };
    const r = deskResult(s, full);
    const row = (label: string, ok: boolean) => (
      <div>
        <dt className="text-text-2 text-sm">{label}</dt>
        <dd className={`text-lg ${ok ? 'text-bull' : 'text-bear'}`}>
          {ok ? `✓ ${t('orderDeskGame.yes')}` : `✗ ${t('orderDeskGame.no')}`}
        </dd>
      </div>
    );
    return (
      <section
        aria-labelledby="od-done"
        className="od-panel grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
        data-testid="od-done"
      >
        <h2 id="od-done" className="text-3xl">
          {t('orderDeskGame.doneTitle')}
        </h2>
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
          {row(t('orderDeskGame.row.effective'), r.effectiveHit)}
          {row(t('orderDeskGame.row.realized'), r.realizedHit)}
          {row(t('orderDeskGame.row.dark'), r.savingHit)}
          {row(t('orderDeskGame.row.maker'), r.moveHit)}
        </dl>
        <p className="text-lg" data-testid="od-verdict">
          {r.score >= 1
            ? t('orderDeskGame.great')
            : r.score >= 0.5
              ? t('orderDeskGame.ok')
              : t('orderDeskGame.bad')}
        </p>
        <Button onClick={() => onDone(deskValues(s, full))}>{t('orderDeskGame.debrief')}</Button>
      </section>
    );
  }

  return (
    <section
      ref={box}
      aria-labelledby="od-title"
      className="od-panel relative grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
    >
      <header className="grid gap-1">
        <h2 id="od-title" className="text-3xl">
          {t('orderDeskGame.title')}
        </h2>
        <p className="text-text-2 text-sm" data-testid="od-step">
          {t(`orderDeskGame.step.${step}`)}
        </p>
      </header>
      <PopLayer pops={pops} />

      {step === 'effective' && (
        <div className="grid gap-3">
          <p>{t('orderDeskGame.briefEffective')}</p>
          <Board
            rows={[
              [t('orderDeskGame.board.bid'), price(bid(s))],
              [t('orderDeskGame.board.ask'), price(ask(s))],
              [t('orderDeskGame.board.mid'), price(mid(s))],
              [t('orderDeskGame.board.fill'), price(fill(s))],
            ]}
          />
          <AskStep<number>
            question={t('orderDeskGame.askEffective')}
            options={effectiveOptions(s).map((o) => ({ value: o, label: bp(o) }))}
            chosen={answer.effective}
            right={effectiveBp(s)}
            why={t('orderDeskGame.whyEffective', {
              fill: price(fill(s)),
              mid: price(mid(s)),
              quoted: bp(quotedBp(s)),
              v: bp(effectiveBp(s)),
            })}
            nextLabel={t('orderDeskGame.next')}
            glow={glow}
            testId="od-why"
            onPick={(v) => pick('effective', v, v === effectiveBp(s))}
            onNext={() => setStep('realized')}
          />
        </div>
      )}

      {step === 'realized' && (
        <div className="grid gap-3">
          <p>{t('orderDeskGame.briefRealized', { ask: price(ask(s)), mid5: price3(mid5(s)) })}</p>
          <Board
            rows={[
              [t('orderDeskGame.board.mid'), price(mid(s))],
              [t('orderDeskGame.board.ask'), price(ask(s))],
              [t('orderDeskGame.board.mid5'), price3(mid5(s))],
            ]}
          />
          <AskStep<number>
            question={t('orderDeskGame.askRealized')}
            options={realizedOptions(s).map((o) => ({ value: o, label: bp(o) }))}
            chosen={answer.realized}
            right={realizedBp(s)}
            why={t('orderDeskGame.whyRealized', {
              ask: price(ask(s)),
              mid5: price3(mid5(s)),
              mid: price(mid(s)),
              quoted: bp(quotedBp(s)),
              impact: bp(impactBp(s)),
              v: bp(realizedBp(s)),
            })}
            nextLabel={t('orderDeskGame.next')}
            glow={glow}
            testId="od-why"
            onPick={(v) => pick('realized', v, v === realizedBp(s))}
            onNext={() => setStep('dark')}
          />
        </div>
      )}

      {step === 'dark' && (
        <div className="grid gap-3">
          <p>
            {t('orderDeskGame.briefDark', {
              qty: formatNumber(s.qty),
              lit: price(litAvg(s)),
              mid: price(mid(s)),
            })}
          </p>
          <Board
            rows={[
              [t('orderDeskGame.board.qty'), formatNumber(s.qty)],
              [t('orderDeskGame.board.litAvg'), price(litAvg(s))],
              [t('orderDeskGame.board.mid'), price(mid(s))],
            ]}
          />
          <AskStep<number>
            question={t('orderDeskGame.askDark')}
            options={savingOptions(s).map((o) => ({ value: o, label: money(o) }))}
            chosen={answer.saving}
            right={darkSaving(s)}
            why={t('orderDeskGame.whyDark', {
              qty: formatNumber(s.qty),
              lit: price(litAvg(s)),
              mid: price(mid(s)),
              v: money(darkSaving(s)),
            })}
            nextLabel={t('orderDeskGame.next')}
            glow={glow}
            testId="od-why"
            onPick={(v) => pick('saving', v, v === darkSaving(s))}
            onNext={() => setStep('maker')}
          />
        </div>
      )}

      {step === 'maker' && (
        <div className="grid gap-3">
          <p>{t(`orderDeskGame.briefMaker.${s.informed ? 'informed' : 'noise'}`)}</p>
          <AskStep<MakerMove>
            question={t('orderDeskGame.askMaker')}
            options={(['widen', 'keep', 'narrow'] as const).map((v) => ({
              value: v,
              label: t(`orderDeskGame.maker.${v}`),
            }))}
            chosen={answer.move}
            right={move}
            why={t(`orderDeskGame.whyMaker.${move}`)}
            nextLabel={t('orderDeskGame.summary')}
            glow={glow}
            testId="od-why"
            onPick={(v) => pick('move', v, v === move)}
            onNext={() => setStep('done')}
          />
        </div>
      )}
    </section>
  );
}
