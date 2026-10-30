import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Button } from '../../components/Button';
import {
  borrowFee,
  callOptions,
  callPrice,
  div,
  divPaid,
  duty,
  feeOptions,
  gross,
  INITIAL_MARGIN_PCT,
  p0,
  p1,
  pnl,
  pnlOptions,
  setupShort,
  shortPct,
  shortResult,
  shortValues,
  wipePrice,
  type ShortAnswer,
  type ShortDuty,
} from '../../engine/games/short-desk';
import { t } from '../../i18n';
import { formatNumber } from '../../lib/format';
import { haptic, HAPTIC } from '../../lib/haptics';
import { playSound } from '../../lib/sound';
import { AskStep, PopLayer, shake, usePops } from './kit';
import './short-desk-game.css';

interface Props {
  seed: number;
  /** Al terminar y pulsar «Ver qué ha pasado»: las cifras de la partida para la explicación y los ejercicios. */
  onDone: (values: Record<string, number>) => void;
}

type Step = 'fee' | 'pnl' | 'call' | 'duty' | 'done';
const price = (v: number) => `${formatNumber(v, 2)}\u00a0€`;
/** Importes con signo menos tipográfico: −3.500 €. */
const money = (v: number) =>
  `${v < 0 ? '−' : ''}${formatNumber(Math.abs(v), Number.isInteger(v) ? 0 : 2)}\u00a0€`;
const pct = (v: number, d = 0) => `${formatNumber(v, d)}\u00a0%`;

/** Pantalla de la mesa: etiquetas y cifras en una rejilla que se reparte sola. */
function Board({ rows }: { rows: [label: string, value: ReactNode][] }) {
  return (
    <div className="sd-board grid gap-2 rounded-[var(--radius-sm)] border p-3">
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

export function ShortDeskGame({ seed, onDone }: Props) {
  const s = useMemo(() => setupShort(seed), [seed]);
  const [step, setStep] = useState<Step>('fee');
  const [answer, setAnswer] = useState<Partial<ShortAnswer>>({});
  const [glow, setGlow] = useState(0);
  const box = useRef<HTMLElement>(null);
  const { pops, pop } = usePops();
  const right = duty(s);

  const feedback = (ok: boolean) => {
    if (ok) {
      setGlow((g) => g + 1);
      playSound('hit');
      haptic(HAPTIC.success);
      pop(t('shortDeskGame.hit'), 'up', 50, 20);
    } else {
      playSound('miss');
      haptic(HAPTIC.failure);
      if (box.current) shake(box.current);
    }
  };
  const pick = (key: keyof ShortAnswer, value: ShortAnswer[keyof ShortAnswer], ok: boolean) => {
    setAnswer((a) => ({ ...a, [key]: value }));
    feedback(ok);
  };

  if (step === 'done') {
    const full: ShortAnswer = {
      fee: answer.fee ?? 0,
      pnl: answer.pnl ?? 0,
      call: answer.call ?? 0,
      duty: answer.duty ?? (right === 'none' ? 'publish' : 'none'),
    };
    const r = shortResult(s, full);
    const row = (label: string, ok: boolean) => (
      <div>
        <dt className="text-text-2 text-sm">{label}</dt>
        <dd className={`text-lg ${ok ? 'text-bull' : 'text-bear'}`}>
          {ok ? `✓ ${t('shortDeskGame.yes')}` : `✗ ${t('shortDeskGame.no')}`}
        </dd>
      </div>
    );
    return (
      <section
        aria-labelledby="sd-done"
        className="sd-panel grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
        data-testid="sd-done"
      >
        <h2 id="sd-done" className="text-3xl">
          {t('shortDeskGame.doneTitle')}
        </h2>
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
          {row(t('shortDeskGame.row.fee'), r.feeHit)}
          {row(t('shortDeskGame.row.pnl'), r.pnlHit)}
          {row(t('shortDeskGame.row.call'), r.callHit)}
          {row(t('shortDeskGame.row.duty'), r.dutyHit)}
        </dl>
        <p className="text-lg" data-testid="sd-verdict">
          {r.score >= 1
            ? t('shortDeskGame.great')
            : r.score >= 0.5
              ? t('shortDeskGame.ok')
              : t('shortDeskGame.bad')}
        </p>
        <Button onClick={() => onDone(shortValues(s, full))}>{t('shortDeskGame.debrief')}</Button>
      </section>
    );
  }

  return (
    <section
      ref={box}
      aria-labelledby="sd-title"
      className="sd-panel relative grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
    >
      <header className="grid gap-1">
        <h2 id="sd-title" className="text-3xl">
          {t('shortDeskGame.title')}
        </h2>
        <p className="text-text-2 text-sm" data-testid="sd-step">
          {t(`shortDeskGame.step.${step}`)}
        </p>
      </header>
      <PopLayer pops={pops} />

      {step === 'fee' && (
        <div className="grid gap-3">
          <p>{t('shortDeskGame.briefFee')}</p>
          <Board
            rows={[
              [t('shortDeskGame.board.qty'), formatNumber(s.qty)],
              [t('shortDeskGame.board.p0'), price(p0(s))],
              [t('shortDeskGame.board.rate'), pct(s.ratePct)],
              [t('shortDeskGame.board.days'), formatNumber(s.days)],
            ]}
          />
          <AskStep<number>
            question={t('shortDeskGame.askFee')}
            options={feeOptions(s).map((o) => ({ value: o, label: money(o) }))}
            chosen={answer.fee}
            right={borrowFee(s)}
            why={t('shortDeskGame.whyFee', {
              qty: formatNumber(s.qty),
              p0: price(p0(s)),
              rate: pct(s.ratePct),
              days: formatNumber(s.days),
              v: money(borrowFee(s)),
            })}
            nextLabel={t('shortDeskGame.next')}
            glow={glow}
            testId="sd-why"
            onPick={(v) => pick('fee', v, v === borrowFee(s))}
            onNext={() => setStep('pnl')}
          />
        </div>
      )}

      {step === 'pnl' && (
        <div className="grid gap-3">
          <p>{t('shortDeskGame.briefPnl', { div: price(div(s)) })}</p>
          <Board
            rows={[
              [t('shortDeskGame.board.p0'), price(p0(s))],
              [t('shortDeskGame.board.p1'), price(p1(s))],
              [t('shortDeskGame.board.div'), price(div(s))],
              [t('shortDeskGame.board.fee'), money(borrowFee(s))],
            ]}
          />
          <AskStep<number>
            question={t('shortDeskGame.askPnl')}
            options={pnlOptions(s).map((o) => ({ value: o, label: money(o) }))}
            chosen={answer.pnl}
            right={pnl(s)}
            why={t('shortDeskGame.whyPnl', {
              gross: money(gross(s)),
              fee: money(borrowFee(s)),
              div: money(divPaid(s)),
              v: money(pnl(s)),
            })}
            nextLabel={t('shortDeskGame.next')}
            glow={glow}
            testId="sd-why"
            onPick={(v) => pick('pnl', v, v === pnl(s))}
            onNext={() => setStep('call')}
          />
        </div>
      )}

      {step === 'call' && (
        <div className="grid gap-3">
          <p>
            {t('shortDeskGame.briefCall', {
              im: pct(INITIAL_MARGIN_PCT),
              mm: pct(s.mmPct),
            })}
          </p>
          <Board
            rows={[
              [t('shortDeskGame.board.p0'), price(p0(s))],
              [t('shortDeskGame.board.collateral'), pct(100 + INITIAL_MARGIN_PCT)],
              [t('shortDeskGame.board.mm'), pct(s.mmPct)],
            ]}
          />
          <AskStep<number>
            question={t('shortDeskGame.askCall')}
            options={callOptions(s).map((o) => ({ value: o, label: price(o) }))}
            chosen={answer.call}
            right={callPrice(s)}
            why={t('shortDeskGame.whyCall', {
              p0: price(p0(s)),
              mm: formatNumber(1 + s.mmPct / 100, 2),
              v: price(callPrice(s)),
              wipe: price(wipePrice(s)),
            })}
            nextLabel={t('shortDeskGame.next')}
            glow={glow}
            testId="sd-why"
            onPick={(v) => pick('call', v, v === callPrice(s))}
            onNext={() => setStep('duty')}
          />
        </div>
      )}

      {step === 'duty' && (
        <div className="grid gap-3">
          <p>{t('shortDeskGame.briefDuty', { pct: pct(shortPct(s), 2) })}</p>
          <AskStep<ShortDuty>
            question={t('shortDeskGame.askDuty')}
            options={(['none', 'notify', 'publish'] as const).map((v) => ({
              value: v,
              label: t(`shortDeskGame.duty.${v}`),
            }))}
            chosen={answer.duty}
            right={right}
            why={t(`shortDeskGame.whyDuty.${right}`, { pct: pct(shortPct(s), 2) })}
            nextLabel={t('shortDeskGame.summary')}
            glow={glow}
            testId="sd-why"
            onPick={(v) => pick('duty', v, v === right)}
            onNext={() => setStep('done')}
          />
        </div>
      )}
    </section>
  );
}
