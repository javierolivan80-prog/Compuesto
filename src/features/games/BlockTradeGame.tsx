import { useMemo, useState } from 'react';
import { Button } from '../../components/Button';
import { ProgressBar } from '../../components/ProgressBar';
import {
  act,
  bestAsk,
  blockTradeResult,
  NEWS_AFTER_ROUND,
  remaining,
  resultValues,
  ROUNDS,
  setupBlockTrade,
  startBlockTrade,
  type Action,
  type BlockTradeState,
} from '../../engine/games/block-trade';
import { t } from '../../i18n';
import { formatEur, formatNumber } from '../../lib/format';
import { haptic, HAPTIC } from '../../lib/haptics';
import { playSound } from '../../lib/sound';
import './block-trade.css';

interface Props {
  seed: number;
  /** Al terminar y pulsar «Ver qué ha pasado»: las cifras de la partida para la explicación y los ejercicios. */
  onDone: (values: Record<string, number>) => void;
}

const MAX_QTY = 220; // escala de las barras del libro

/** Precio medio con hasta 4 decimales (el mismo formato que usa la explicación de la lección). */
const formatAvg = (v: number) =>
  `${new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 4, useGrouping: 'always' }).format(v)}\u00a0€`;

function Book({ state }: { state: BlockTradeState }) {
  const asks = [...state.book.asks.slice(0, 6)].reverse();
  const bids = state.book.bids.slice(0, 3);
  return (
    <div role="table" aria-label={t('blockTrade.book')} className="bt-book grid gap-1" data-num>
      <div role="row" className="text-text-2 grid grid-cols-[1fr_auto] gap-3 text-xs">
        <span role="columnheader">{t('blockTrade.price')}</span>
        <span role="columnheader">{t('blockTrade.qtyCol')}</span>
      </div>
      {asks.map((l) => (
        <div
          role="row"
          key={`a${l.price}`}
          className="bt-level relative grid grid-cols-[1fr_auto] gap-3 px-2 py-1"
        >
          <span
            aria-hidden="true"
            className="bt-bar bt-bar-ask absolute inset-y-0 left-0 w-full"
            style={{ transform: `scaleX(${Math.min(1, l.qty / MAX_QTY)})` }}
          />
          <span role="cell" className="text-bear relative">
            {formatEur(l.price)}
          </span>
          <span role="cell" className="relative">
            {formatNumber(l.qty)}
          </span>
        </div>
      ))}
      <div role="row" className="text-text-2 border-line border-y py-1 text-center text-xs">
        <span role="cell">
          {t('blockTrade.spreadRow', {
            spread: formatEur(bestAsk(state.book) - (state.book.bids[0]?.price ?? 0)),
          })}
        </span>
      </div>
      {bids.map((l) => (
        <div
          role="row"
          key={`b${l.price}`}
          className="bt-level relative grid grid-cols-[1fr_auto] gap-3 px-2 py-1"
        >
          <span
            aria-hidden="true"
            className="bt-bar bt-bar-bid absolute inset-y-0 left-0 w-full"
            style={{ transform: `scaleX(${Math.min(1, l.qty / MAX_QTY)})` }}
          />
          <span role="cell" className="text-bull relative">
            {formatEur(l.price)}
          </span>
          <span role="cell" className="relative">
            {formatNumber(l.qty)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function BlockTradeGame({ seed, onDone }: Props) {
  const setup = useMemo(() => setupBlockTrade(seed), [seed]);
  const [state, setState] = useState(() => startBlockTrade(setup));
  const [qty, setQty] = useState('200');
  const [limit, setLimit] = useState<number>(setup.book.asks[0]!.price);
  const [message, setMessage] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const left = remaining(state);
  const n = Math.min(Number(qty) || 0, left);
  const newsOut = state.round > NEWS_AFTER_ROUND;
  const avg = state.bought ? state.cost / state.bought : 0;
  const limitOptions = [
    state.book.bids[0]?.price,
    ...state.book.asks.slice(0, 4).map((l) => l.price),
  ].filter((p): p is number => p !== undefined);

  const play = (action: Action) => {
    const before = state;
    const next = act(state, action);
    if (next === state) return;
    const filled = next.bought - before.bought;
    if (filled > 0) {
      haptic(HAPTIC.success);
      playSound('register');
    }
    const jumped = before.round <= NEWS_AFTER_ROUND && next.round > NEWS_AFTER_ROUND;
    if (jumped) {
      setShake(true);
      window.setTimeout(() => setShake(false), 180);
      playSound('miss');
    }
    setMessage(
      [
        filled > 0
          ? t('blockTrade.filled', {
              n: formatNumber(filled),
              avg: formatEur((next.cost - before.cost) / filled),
            })
          : action.type === 'wait'
            ? t('blockTrade.waited')
            : t('blockTrade.notFilled'),
        jumped && !next.done
          ? t('blockTrade.newsOut', { pct: formatNumber(setup.newsJump * 100, 1) })
          : '',
        next.forced > 0 ? t('blockTrade.forced', { n: formatNumber(next.forced) }) : '',
      ]
        .filter(Boolean)
        .join(' '),
    );
    setState(next);
    if (next.done) playSound(blockTradeResult(next).score >= 0.75 ? 'combo' : 'close');
  };

  if (state.done) {
    const r = blockTradeResult(state);
    return (
      <section
        aria-labelledby="bt-done"
        className="bt-panel grid gap-4 rounded-[var(--radius-md)] border p-4"
        data-testid="bt-done"
      >
        <h2 id="bt-done" className="text-3xl">
          {t('blockTrade.doneTitle')}
        </h2>
        <dl className="grid grid-cols-2 gap-3" data-num>
          <div>
            <dt className="text-text-2 text-sm">{t('blockTrade.avg')}</dt>
            <dd className="text-2xl" data-testid="bt-avg">
              {formatAvg(r.avg)}
            </dd>
          </div>
          <div>
            <dt className="text-text-2 text-sm">{t('blockTrade.mid')}</dt>
            <dd className="text-2xl">{formatEur(r.mid)}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-text-2 text-sm">{t('blockTrade.impact')}</dt>
            <dd className="text-bear text-2xl">{formatEur(r.impact)}</dd>
          </div>
        </dl>
        <p className="text-lg" data-testid="bt-verdict">
          {r.score >= 1
            ? t('blockTrade.great')
            : r.score >= 0.5
              ? t('blockTrade.ok')
              : t('blockTrade.bad')}
        </p>
        {message && <p className="text-text-2 text-sm">{message}</p>}
        <Button onClick={() => onDone(resultValues(r))}>{t('blockTrade.debrief')}</Button>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="bt-title"
      className={`bt-panel grid gap-4 rounded-[var(--radius-md)] border p-4 ${shake ? 'bt-shake' : ''}`}
    >
      <header className="grid gap-1">
        <h2 id="bt-title" className="text-3xl">
          {t('blockTrade.title')}
        </h2>
        <p>{t('blockTrade.brief', { n: formatNumber(setup.target) })}</p>
        <p className="text-text-2 text-sm" data-num data-testid="bt-round">
          {t('blockTrade.round', { n: state.round + 1, total: ROUNDS })} ·{' '}
          <span className={newsOut ? 'text-bear' : ''}>
            {newsOut
              ? t('blockTrade.newsDone', { pct: formatNumber(setup.newsJump * 100, 1) })
              : t('blockTrade.newsIn', { count: NEWS_AFTER_ROUND + 1 - state.round })}
          </span>
        </p>
      </header>
      <div className="grid gap-1">
        <ProgressBar value={state.bought} max={setup.target} label={t('blockTrade.progress')} />
        <p className="text-sm" data-num data-testid="bt-status">
          {t('blockTrade.status', {
            n: formatNumber(state.bought),
            total: formatNumber(setup.target),
            avg: state.bought ? formatEur(avg) : '—',
          })}
        </p>
      </div>
      <Book state={state} />
      <div className="grid gap-2">
        <label htmlFor="bt-qty" className="text-sm">
          {t('blockTrade.qty')}
        </label>
        <div className="flex flex-wrap gap-2">
          {[100, 200, 300].map((v) => (
            <Button
              key={v}
              variant={qty === String(v) ? 'primary' : 'secondary'}
              aria-pressed={qty === String(v)}
              onClick={() => setQty(String(v))}
              disabled={v > left}
            >
              {formatNumber(v)}
            </Button>
          ))}
          <Button
            variant={qty === String(left) ? 'primary' : 'secondary'}
            aria-pressed={qty === String(left)}
            onClick={() => setQty(String(left))}
          >
            {t('blockTrade.all', { n: formatNumber(left) })}
          </Button>
          <input
            id="bt-qty"
            inputMode="numeric"
            value={qty}
            onChange={(e) => setQty(e.target.value.replace(/[^\d]/g, ''))}
            className="bg-surface-2 border-line min-h-12 w-24 rounded-[var(--radius-sm)] border px-3 text-center"
            data-num
          />
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button onClick={() => play({ type: 'market', qty: n })} disabled={n < 1}>
          {t('blockTrade.market', { n: formatNumber(n) })}
        </Button>
        <div className="flex gap-2">
          <label htmlFor="bt-limit" className="sr-only">
            {t('blockTrade.limitPrice')}
          </label>
          <select
            id="bt-limit"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="bg-surface-2 border-line min-h-12 rounded-[var(--radius-sm)] border px-2"
            data-num
          >
            {limitOptions.map((p) => (
              <option key={p} value={p}>
                {formatEur(p)}
              </option>
            ))}
          </select>
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => play({ type: 'limit', qty: n, price: limit })}
            disabled={n < 1}
          >
            {t('blockTrade.limit')}
          </Button>
        </div>
        <Button variant="ghost" className="sm:col-span-2" onClick={() => play({ type: 'wait' })}>
          {t('blockTrade.wait')}
        </Button>
      </div>
      {state.resting && (
        <p className="text-text-2 text-sm" data-num>
          {t('blockTrade.resting', {
            n: formatNumber(state.resting.qty),
            price: formatEur(state.resting.price),
          })}
        </p>
      )}
      <p role="status" aria-live="polite" className="min-h-5 text-sm" data-testid="bt-message">
        {message}
      </p>
    </section>
  );
}
