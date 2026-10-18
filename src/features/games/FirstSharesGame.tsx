import { useMemo, useRef, useState } from 'react';
import { AnimatedNumber } from '../../components/AnimatedNumber';
import { Button } from '../../components/Button';
import {
  firstSharesResult,
  firstSharesValues,
  guess,
  isHit,
  pricePath,
  setupFirstShares,
  SHARES,
  STAKE,
  startFirstShares,
  type Move,
} from '../../engine/games/first-shares';
import { t } from '../../i18n';
import { formatEur, formatNumber } from '../../lib/format';
import { haptic, HAPTIC } from '../../lib/haptics';
import { playSound } from '../../lib/sound';
import { CandleReveal } from './CandleReveal';
import { Glow, PopLayer, shake, usePops } from './kit';
import './first-shares.css';

interface Props {
  seed: number;
  /** Al terminar y pulsar «Ver qué ha pasado»: las cifras de la partida para la explicación y los ejercicios. */
  onDone: (values: Record<string, number>) => void;
}

const MOVES: { move: Move; arrow: string }[] = [
  { move: 'up', arrow: '▲' },
  { move: 'down', arrow: '▼' },
  { move: 'flat', arrow: '＝' },
];

const signedPct = (v: number) =>
  `${v > 0 ? '+' : v < 0 ? '−' : ''}${formatNumber(Math.abs(v), 1)} %`;

/** Línea del precio hasta ahora (SVG): cada punto nuevo entra con un fundido. */
function PriceLine({ prices, total }: { prices: number[]; total: number }) {
  const W = 300;
  const H = 72;
  const lo = Math.min(...prices) * 0.995;
  const hi = Math.max(...prices) * 1.005;
  const x = (i: number) => (i / (total - 1)) * (W - 8) + 4;
  const y = (v: number) => H - 6 - ((v - lo) / Math.max(hi - lo, 0.01)) * (H - 12);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="fs-line h-[72px] w-full" aria-hidden="true">
      <line x1={0} x2={W} y1={y(prices[0]!)} y2={y(prices[0]!)} className="fs-base" />
      <polyline points={prices.map((p, i) => `${x(i)},${y(p)}`).join(' ')} className="fs-path" />
      {prices.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p)} r={3.5} className="fs-dot" />
      ))}
    </svg>
  );
}

export function FirstSharesGame({ seed, onDone }: Props) {
  const setup = useMemo(() => setupFirstShares(seed), [seed]);
  const path = useMemo(() => pricePath(setup), [setup]);
  const [state, setState] = useState(() => startFirstShares(setup));
  const [revealed, setRevealed] = useState(false);
  const [formed, setFormed] = useState(false);
  const [glow, setGlow] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const { pops, pop } = usePops();

  const index = state.guesses.length - (revealed ? 1 : 0);
  // la vela de cada noticia es un objeto estable: CandleReveal vuelve a animar si cambia
  const candles = useMemo(
    () =>
      setup.rounds.map((_, i) => {
        const open = path[i]!;
        const close = path[i + 1]!;
        return {
          open,
          close,
          high: Math.max(open, close) * 1.004,
          low: Math.min(open, close) * 0.996,
        };
      }),
    [setup, path],
  );
  const judged = useRef(-1);
  const round = setup.rounds[index]!;
  // el precio solo cambia cuando se ve la vela de la noticia
  const shownPrices = path.slice(0, index + 1 + (revealed && formed ? 1 : 0));
  const price = shownPrices.at(-1)!;
  const last = index === setup.rounds.length - 1;

  const choose = (g: Move) => {
    const next = guess(state, g);
    setState(next);
    setRevealed(true);
    setFormed(false);
  };

  const onFormed = () => {
    setFormed(true);
    if (judged.current === index) return; // el premio o el fallo, una sola vez por noticia
    judged.current = index;
    const g = state.guesses[index]!;
    if (isHit(round, g)) {
      setGlow((n) => n + 1);
      playSound('hit');
      haptic(HAPTIC.success);
      pop(t('firstShares.hit'), 'up', 50, 20);
    } else {
      playSound('miss');
      haptic(HAPTIC.failure);
      if (box.current) shake(box.current);
    }
  };

  const nextRound = () => {
    setRevealed(false);
    setFormed(false);
  };

  if (state.done && !revealed) {
    const r = firstSharesResult(state);
    return (
      <section
        aria-labelledby="fs-done"
        className="fs-panel grid gap-4 rounded-[var(--radius-md)] border p-4"
        data-testid="fs-done"
      >
        <h2 id="fs-done" className="text-3xl">
          {t('firstShares.doneTitle')}
        </h2>
        <dl
          className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3"
          data-num
        >
          <div>
            <dt className="text-text-2 text-sm">{t('firstShares.priceRange')}</dt>
            <dd className="text-xl">
              {formatEur(r.start)} → {formatEur(r.end)}
            </dd>
          </div>
          <div>
            <dt className="text-text-2 text-sm">{t('firstShares.change')}</dt>
            <dd className={`text-xl ${r.pct >= 0 ? 'text-bull' : 'text-bear'}`}>
              {r.pct >= 0 ? '▲' : '▼'} {signedPct(r.pct)}
            </dd>
          </div>
          <div className="col-span-full">
            <dt className="text-text-2 text-sm">{t('firstShares.cap')}</dt>
            <dd className="text-xl">
              {formatEur(r.capStart, 0)} → {formatEur(r.capEnd, 0)}
            </dd>
          </div>
          <div className="col-span-full">
            <dt className="text-text-2 text-sm">
              {t('firstShares.yours', { n: formatNumber(STAKE) })}
            </dt>
            <dd className="text-xl" data-testid="fs-stake">
              {formatEur(r.stakeStart)} → {formatEur(r.stakeEnd)}
            </dd>
          </div>
        </dl>
        <p className="text-lg" data-testid="fs-verdict">
          {t('firstShares.score', { n: r.hits, total: setup.rounds.length })}{' '}
          {r.score >= 1
            ? t('firstShares.great')
            : r.score >= 0.5
              ? t('firstShares.ok')
              : t('firstShares.bad')}
        </p>
        <Button onClick={() => onDone(firstSharesValues(r))}>{t('firstShares.debrief')}</Button>
      </section>
    );
  }

  const g = revealed ? state.guesses[index]! : null;

  return (
    <section
      ref={box}
      aria-labelledby="fs-title"
      className="fs-panel relative grid gap-4 rounded-[var(--radius-md)] border p-4"
    >
      <header className="grid gap-1">
        <h2 id="fs-title" className="text-3xl">
          {t('firstShares.title')}
        </h2>
        {index === 0 && !revealed && (
          <p>{t('firstShares.brief', { n: formatNumber(STAKE), shares: formatNumber(SHARES) })}</p>
        )}
        <p className="text-text-2 text-sm" data-num data-testid="fs-round">
          {t('firstShares.round', { n: index + 1, total: setup.rounds.length })}
        </p>
      </header>

      <div className="grid gap-2">
        <dl
          className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,8.5rem),1fr))] gap-x-3 gap-y-2"
          data-num
        >
          <div className="min-w-0">
            <dt className="text-text-2 text-xs">{t('firstShares.price')}</dt>
            <dd className="text-lg" data-testid="fs-price">
              <AnimatedNumber value={price} format={(v) => formatEur(v)} />
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-text-2 text-xs">{t('firstShares.capShort')}</dt>
            <dd className="text-lg">
              <AnimatedNumber
                value={price * SHARES}
                format={(v) => `${formatNumber(v / 1e6, 1)}\u00a0M€`}
              />
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-text-2 text-xs">
              {t('firstShares.yoursShort', { n: formatNumber(STAKE) })}
            </dt>
            <dd className="text-lg">
              <AnimatedNumber value={price * STAKE} format={(v) => formatEur(v)} />
            </dd>
          </div>
        </dl>
        <PriceLine prices={shownPrices} total={setup.rounds.length + 1} />
        <p className="sr-only">
          {t('firstShares.lineAlt', {
            from: formatEur(path[0]!),
            to: formatEur(price),
          })}
        </p>
      </div>

      <Glow pulse={glow} className="rounded-[var(--radius-md)]">
        <article className="border-line bg-surface-2 grid gap-1 rounded-[var(--radius-md)] border-y-2 p-4">
          <p className="text-text-2 text-xs tracking-widest uppercase">{t('firstShares.paper')}</p>
          <h3 className="text-2xl leading-tight" data-testid="fs-headline">
            {t(`firstShares.news.${round.news.id}.headline`)}
          </h3>
        </article>
      </Glow>
      <PopLayer pops={pops} />

      {!revealed && (
        <div className="grid gap-2 sm:grid-cols-3" role="group" aria-label={t('firstShares.ask')}>
          {MOVES.map((m) => (
            <Button key={m.move} variant="secondary" onClick={() => choose(m.move)}>
              {m.arrow} {t(`firstShares.move.${m.move}`)}
            </Button>
          ))}
        </div>
      )}

      {revealed && (
        <section aria-label={t('firstShares.result')} className="grid gap-3">
          <div className="justify-self-center">
            <CandleReveal key={index} candle={candles[index]!} onDone={onFormed} />
          </div>
          <p className="text-center text-xl" data-num data-testid="fs-move">
            {round.pct > 0 ? '▲' : round.pct < 0 ? '▼' : '＝'} {signedPct(round.pct)}
          </p>
          <div hidden={!formed} className="grid gap-2">
            <p role="status" className={g && isHit(round, g) ? 'text-bull' : 'text-text'}>
              {g && isHit(round, g) ? '✓' : '✗'}{' '}
              {t('firstShares.verdict', { move: t(`firstShares.move.${round.news.move}`) })}
            </p>
            <p className="text-text-2">{t(`firstShares.news.${round.news.id}.why`)}</p>
            <Button onClick={nextRound}>
              {last ? t('firstShares.finish') : t('firstShares.next')}
            </Button>
          </div>
        </section>
      )}
    </section>
  );
}
