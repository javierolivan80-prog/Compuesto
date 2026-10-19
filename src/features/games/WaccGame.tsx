import { useMemo, useRef, useState } from 'react';
import { Button } from '../../components/Button';
import {
  bestWeight,
  costOfDebt,
  costOfEquity,
  CURRENT,
  leveredBeta,
  setupWacc,
  TAX,
  waccAt,
  waccResult,
  waccValues,
  WEIGHTS,
} from '../../engine/games/wacc-mix';
import { t } from '../../i18n';
import { formatNumber } from '../../lib/format';
import { haptic, HAPTIC } from '../../lib/haptics';
import { playSound } from '../../lib/sound';
import { Glow, PopLayer, shake, usePops } from './kit';
import './wacc-game.css';

interface Props {
  seed: number;
  /** Al terminar y pulsar «Ver qué ha pasado»: las cifras de la partida para la explicación y los ejercicios. */
  onDone: (values: Record<string, number>) => void;
}

type Step = 'beta' | 'mix' | 'reveal' | 'done';
const pct = (v: number, d = 2) => `${formatNumber(v, d)}\u00a0%`;

/** Las curvas de ke, kd después de impuestos y WACC frente al peso de la deuda, con tu elección y el mínimo. */
function Curves({ seed, pick, best }: { seed: number; pick: number; best: number }) {
  const s = setupWacc(seed);
  const max = Math.max(...WEIGHTS.map((w) => costOfEquity(s, w)));
  const x = (w: number) => 30 + (w / 70) * 280;
  const y = (v: number) => 110 - (v / max) * 96;
  const line = (f: (w: number) => number) => WEIGHTS.map((w) => `${x(w)},${y(f(w))}`).join(' ');
  return (
    <figure className="grid gap-1">
      <svg
        viewBox="0 0 320 132"
        className="h-auto w-full"
        role="img"
        aria-label={t('waccGame.curvesAria', {
          best,
          wacc: formatNumber(waccAt(s, best), 2),
          pick,
          waccPick: formatNumber(waccAt(s, pick), 2),
        })}
      >
        <line x1="30" x2="310" y1="110" y2="110" stroke="var(--line)" />
        <polyline
          points={line((w) => costOfEquity(s, w))}
          fill="none"
          stroke="var(--bear)"
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />
        <polyline
          points={line((w) => costOfDebt(s, w) * (1 - TAX))}
          fill="none"
          stroke="var(--info)"
          strokeWidth="1.5"
          strokeDasharray="1 3"
        />
        <polyline
          points={line((w) => waccAt(s, w))}
          fill="none"
          stroke="var(--brand)"
          strokeWidth="2.5"
        />
        <circle cx={x(best)} cy={y(waccAt(s, best))} r="5" fill="var(--accent)" />
        <circle
          cx={x(pick)}
          cy={y(waccAt(s, pick))}
          r="4"
          fill="none"
          stroke="var(--text)"
          strokeWidth="1.5"
        />
        {[0, 35, 70].map((w) => (
          <text key={w} x={x(w)} y="126" textAnchor="middle" fill="var(--text-2)" fontSize="10">
            {`${w} %`}
          </text>
        ))}
      </svg>
      <figcaption className="text-text-2 text-sm">{t('waccGame.legend')}</figcaption>
    </figure>
  );
}

export function WaccGame({ seed, onDone }: Props) {
  const s = useMemo(() => setupWacc(seed), [seed]);
  const [step, setStep] = useState<Step>('beta');
  const [betaPick, setBetaPick] = useState<number | null>(null);
  const [w, setW] = useState(CURRENT);
  const [glow, setGlow] = useState(0);
  const box = useRef<HTMLElement>(null);
  const { pops, pop } = usePops();
  const betaL = leveredBeta(s, CURRENT);
  // la buena, la desapalancada (olvidar apalancar) y la apalancada sin el escudo fiscal
  const betaOptions = useMemo(
    () =>
      [betaL, s.betaU, Math.round(s.betaU * (1 + CURRENT / (100 - CURRENT)) * 10000) / 10000].sort(
        (a, b) => a - b,
      ),
    [betaL, s.betaU],
  );
  const best = bestWeight(s);
  const r = waccResult(s, betaPick === betaL, w);

  const feedback = (ok: boolean) => {
    if (ok) {
      setGlow((g) => g + 1);
      playSound('hit');
      haptic(HAPTIC.success);
      pop(t('waccGame.hit'), 'up', 50, 20);
    } else {
      playSound('miss');
      haptic(HAPTIC.failure);
      if (box.current) shake(box.current);
    }
  };

  if (step === 'done')
    return (
      <section
        aria-labelledby="wg-done"
        className="wg-panel grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
        data-testid="wg-done"
      >
        <h2 id="wg-done" className="text-3xl">
          {t('waccGame.doneTitle')}
        </h2>
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
          <div>
            <dt className="text-text-2 text-sm">{t('waccGame.today', { w: CURRENT })}</dt>
            <dd className="text-xl" data-num>
              {pct(waccAt(s, CURRENT))}
            </dd>
          </div>
          <div>
            <dt className="text-text-2 text-sm">{t('waccGame.yours', { w })}</dt>
            <dd className="text-xl" data-num data-testid="wg-pick">
              {pct(waccAt(s, w))}
            </dd>
          </div>
          <div>
            <dt className="text-text-2 text-sm">{t('waccGame.min', { w: best })}</dt>
            <dd className="text-xl" data-num>
              {pct(waccAt(s, best))}
            </dd>
          </div>
        </dl>
        <p className="text-lg" data-testid="wg-verdict">
          {r.score >= 0.95
            ? t('waccGame.great')
            : r.score >= 0.6
              ? t('waccGame.ok')
              : t('waccGame.bad')}
        </p>
        <Button onClick={() => onDone(waccValues(s, r))}>{t('waccGame.debrief')}</Button>
      </section>
    );

  return (
    <section
      ref={box}
      aria-labelledby="wg-title"
      className="wg-panel relative grid grid-cols-[minmax(0,1fr)] gap-4 rounded-[var(--radius-md)] border p-4"
    >
      <header className="grid gap-1">
        <h2 id="wg-title" className="text-3xl">
          {t('waccGame.title')}
        </h2>
        <p className="text-text-2 text-sm" data-testid="wg-step">
          {t(`waccGame.step.${step}`)}
        </p>
      </header>
      <PopLayer pops={pops} />

      {step === 'beta' && (
        <div className="grid gap-3">
          <p>
            {t('waccGame.brief', {
              w: CURRENT,
              rf: pct(s.rf),
              erp: pct(s.erp),
              size: pct(s.size, 0),
              betaU: formatNumber(s.betaU, 2),
              kd: pct(s.kd0),
            })}
          </p>
          <p className="font-medium">{t('waccGame.askBeta', { w: CURRENT })}</p>
          {betaPick === null ? (
            <div
              role="radiogroup"
              aria-label={t('waccGame.askBeta', { w: CURRENT })}
              className="grid gap-2"
            >
              {betaOptions.map((b) => (
                <Button
                  key={b}
                  role="radio"
                  aria-checked={false}
                  variant="secondary"
                  onClick={() => {
                    setBetaPick(b);
                    feedback(b === betaL);
                  }}
                >
                  {formatNumber(b, 2)}
                </Button>
              ))}
            </div>
          ) : (
            <Glow pulse={glow} className="rounded-[var(--radius-md)]">
              <div className="grid gap-2 p-1">
                <p role="status" className={betaPick === betaL ? 'text-bull' : 'text-bear'}>
                  {betaPick === betaL ? '✓ ' : '✗ '}
                  {t('waccGame.betaWhy', {
                    betaU: formatNumber(s.betaU, 2),
                    de: formatNumber(CURRENT / (100 - CURRENT), 2),
                    betaL: formatNumber(betaL, 2),
                    ke: pct(costOfEquity(s, CURRENT)),
                  })}
                </p>
                <Button onClick={() => setStep('mix')}>{t('waccGame.next')}</Button>
              </div>
            </Glow>
          )}
        </div>
      )}

      {(step === 'mix' || step === 'reveal') && (
        <div className="grid gap-3">
          {step === 'mix' && <p>{t('waccGame.mixIntro')}</p>}
          <label htmlFor="wg-w" className="font-medium">
            {t('waccGame.weight', { w })}
          </label>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              aria-label={t('waccGame.less')}
              data-repeat
              disabled={step !== 'mix' || w <= 0}
              onClick={() => setW((v) => Math.max(0, v - 5))}
            >
              −
            </Button>
            <input
              id="wg-w"
              type="range"
              min={0}
              max={70}
              step={5}
              value={w}
              disabled={step !== 'mix'}
              onChange={(e) => setW(Number(e.target.value))}
              aria-valuetext={t('waccGame.weight', { w })}
              className="wg-range min-h-12 min-w-0 flex-1"
            />
            <Button
              variant="secondary"
              aria-label={t('waccGame.more')}
              data-repeat
              disabled={step !== 'mix' || w >= 70}
              onClick={() => setW((v) => Math.min(70, v + 5))}
            >
              +
            </Button>
          </div>
          <dl
            className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,8rem),1fr))] gap-2"
            data-num
          >
            <div>
              <dt className="text-text-2 text-sm">{t('waccGame.beta')}</dt>
              <dd className="text-lg">{formatNumber(leveredBeta(s, w), 2)}</dd>
            </div>
            <div>
              <dt className="text-text-2 text-sm">{t('waccGame.ke')}</dt>
              <dd className="text-lg">{pct(costOfEquity(s, w))}</dd>
            </div>
            <div>
              <dt className="text-text-2 text-sm">{t('waccGame.kd')}</dt>
              <dd className="text-lg">{pct(costOfDebt(s, w) * (1 - TAX))}</dd>
            </div>
            <div>
              <dt className="text-text-2 text-sm">{t('waccGame.wacc')}</dt>
              <dd className="text-2xl" data-testid="wg-wacc">
                {pct(waccAt(s, w))}
              </dd>
            </div>
          </dl>
          {step === 'mix' ? (
            <Button
              onClick={() => {
                setStep('reveal');
                feedback(r.gap < 0.02);
              }}
            >
              {t('waccGame.propose', { w })}
            </Button>
          ) : (
            <Glow pulse={glow} className="rounded-[var(--radius-md)]">
              <div className="grid gap-3 p-1">
                <Curves seed={seed} pick={w} best={best} />
                <p
                  role="status"
                  className={r.gap < 0.02 ? 'text-bull' : 'text-text'}
                  data-testid="wg-reveal"
                >
                  {r.gap < 0.02
                    ? `✓ ${t('waccGame.atMin', { w, wacc: pct(waccAt(s, w)) })}`
                    : t('waccGame.offMin', {
                        w,
                        best,
                        wacc: pct(waccAt(s, best)),
                        gap: formatNumber(r.gap, 2),
                      })}
                </p>
                <p className="text-text-2 text-sm">{t('waccGame.why')}</p>
                <Button onClick={() => setStep('done')}>{t('waccGame.summary')}</Button>
              </div>
            </Glow>
          )}
        </div>
      )}
    </section>
  );
}
