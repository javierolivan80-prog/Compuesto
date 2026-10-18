import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../../components/Button';
import {
  auctionResult,
  auctionValues,
  equilibrium,
  finalOrders,
  limitChoices,
  myFill,
  ordersAt830,
  setupAuction,
  TARGET,
  TICK,
  withMine,
  type AuctionOrder,
  type MyOrder,
} from '../../engine/games/opening-auction';
import { t } from '../../i18n';
import { usePrefersReducedMotion } from '../../lib/reduced-motion';
import { formatEur, formatNumber } from '../../lib/format';
import { haptic, HAPTIC } from '../../lib/haptics';
import { playSound } from '../../lib/sound';
import './auction.css';

interface Props {
  seed: number;
  /** Al terminar y pulsar «Ver qué ha pasado»: las cifras de la partida para la explicación y los ejercicios. */
  onDone: (values: Record<string, number>) => void;
}

type Phase = 'p830' | 'p859' | 'closing' | 'done';

const r2 = (x: number) => Math.round(x * 100) / 100;
const CLOSING_MS = 1400;

/** Tabla de la subasta: a cada precio, cuánto se compraría, cuánto se vendería y cuánto se casaría. */
function AuctionTable({ orders, refPrice }: { orders: AuctionOrder[]; refPrice: number }) {
  const eq = equilibrium(orders, refPrice);
  const rows = Array.from({ length: 9 }, (_, i) => r2(eq.price + (4 - i) * TICK));
  const demand = (p: number) =>
    orders
      .filter((o) => o.side === 'buy' && (o.limit === null || o.limit >= p - 1e-9))
      .reduce((s, o) => s + o.qty, 0);
  const supply = (p: number) =>
    orders
      .filter((o) => o.side === 'sell' && (o.limit === null || o.limit <= p + 1e-9))
      .reduce((s, o) => s + o.qty, 0);
  const max = Math.max(...rows.map((p) => Math.max(demand(p), supply(p))), 1);
  return (
    <div role="table" aria-label={t('auction.table')} className="oa-table grid gap-1" data-num>
      <div role="row" className="text-text-2 grid grid-cols-[5.5rem_1fr_1fr_3.5rem] gap-2 text-xs">
        <span role="columnheader">{t('auction.price')}</span>
        <span role="columnheader">{t('auction.buyCol')}</span>
        <span role="columnheader">{t('auction.sellCol')}</span>
        <span role="columnheader" className="text-right">
          {t('auction.matchCol')}
        </span>
      </div>
      {rows.map((p) => {
        const d = demand(p);
        const s = supply(p);
        const isEq = Math.abs(p - eq.price) < 1e-9;
        return (
          <div
            role="row"
            key={p}
            aria-current={isEq ? 'true' : undefined}
            className={`oa-row grid grid-cols-[5.5rem_1fr_1fr_3.5rem] items-center gap-2 px-1 py-0.5 ${isEq ? 'oa-eq' : ''}`}
          >
            <span role="cell">
              {isEq && <span aria-hidden="true">▶ </span>}
              {formatEur(p)}
            </span>
            <span role="cell" className="relative">
              <span
                aria-hidden="true"
                className="oa-bar oa-bar-buy absolute inset-y-0 left-0 w-full"
                style={{ transform: `scaleX(${d / max})` }}
              />
              <span className="relative">{formatNumber(d)}</span>
            </span>
            <span role="cell" className="relative">
              <span
                aria-hidden="true"
                className="oa-bar oa-bar-sell absolute inset-y-0 left-0 w-full"
                style={{ transform: `scaleX(${s / max})` }}
              />
              <span className="relative">{formatNumber(s)}</span>
            </span>
            <span role="cell" className="text-right">
              {formatNumber(Math.min(d, s))}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function AuctionGame({ seed, onDone }: Props) {
  const setup = useMemo(() => setupAuction(seed), [seed]);
  const reduced = usePrefersReducedMotion();
  const [phase, setPhase] = useState<Phase>('p830');
  const [mine, setMine] = useState<MyOrder>({ limit: null });
  const [kind, setKind] = useState<'market' | 'limit'>('limit');
  const box = useRef<HTMLElement>(null);
  const choices = limitChoices(setup, phase === 'p830' ? 0 : 1);
  const [limit, setLimit] = useState<number>(() => limitChoices(setup, 0)[3]!);

  const raw: MyOrder = kind === 'market' ? { limit: null } : { limit };
  // a las 8:59, si no cambias la orden de las 8:30, conserva su sitio en la cola por delante de la orden grande
  const draft: MyOrder =
    phase === 'p830' ? raw : { ...raw, early: mine.early !== false && raw.limit === mine.limit };
  const preview =
    phase === 'p830'
      ? withMine(ordersAt830(setup), draft)
      : finalOrders(setup, phase === 'p859' ? draft : mine);
  const eq = equilibrium(preview, setup.ref);
  const fill = myFill(preview, eq);

  useEffect(() => {
    if (phase !== 'closing') return;
    const id = window.setTimeout(
      () => {
        setPhase('done');
        playSound('open');
        haptic(HAPTIC.success);
      },
      reduced ? 0 : CLOSING_MS,
    );
    return () => window.clearTimeout(id);
  }, [phase, reduced]);

  const send = () => {
    setMine(phase === 'p830' ? { ...draft, early: true } : draft);
    if (phase === 'p830') {
      setPhase('p859');
      playSound('miss');
      // la orden grande que llega mueve el indicativo: el tablero se sacude un instante
      box.current?.animate?.(
        [
          { transform: 'translateX(0)' },
          { transform: 'translateX(-4px)' },
          { transform: 'translateX(4px)' },
          { transform: 'translateX(0)' },
        ],
        { duration: reduced ? 0 : 180, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
      );
      // las opciones de límite se recentran en el indicativo nuevo; se conserva tu precio si sigue en la lista
      const next = limitChoices(setup, 1);
      if (!next.some((p) => Math.abs(p - limit) < 1e-9)) setLimit(next[3]!);
    } else setPhase('closing');
  };

  if (phase === 'done') {
    const r = auctionResult(setup, mine);
    return (
      <section
        aria-labelledby="oa-done"
        className="oa-panel grid gap-4 rounded-[var(--radius-md)] border p-4"
        data-testid="oa-done"
      >
        <h2 id="oa-done" className="text-3xl">
          {t('auction.doneTitle')}
        </h2>
        <dl className="grid grid-cols-2 gap-3" data-num>
          <div>
            <dt className="text-text-2 text-sm">{t('auction.openPrice')}</dt>
            <dd className="text-2xl" data-testid="oa-price">
              {formatEur(r.auction)}
            </dd>
          </div>
          <div>
            <dt className="text-text-2 text-sm">{t('auction.vsRef')}</dt>
            <dd className="text-bull text-2xl">▲ +{formatNumber(r.pct, 2)} %</dd>
          </div>
          <div>
            <dt className="text-text-2 text-sm">{t('auction.inAuction')}</dt>
            <dd className="text-xl" data-testid="oa-filled">
              {formatNumber(r.filled)} / {formatNumber(TARGET)}
            </dd>
          </div>
          <div>
            <dt className="text-text-2 text-sm">{t('auction.inCont')}</dt>
            <dd className="text-xl">
              {r.rest > 0
                ? t('auction.restAt', { n: formatNumber(r.rest), price: formatEur(r.cont) })
                : '—'}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-text-2 text-sm">{t('auction.total')}</dt>
            <dd className="text-2xl" data-testid="oa-cost">
              {formatEur(r.cost)}
            </dd>
          </div>
        </dl>
        <p className="text-lg" data-testid="oa-verdict">
          {r.score >= 1 ? t('auction.great') : r.filled === 0 ? t('auction.bad') : t('auction.ok')}
        </p>
        <Button onClick={() => onDone(auctionValues(r))}>{t('auction.debrief')}</Button>
      </section>
    );
  }

  const shock = setup.shock;
  return (
    <section
      ref={box}
      aria-labelledby="oa-title"
      className="oa-panel grid gap-4 rounded-[var(--radius-md)] border p-4"
    >
      <header className="grid gap-1">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="oa-title" className="text-3xl">
            {t('auction.title')}
          </h2>
          <p className="text-xl" data-num data-testid="oa-clock">
            {phase === 'p830' ? '8:30' : phase === 'p859' ? '8:59' : '9:00'}
          </p>
        </div>
        {phase === 'p830' && (
          <p>{t('auction.brief', { n: formatNumber(TARGET), ref: formatEur(setup.ref) })}</p>
        )}
        {phase === 'p859' && (
          <p role="status" className="oa-shock" data-testid="oa-shock">
            {t(shock.side === 'buy' ? 'auction.shockBuy' : 'auction.shockSell', {
              n: formatNumber(shock.qty),
              price: formatEur(shock.limit!),
            })}
          </p>
        )}
        {phase === 'closing' && (
          <p role="status" data-testid="oa-closing">
            {t('auction.closing')}
          </p>
        )}
      </header>

      <p className="text-sm" data-num data-testid="oa-indicative">
        {t('auction.indicative', {
          price: formatEur(eq.price),
          volume: formatNumber(eq.volume),
          fill: formatNumber(fill),
          total: formatNumber(TARGET),
        })}
      </p>
      <div className="grid gap-1">
        <AuctionTable orders={preview} refPrice={setup.ref} />
        <p className="text-text-2 text-xs">{t('auction.tableNote')}</p>
      </div>
      {phase === 'closing' && (
        <div className="oa-clock-bar h-1 overflow-hidden rounded-full" aria-hidden="true">
          <span
            className="oa-clock-fill block h-full w-full"
            style={{ animationDuration: `${CLOSING_MS}ms` }}
          />
        </div>
      )}

      {phase !== 'closing' && (
        <div className="grid gap-3">
          <fieldset className="grid gap-2">
            <legend className="text-sm">
              {t('auction.yourOrder', { n: formatNumber(TARGET) })}
            </legend>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={kind === 'market' ? 'primary' : 'secondary'}
                aria-pressed={kind === 'market'}
                onClick={() => setKind('market')}
              >
                {t('auction.market')}
              </Button>
              <Button
                variant={kind === 'limit' ? 'primary' : 'secondary'}
                aria-pressed={kind === 'limit'}
                onClick={() => setKind('limit')}
              >
                {t('auction.limit')}
              </Button>
              {kind === 'limit' && (
                <>
                  <label htmlFor="oa-limit" className="sr-only">
                    {t('auction.limitPrice')}
                  </label>
                  <select
                    id="oa-limit"
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    className="bg-surface-2 border-line min-h-12 rounded-[var(--radius-sm)] border px-2"
                    data-num
                  >
                    {choices.map((p) => (
                      <option key={p} value={p}>
                        {formatEur(p)}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>
          </fieldset>
          <Button onClick={send}>
            {phase === 'p830' ? t('auction.send') : t('auction.confirm')}
          </Button>
        </div>
      )}
    </section>
  );
}
