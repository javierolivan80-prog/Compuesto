import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Button } from '../../components/Button';
import {
  arrival,
  commission,
  costOptions,
  driftBp,
  explicitCost,
  fillPrice,
  itf,
  itfApplies,
  setupVwap,
  shortfallBp,
  shortfallOptions,
  tradeValue,
  twap,
  vsVwapBp,
  vwap,
  vwapOptions,
  vwapResult,
  vwapValues,
  type VwapAnswer,
  type Venue,
} from '../../engine/games/vwap-desk';
import { t } from '../../i18n';
import { formatNumber } from '../../lib/format';
import { haptic, HAPTIC } from '../../lib/haptics';
import { playSound } from '../../lib/sound';
import { AskStep, PopLayer, shake, usePops } from './kit';
import './vwap-desk-game.css';

interface Props {
  seed: number;
  /** Al terminar y pulsar «Ver qué ha pasado»: las cifras de la partida para la explicación y los ejercicios. */
  onDone: (values: Record<string, number>) => void;
}

type Step = 'vwap' | 'shortfall' | 'cost' | 'venue' | 'done';
/** Puntos básicos con un decimal y signo menos tipográfico: 80,0 pb, −25,7 pb. */
const bp = (v: number) => `${v < 0 ? '−' : ''}${formatNumber(Math.abs(v), 1)}\u00a0pb`;
const price = (v: number) => `${formatNumber(v, 2)}\u00a0€`;
const price3 = (v: number) => `${formatNumber(v, 3)}\u00a0€`;
const money = (v: number) => `${formatNumber(v, Number.isInteger(v) ? 0 : 2)}\u00a0€`;

/** Pantalla de la mesa: etiquetas y cifras en una rejilla que se reparte sola. */
function Board({ rows }: { rows: [label: string, value: ReactNode][] }) {
  return (
    <div className="vw-board grid gap-2 rounded-[var(--radius-sm)] border p-3">
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

export function VwapDeskGame({ seed, onDone }: Props) {
  const s = useMemo(() => setupVwap(seed), [seed]);
  const [step, setStep] = useState<Step>('vwap');
  const [answer, setAnswer] = useState<Partial<VwapAnswer>>({});
  const [glow, setGlow] = useState(0);
  const box = useRef<HTMLElement>(null);
  const { pops, pop } = usePops();

  const feedback = (ok: boolean) => {
    if (ok) {
      setGlow((g) => g + 1);
      playSound('hit');
      haptic(HAPTIC.success);
      pop(t('vwapDeskGame.hit'), 'up', 50, 20);
    } else {
      playSound('miss');
      haptic(HAPTIC.failure);
      if (box.current) shake(box.current);
    }
  };
  const pick = (key: keyof VwapAnswer, value: VwapAnswer[keyof VwapAnswer], ok: boolean) => {
    setAnswer((a) => ({ ...a, [key]: value }));
    feedback(ok);
  };

  if (step === 'done') {
    const full: VwapAnswer = {
      vwap: answer.vwap ?? 0,
      shortfall: answer.shortfall ?? 0,
      cost: answer.cost ?? 0,
      venue: answer.venue ?? (s.venue === 'now' ? 'close' : 'now'),
    };
    const r = vwapResult(s, full);
    const row = (label: string, ok: boolean) => (
      <div>
        <dt className="text-text-2 text-sm">{label}</dt>
        <dd className={`text-lg ${ok ? 'text-bull' : 'text-bear'}`}>
          {ok ? `✓ ${t('vwapDeskGame.yes')}` : `✗ ${t('vwapDeskGame.no')}`}
        </dd>
      </div>
    );
    return (
      <section
        aria-labelledby="vw-done"
        className="vw-panel grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
        data-testid="vw-done"
      >
        <h2 id="vw-done" className="text-3xl">
          {t('vwapDeskGame.doneTitle')}
        </h2>
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
          {row(t('vwapDeskGame.row.vwap'), r.vwapHit)}
          {row(t('vwapDeskGame.row.shortfall'), r.shortfallHit)}
          {row(t('vwapDeskGame.row.cost'), r.costHit)}
          {row(t('vwapDeskGame.row.venue'), r.venueHit)}
        </dl>
        <p className="text-lg" data-testid="vw-verdict">
          {r.score >= 1
            ? t('vwapDeskGame.great')
            : r.score >= 0.5
              ? t('vwapDeskGame.ok')
              : t('vwapDeskGame.bad')}
        </p>
        <Button onClick={() => onDone(vwapValues(s, full))}>{t('vwapDeskGame.debrief')}</Button>
      </section>
    );
  }

  return (
    <section
      ref={box}
      aria-labelledby="vw-title"
      className="vw-panel relative grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
    >
      <header className="grid gap-1">
        <h2 id="vw-title" className="text-3xl">
          {t('vwapDeskGame.title')}
        </h2>
        <p className="text-text-2 text-sm" data-testid="vw-step">
          {t(`vwapDeskGame.step.${step}`)}
        </p>
      </header>
      <PopLayer pops={pops} />

      {step === 'vwap' && (
        <div className="grid gap-3">
          <p>{t('vwapDeskGame.briefVwap')}</p>
          <Board
            rows={s.pricesC.map((p, i) => [
              t(`vwapDeskGame.board.slot${i + 1}`),
              <>
                {price(p / 100)}
                <span className="text-text-2 block text-sm">
                  {t('vwapDeskGame.board.shares', { n: formatNumber(s.vols[i]!) })}
                </span>
              </>,
            ])}
          />
          <AskStep<number>
            question={t('vwapDeskGame.askVwap')}
            options={vwapOptions(s).map((o) => ({ value: o, label: price3(o) }))}
            chosen={answer.vwap}
            right={vwap(s)}
            why={t('vwapDeskGame.whyVwap', {
              v: price3(vwap(s)),
              twap: price3(twap(s)),
              vol: formatNumber(s.vols[0] + s.vols[1] + s.vols[2]),
            })}
            nextLabel={t('vwapDeskGame.next')}
            glow={glow}
            testId="vw-why"
            onPick={(v) => pick('vwap', v, v === vwap(s))}
            onNext={() => setStep('shortfall')}
          />
        </div>
      )}

      {step === 'shortfall' && (
        <div className="grid gap-3">
          <p>{t('vwapDeskGame.briefShortfall', { arrival: price(arrival(s)) })}</p>
          <Board
            rows={[
              [t('vwapDeskGame.board.arrival'), price(arrival(s))],
              [t('vwapDeskGame.board.fill'), price(fillPrice(s))],
              [t('vwapDeskGame.board.vwap'), price3(vwap(s))],
            ]}
          />
          <AskStep<number>
            question={t('vwapDeskGame.askShortfall')}
            options={shortfallOptions(s).map((o) => ({ value: o, label: bp(o) }))}
            chosen={answer.shortfall}
            right={shortfallBp(s)}
            why={t('vwapDeskGame.whyShortfall', {
              fill: price(fillPrice(s)),
              arrival: price(arrival(s)),
              v: bp(shortfallBp(s)),
              vs: bp(vsVwapBp(s)),
              drift: bp(driftBp(s)),
            })}
            nextLabel={t('vwapDeskGame.next')}
            glow={glow}
            testId="vw-why"
            onPick={(v) => pick('shortfall', v, v === shortfallBp(s))}
            onNext={() => setStep('cost')}
          />
        </div>
      )}

      {step === 'cost' && (
        <div className="grid gap-3">
          <p>
            {t(`vwapDeskGame.briefCost.${s.costCase}`, {
              qty: formatNumber(s.qty),
              fill: price(fillPrice(s)),
              comm: formatNumber(s.commBp / 100, 2),
            })}
          </p>
          <Board
            rows={[
              [t('vwapDeskGame.board.value'), money(tradeValue(s))],
              [t('vwapDeskGame.board.comm'), `${formatNumber(s.commBp / 100, 2)}\u00a0%`],
            ]}
          />
          <AskStep<number>
            question={t('vwapDeskGame.askCost')}
            options={costOptions(s).map((o) => ({ value: o, label: money(o) }))}
            chosen={answer.cost}
            right={explicitCost(s)}
            why={t(`vwapDeskGame.whyCost.${itfApplies(s) ? 'with' : s.costCase}`, {
              value: money(tradeValue(s)),
              comm: money(commission(s)),
              itf: money(itf(s)),
              v: money(explicitCost(s)),
            })}
            nextLabel={t('vwapDeskGame.next')}
            glow={glow}
            testId="vw-why"
            onPick={(v) => pick('cost', v, v === explicitCost(s))}
            onNext={() => setStep('venue')}
          />
        </div>
      )}

      {step === 'venue' && (
        <div className="grid gap-3">
          <p>{t(`vwapDeskGame.briefVenue.${s.venue}`)}</p>
          <AskStep<Venue>
            question={t('vwapDeskGame.askVenue')}
            options={(['close', 'vwap', 'now'] as const).map((v) => ({
              value: v,
              label: t(`vwapDeskGame.venue.${v}`),
            }))}
            chosen={answer.venue}
            right={s.venue}
            why={t(`vwapDeskGame.whyVenue.${s.venue}`)}
            nextLabel={t('vwapDeskGame.summary')}
            glow={glow}
            testId="vw-why"
            onPick={(v) => pick('venue', v, v === s.venue)}
            onNext={() => setStep('done')}
          />
        </div>
      )}
    </section>
  );
}
