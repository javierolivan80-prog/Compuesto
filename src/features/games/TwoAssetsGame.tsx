import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Button } from '../../components/Button';
import {
  alpha,
  alphaOptions,
  beta,
  cml,
  cmlOptions,
  minVarOptions,
  minVarWeight,
  portVol,
  rho,
  setupTwo,
  twoResult,
  twoValues,
  volOptions,
  type TwoAnswer,
} from '../../engine/games/two-assets';
import { t } from '../../i18n';
import { formatNumber } from '../../lib/format';
import { haptic, HAPTIC } from '../../lib/haptics';
import { playSound } from '../../lib/sound';
import { AskStep, PopLayer, shake, usePops } from './kit';
import './two-assets-game.css';

interface Props {
  seed: number;
  /** Al terminar y pulsar «Ver qué ha pasado»: las cifras de la partida para la explicación y los ejercicios. */
  onDone: (values: Record<string, number>) => void;
}

type Step = 'vol' | 'minVar' | 'cml' | 'alpha' | 'done';
/** Porcentajes con signo menos tipográfico: −1,2 %. */
const pct = (v: number, d?: number) =>
  `${v < 0 ? '−' : ''}${formatNumber(Math.abs(v), d ?? (Number.isInteger(v) ? 0 : 2))}\u00a0%`;
const num = (v: number) =>
  `${v < 0 ? '−' : ''}${formatNumber(Math.abs(v), Number.isInteger(v) ? 0 : 2)}`;

/** Pantalla de la mesa: etiquetas y cifras en una rejilla que se reparte sola. */
function Board({ rows }: { rows: [label: string, value: ReactNode][] }) {
  return (
    <div className="ta-board grid gap-2 rounded-[var(--radius-sm)] border p-3">
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

export function TwoAssetsGame({ seed, onDone }: Props) {
  const s = useMemo(() => setupTwo(seed), [seed]);
  const [step, setStep] = useState<Step>('vol');
  const [answer, setAnswer] = useState<Partial<TwoAnswer>>({});
  const [glow, setGlow] = useState(0);
  const box = useRef<HTMLElement>(null);
  const { pops, pop } = usePops();

  const feedback = (ok: boolean) => {
    if (ok) {
      setGlow((g) => g + 1);
      playSound('hit');
      haptic(HAPTIC.success);
      pop(t('twoAssetsGame.hit'), 'up', 50, 20);
    } else {
      playSound('miss');
      haptic(HAPTIC.failure);
      if (box.current) shake(box.current);
    }
  };
  const pick = (key: keyof TwoAnswer, value: number, ok: boolean) => {
    setAnswer((a) => ({ ...a, [key]: value }));
    feedback(ok);
  };

  if (step === 'done') {
    const full: TwoAnswer = {
      vol: answer.vol ?? 0,
      minVar: answer.minVar ?? 0,
      cml: answer.cml ?? 0,
      alpha: answer.alpha ?? 0,
    };
    const r = twoResult(s, full);
    const row = (label: string, ok: boolean) => (
      <div>
        <dt className="text-text-2 text-sm">{label}</dt>
        <dd className={`text-lg ${ok ? 'text-bull' : 'text-bear'}`}>
          {ok ? `✓ ${t('twoAssetsGame.yes')}` : `✗ ${t('twoAssetsGame.no')}`}
        </dd>
      </div>
    );
    return (
      <section
        aria-labelledby="ta-done"
        className="ta-panel grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
        data-testid="ta-done"
      >
        <h2 id="ta-done" className="text-3xl">
          {t('twoAssetsGame.doneTitle')}
        </h2>
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
          {row(t('twoAssetsGame.row.vol'), r.volHit)}
          {row(t('twoAssetsGame.row.minVar'), r.minVarHit)}
          {row(t('twoAssetsGame.row.cml'), r.cmlHit)}
          {row(t('twoAssetsGame.row.alpha'), r.alphaHit)}
        </dl>
        <p className="text-lg" data-testid="ta-verdict">
          {r.score >= 1
            ? t('twoAssetsGame.great')
            : r.score >= 0.5
              ? t('twoAssetsGame.ok')
              : t('twoAssetsGame.bad')}
        </p>
        <Button onClick={() => onDone(twoValues(s, full))}>{t('twoAssetsGame.debrief')}</Button>
      </section>
    );
  }

  return (
    <section
      ref={box}
      aria-labelledby="ta-title"
      className="ta-panel relative grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
    >
      <header className="grid gap-1">
        <h2 id="ta-title" className="text-3xl">
          {t('twoAssetsGame.title')}
        </h2>
        <p className="text-text-2 text-sm" data-testid="ta-step">
          {t(`twoAssetsGame.step.${step}`)}
        </p>
      </header>
      <PopLayer pops={pops} />

      {step === 'vol' && (
        <div className="grid gap-3">
          <p>{t('twoAssetsGame.briefVol', { w: pct(s.wA), wb: pct(100 - s.wA) })}</p>
          <Board
            rows={[
              [t('twoAssetsGame.board.sA'), pct(s.sA)],
              [t('twoAssetsGame.board.sB'), pct(s.sB)],
              [t('twoAssetsGame.board.rho'), num(rho(s))],
              [t('twoAssetsGame.board.wA'), pct(s.wA)],
            ]}
          />
          <AskStep<number>
            question={t('twoAssetsGame.askVol')}
            options={volOptions(s).map((o) => ({ value: o, label: pct(o, 2) }))}
            chosen={answer.vol}
            right={portVol(s)}
            why={t('twoAssetsGame.whyVol', { v: pct(portVol(s), 2) })}
            nextLabel={t('twoAssetsGame.next')}
            glow={glow}
            testId="ta-why"
            onPick={(v) => pick('vol', v, v === portVol(s))}
            onNext={() => setStep('minVar')}
          />
        </div>
      )}

      {step === 'minVar' && (
        <div className="grid gap-3">
          <p>{t('twoAssetsGame.briefMinVar')}</p>
          <AskStep<number>
            question={t('twoAssetsGame.askMinVar')}
            options={minVarOptions(s).map((o) => ({ value: o, label: pct(o, 1) }))}
            chosen={answer.minVar}
            right={minVarWeight(s)}
            why={t('twoAssetsGame.whyMinVar', {
              v: pct(minVarWeight(s), 1),
              vol: pct(portVol(s, minVarWeight(s) / 100), 2),
              sB: pct(s.sB),
            })}
            nextLabel={t('twoAssetsGame.next')}
            glow={glow}
            testId="ta-why"
            onPick={(v) => pick('minVar', v, v === minVarWeight(s))}
            onNext={() => setStep('cml')}
          />
        </div>
      )}

      {step === 'cml' && (
        <div className="grid gap-3">
          <p>{t('twoAssetsGame.briefCml', { target: pct(s.target) })}</p>
          <Board
            rows={[
              [t('twoAssetsGame.board.rf'), pct(s.rf)],
              [t('twoAssetsGame.board.rt'), pct(s.rt)],
              [t('twoAssetsGame.board.st'), pct(s.st)],
              [t('twoAssetsGame.board.target'), pct(s.target)],
            ]}
          />
          <AskStep<number>
            question={t('twoAssetsGame.askCml')}
            options={cmlOptions(s).map((o) => ({ value: o, label: pct(o, 2) }))}
            chosen={answer.cml}
            right={cml(s)}
            why={t('twoAssetsGame.whyCml', {
              rf: pct(s.rf),
              rt: pct(s.rt),
              st: pct(s.st),
              target: pct(s.target),
              v: pct(cml(s), 2),
            })}
            nextLabel={t('twoAssetsGame.next')}
            glow={glow}
            testId="ta-why"
            onPick={(v) => pick('cml', v, v === cml(s))}
            onNext={() => setStep('alpha')}
          />
        </div>
      )}

      {step === 'alpha' && (
        <div className="grid gap-3">
          <p>{t('twoAssetsGame.briefAlpha')}</p>
          <Board
            rows={[
              [t('twoAssetsGame.board.ri'), pct(s.ri)],
              [t('twoAssetsGame.board.rhoM'), num(s.rhoM10 / 10)],
              [t('twoAssetsGame.board.si'), pct(s.si)],
              [t('twoAssetsGame.board.sm'), pct(s.sm)],
              [t('twoAssetsGame.board.rm'), pct(s.rm)],
              [t('twoAssetsGame.board.rf'), pct(s.rf)],
            ]}
          />
          <AskStep<number>
            question={t('twoAssetsGame.askAlpha')}
            options={alphaOptions(s).map((o) => ({ value: o, label: pct(o, 2) }))}
            chosen={answer.alpha}
            right={alpha(s)}
            why={t('twoAssetsGame.whyAlpha', {
              beta: num(beta(s)),
              rhoM: num(s.rhoM10 / 10),
              si: pct(s.si),
              sm: pct(s.sm),
              v: pct(alpha(s), 2),
            })}
            nextLabel={t('twoAssetsGame.summary')}
            glow={glow}
            testId="ta-why"
            onPick={(v) => pick('alpha', v, v === alpha(s))}
            onNext={() => setStep('done')}
          />
        </div>
      )}
    </section>
  );
}
