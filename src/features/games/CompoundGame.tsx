import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AnimatedNumber } from '../../components/AnimatedNumber';
import { Button } from '../../components/Button';
import {
  COMPOUND_ROUNDS,
  compoundRounds,
  growth,
  leaks,
  roundScore,
  type CompoundChoice,
  type CompoundRound,
} from '../../engine/games/compound';
import { t } from '../../i18n';
import { formatNumber } from '../../lib/format';
import { haptic, HAPTIC } from '../../lib/haptics';
import { playSound } from '../../lib/sound';
import { usePrefersReducedMotion } from '../../lib/reduced-motion';
import { HandPointer, ParticleCanvas, PopLayer, usePops, type ParticleHandle } from './kit';

interface Props {
  seed: number;
  tutorial: boolean;
  onFinish: (choices: CompoundChoice[]) => void;
}

const eur = (n: number) => `${formatNumber(Math.round(n))} €`;
const W = 320;
const H = 170;

/** Curva del interés compuesto (dorada) frente a lo aportado y al valor sin comisiones. Se dibuja de izquierda a derecha. */
function GrowthChart({
  round,
  choice,
  replay,
}: {
  round: CompoundRound;
  choice: CompoundChoice;
  replay: number;
}) {
  const clipId = useId();
  const reveal = useRef<SVGRectElement>(null);
  const reduced = usePrefersReducedMotion();
  const pts = growth({ ...round, ...choice });
  const max = Math.max(...pts.map((p) => p.gross), round.target) * 1.05;
  const x = (yr: number) => 8 + (yr / choice.years) * (W - 16);
  const y = (v: number) => H - 10 - (v / max) * (H - 20);
  const line = (key: 'contributed' | 'gross' | 'real') =>
    pts.map((p) => `${x(p.year)},${y(p[key])}`).join(' ');
  useEffect(() => {
    const el = reveal.current;
    if (replay === 0 || reduced || !el || typeof el.animate !== 'function') return;
    const a = el.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
      duration: 900,
      easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
      fill: 'both',
    });
    return () => a.cancel();
  }, [replay, reduced]);
  const last = pts.at(-1)!;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={t('games.compound.chart', {
        years: choice.years,
        real: eur(last.real),
        contributed: eur(last.contributed),
      })}
      className="bg-surface-1 border-line w-full rounded-[var(--radius-md)] border"
    >
      <defs>
        <clipPath id={clipId}>
          <rect
            ref={reveal}
            x="0"
            y="0"
            width={W}
            height={H}
            style={{ transformBox: 'fill-box', transformOrigin: 'left center' }}
          />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <line
          x1="8"
          x2={W - 8}
          y1={y(round.target)}
          y2={y(round.target)}
          stroke="var(--info)"
          strokeDasharray="4 3"
        />
        <polyline
          points={line('contributed')}
          fill="none"
          stroke="var(--text-2)"
          strokeWidth="1.5"
          strokeDasharray="2 3"
        />
        <polyline points={line('gross')} fill="none" stroke="var(--text-2)" strokeWidth="1.5" />
        <polyline
          points={line('real')}
          fill="none"
          stroke="var(--brand)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

/** La magia del compuesto: elige aportación y años para llegar al objetivo en euros de hoy, tras comisiones e inflación. */
export function CompoundGame({ seed, tutorial, onFinish }: Props) {
  const rounds = useMemo(() => compoundRounds(seed), [seed]);
  const [index, setIndex] = useState(0);
  const round = rounds[index]!;
  const [monthly, setMonthly] = useState(round.monthlyMin + 8 * round.monthlyStep);
  const [years, setYears] = useState(Math.round((round.yearsMin + round.yearsMax) / 2));
  const [fixed, setFixed] = useState(false);
  const [replay, setReplay] = useState(0);
  const choices = useRef<CompoundChoice[]>([]);
  const particles = useRef<ParticleHandle>(null);
  const { pops, pop } = usePops();
  const idM = useId();
  const idY = useId();
  const choice = { monthly, years };
  const f = growth({ ...round, ...choice }).at(-1)!;
  const l = leaks({ ...round, ...choice });
  const s = roundScore(f.real, round.target);

  const fix = () => {
    choices.current[index] = choice;
    setFixed(true);
    setReplay((n) => n + 1);
    pop(`−${eur(l.fees)} ${t('games.compound.fees')}`, 'down', 25, 25);
    window.setTimeout(
      () => pop(`−${eur(l.inflation)} ${t('games.compound.inflation')}`, 'down', 25, 45),
      250,
    );
    if (s >= 0.8) {
      playSound('lift');
      haptic(HAPTIC.success);
      particles.current?.burst(160, 60, index + 1);
    } else {
      playSound('miss');
      haptic(HAPTIC.failure);
    }
  };
  const next = () => {
    if (index + 1 >= COMPOUND_ROUNDS) return onFinish(choices.current);
    const r = rounds[index + 1]!;
    setIndex(index + 1);
    setMonthly(r.monthlyMin + 8 * r.monthlyStep);
    setYears(Math.round((r.yearsMin + r.yearsMax) / 2));
    setFixed(false);
  };

  return (
    <div className="relative grid gap-4">
      <p data-num className="text-text-2 text-sm">
        {t('games.compound.round', { n: index + 1, total: COMPOUND_ROUNDS })}
      </p>
      <div className="bg-surface-2 border-line grid gap-1 rounded-[var(--radius-md)] border p-4">
        <p className="text-lg">
          {t('games.compound.goal')}{' '}
          <strong data-num data-testid="target">
            {eur(round.target)}
          </strong>
        </p>
        <p className="text-text-2 text-sm" data-num>
          {t('games.compound.assumptions', {
            r: round.returnPct,
            f: round.feePct,
            i: round.inflationPct,
          })}
        </p>
      </div>
      {tutorial && index === 0 && !fixed && (
        <p className="text-text-2 text-sm">{t('games.compound.tutorial')}</p>
      )}
      <div className="relative">
        <GrowthChart round={round} choice={choice} replay={replay} />
        <PopLayer pops={pops} />
        <ParticleCanvas ref={particles} />
      </div>
      <div className="grid gap-3">
        <label htmlFor={idM} className="grid gap-1">
          <span className="flex justify-between text-sm">
            <span>{t('games.compound.monthly')}</span>
            <span data-num>{eur(monthly)}</span>
          </span>
          <input
            id={idM}
            type="range"
            min={round.monthlyMin}
            max={round.monthlyMax}
            step={round.monthlyStep}
            value={monthly}
            disabled={fixed}
            onChange={(e) => setMonthly(Number(e.target.value))}
            className="accent-brand min-h-12 w-full"
            aria-valuetext={eur(monthly)}
          />
        </label>
        <label htmlFor={idY} className="grid gap-1">
          <span className="flex justify-between text-sm">
            <span>{t('games.compound.years')}</span>
            <span data-num>{t('games.compound.yearsValue', { n: years })}</span>
          </span>
          <input
            id={idY}
            type="range"
            min={round.yearsMin}
            max={round.yearsMax}
            step={1}
            value={years}
            disabled={fixed}
            onChange={(e) => setYears(Number(e.target.value))}
            className="accent-brand min-h-12 w-full"
            aria-valuetext={t('games.compound.yearsValue', { n: years })}
          />
        </label>
      </div>
      <p className="text-center text-2xl" data-testid="real-value">
        <AnimatedNumber value={Math.round(f.real)} format={(n) => eur(n)} />
        <span className="text-text-2 block text-sm">{t('games.compound.realToday')}</span>
      </p>
      {!fixed ? (
        <div className="relative">
          <Button className="w-full" onClick={fix}>
            {t('games.compound.fix')}
          </Button>
          {tutorial && index === 0 && <HandPointer className="-top-4 right-6" />}
        </div>
      ) : (
        <section aria-label={t('games.compound.result')} className="grid gap-2">
          <p
            role="status"
            data-testid="round-result"
            className={s >= 0.8 ? 'text-bull' : 'text-text'}
          >
            {s >= 0.8 ? '✓ ' : '✗ '}
            {t('games.compound.resultText', {
              value: eur(f.real),
              target: eur(round.target),
              score: Math.round(s * 100),
            })}
          </p>
          <ul className="text-text-2 text-sm" data-num>
            <li>
              {t('games.compound.feesLine')}: −{eur(l.fees)}
            </li>
            <li>
              {t('games.compound.inflationLine')}: −{eur(l.inflation)}
            </li>
          </ul>
          <Button onClick={next}>
            {index + 1 >= COMPOUND_ROUNDS ? t('games.compound.finish') : t('games.compound.next')}
          </Button>
        </section>
      )}
    </div>
  );
}
