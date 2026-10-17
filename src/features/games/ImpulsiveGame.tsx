import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../../components/Button';
import {
  COST_RATE,
  IMPULSIVE_STEPS,
  START_VALUE,
  impulsiveMarket,
  simulate,
} from '../../engine/games/impulsive';
import { t } from '../../i18n';
import { formatNumber } from '../../lib/format';
import { haptic, HAPTIC } from '../../lib/haptics';
import { playSound } from '../../lib/sound';
import { Deadline, HandPointer, PopLayer, shake, usePops } from './kit';

interface Props {
  seed: number;
  untimed: boolean;
  tutorial: boolean;
  onFinish: (decisions: boolean[]) => void;
}

const eur = (n: number) => `${formatNumber(Math.round(n))} €`;
const THINK_MS = 7000;
const W = 320;
const H = 150;

function Curves({ mine, twin }: { mine: number[]; twin: number[] }) {
  const all = [...mine, ...twin];
  const lo = Math.min(...all) * 0.98;
  const hi = Math.max(...all) * 1.02;
  const x = (i: number) => 8 + (i / IMPULSIVE_STEPS) * (W - 16);
  const y = (v: number) => H - 8 - ((v - lo) / (hi - lo || 1)) * (H - 16);
  const line = (a: number[]) => a.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={t('games.impulsive.chart', { mine: eur(mine.at(-1)!), twin: eur(twin.at(-1)!) })}
      className="bg-surface-1 border-line w-full rounded-[var(--radius-md)] border"
    >
      <polyline
        points={line(twin)}
        fill="none"
        stroke="var(--text-2)"
        strokeWidth="1.5"
        strokeDasharray="4 3"
      />
      <polyline
        points={line(mine)}
        fill="none"
        stroke="var(--brand)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** El trader impulsivo: 30 días, noticias tentadoras y un botón de operar que cuesta; tu curva frente a la de tu gemelo paciente. */
export function ImpulsiveGame({ seed, untimed, tutorial, onFinish }: Props) {
  const market = useMemo(() => impulsiveMarket(seed), [seed]);
  const [decisions, setDecisions] = useState<boolean[]>([]);
  const box = useRef<HTMLDivElement>(null);
  const { pops, pop } = usePops();
  const step = decisions.length;
  const shown = useMemo(() => {
    // curvas hasta el paso actual
    const full = simulate(market, [
      ...decisions,
      ...Array.from({ length: IMPULSIVE_STEPS - step }, () => false),
    ]);
    return { mine: full.mine.slice(0, step + 1), twin: full.twin.slice(0, step + 1), full };
  }, [market, decisions, step]);
  const news = market.news[Math.min(step, IMPULSIVE_STEPS - 1)]!;
  const invested = shown.full.invested[step]!;
  const costs = shown.full.costs;

  const decide = (operate: boolean) => {
    if (step >= IMPULSIVE_STEPS) return;
    const next = [...decisions, operate];
    if (operate) {
      const value = shown.full.mine[step]!;
      pop(`−${eur(value * COST_RATE)}`, 'down', 50, 20);
      playSound('miss');
      haptic(HAPTIC.failure);
      if (box.current) shake(box.current, 4);
    }
    setDecisions(next);
    if (next.length >= IMPULSIVE_STEPS) onFinish(next);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'm') decide(false);
      else if (e.key.toLowerCase() === 'o') decide(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (step >= IMPULSIVE_STEPS) return null;
  const hint = tutorial && step === 0;
  return (
    <div ref={box} className="relative grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <p data-num className="text-text-2 text-sm">
          {t('games.impulsive.day', { n: step + 1, total: IMPULSIVE_STEPS })}
        </p>
        <p data-num className="text-sm" data-testid="impulsive-ops">
          {t('games.impulsive.ops', { n: shown.full.operations })}
        </p>
      </div>
      <Curves mine={shown.mine} twin={shown.twin} />
      <ul className="text-text-2 flex flex-wrap gap-x-4 text-xs" aria-hidden="true">
        <li>
          <span className="text-brand">━</span> {t('games.impulsive.you')}
        </li>
        <li>┅ {t('games.impulsive.twin')}</li>
      </ul>
      <dl className="grid grid-cols-3 gap-2 text-center text-sm" data-num>
        <div>
          <dt className="text-text-2">{t('games.impulsive.you')}</dt>
          <dd data-testid="impulsive-mine">{eur(shown.mine.at(-1)!)}</dd>
        </div>
        <div>
          <dt className="text-text-2">{t('games.impulsive.twin')}</dt>
          <dd>{eur(shown.twin.at(-1)!)}</dd>
        </div>
        <div>
          <dt className="text-text-2">{t('games.impulsive.costs')}</dt>
          <dd className={costs > 0 ? 'text-bear' : ''}>{costs > 0 ? `−${eur(costs)}` : eur(0)}</dd>
        </div>
      </dl>
      <div
        className="bg-surface-2 h-2 overflow-hidden rounded-full"
        role="img"
        aria-label={t('games.impulsive.costBar', { pct: Math.round((costs / START_VALUE) * 100) })}
      >
        <div
          className="bg-bear h-full origin-left"
          style={{ transform: `scaleX(${Math.min(1, costs / START_VALUE / 0.1)})` }}
        />
      </div>
      <PopLayer pops={pops} />
      <article
        className={`rounded-[var(--radius-md)] border-2 p-4 text-lg ${news.kind === 'hype' ? 'border-bull' : 'border-bear'}`}
        aria-live="polite"
        data-testid="impulsive-news"
      >
        <p className="text-text-2 mb-1 text-xs">
          {news.kind === 'hype' ? '▲ ' : '▼ '}
          {t('games.impulsive.news')}
        </p>
        {news.text}
      </article>
      <Deadline ms={THINK_MS} resetKey={step} active={!untimed} onExpire={() => decide(false)} />
      {hint && <p className="text-text-2 text-sm">{t('games.impulsive.tutorial')}</p>}
      <div className="grid gap-2">
        <div className="relative">
          <Button className="w-full" onClick={() => decide(false)}>
            {t('games.impulsive.hold')}
          </Button>
          {hint && <HandPointer className="-bottom-6 right-4" />}
        </div>
        <Button variant="secondary" className="w-full" onClick={() => decide(true)}>
          {t(invested ? 'games.impulsive.sell' : 'games.impulsive.buy')}
        </Button>
      </div>
    </div>
  );
}
