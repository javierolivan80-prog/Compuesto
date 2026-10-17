import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatedNumber } from '../../components/AnimatedNumber';
import { Button } from '../../components/Button';
import { Sheet } from '../../components/Sheet';
import { ErrorState, Loading } from '../../components/States';
import { useRepo } from '../../db/RepoProvider';
import { dayKey } from '../../engine/days';
import type { AppEvent } from '../../engine/events';
import {
  closesLeftToday,
  closesOf,
  closeXp,
  DAYS_PER_REAL_DAY,
  firstDay,
  isDiversified,
  quoteOrder,
  scoreboard,
  START_CASH,
  valueAt,
  type LiveStock,
  type MarketDay,
  type Portfolio,
  type Side,
} from '../../engine/live-market';
import { t } from '../../i18n';
import { formatDelta, formatEur, formatNumber } from '../../lib/format';
import { haptic, HAPTIC } from '../../lib/haptics';
import { playSound } from '../../lib/sound';
import './mesa.css';
import { mesaState, STOCKS } from './state';

/** Variación en % con ▲▼ y signo; lo que redondea a 0,0 % se muestra sin flecha (nada de «▼ −0,0 %»). */
const pct = (x: number) => formatDelta(Math.abs(x) < 0.0005 ? 0 : x * 100, 1);
const longDate = (iso: string) =>
  new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T00:00:00Z`));
const tone = (x: number) =>
  x >= 0.0005 ? 'text-bull' : x <= -0.0005 ? 'text-bear' : 'text-text-2';

function useMesa() {
  const repo = useRepo();
  const [events, setEvents] = useState<AppEvent[] | null>(null);
  const [error, setError] = useState(false);
  const load = useCallback(() => {
    repo
      .allEvents()
      .then(setEvents)
      .catch((e) => {
        console.error('No se pudo leer La Mesa', e);
        setError(true);
      });
  }, [repo]);
  useEffect(load, [load]);
  const { mesa, market, portfolio } = useMemo(() => mesaState(events ?? []), [events]);
  return { repo, events, error, mesa, market, portfolio, reload: load };
}

/** Minigráfico de los últimos cierres: decorativo; la variación va en texto al lado. */
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const W = 72;
  const H = 28;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * W;
      const y = H - 2 - ((v - lo) / (hi - lo || 1)) * (H - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const up = values.at(-1)! >= values[0]!;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" className="shrink-0">
      <polyline
        points={pts}
        fill="none"
        stroke={up ? 'var(--bull)' : 'var(--bear)'}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Scoreboard({ portfolio, market }: { portfolio: Portfolio; market: MarketDay[] }) {
  const s = scoreboard(portfolio, market);
  return (
    <dl className="grid grid-cols-2 gap-2" data-testid="mesa-score">
      <div className="bg-surface-1 border-line col-span-2 grid gap-1 rounded-[var(--radius-md)] border p-4">
        <dt className="text-text-2 text-sm">{t('mesa.portfolio')}</dt>
        <dd className="text-4xl" data-num>
          {formatEur(s.value)}
        </dd>
        <dd className={`text-sm ${tone(s.portfolioReturn)}`} data-num>
          {pct(s.portfolioReturn)}
        </dd>
      </div>
      <div className="bg-surface-1 border-line min-w-0 rounded-[var(--radius-sm)] border p-3">
        <dt className="text-text-2 text-xs">{t('mesa.index')}</dt>
        <dd className={`mt-1 font-medium ${tone(s.indexReturn)}`} data-num>
          {pct(s.indexReturn)}
        </dd>
      </div>
      <div className="bg-surface-1 border-line min-w-0 rounded-[var(--radius-sm)] border p-3">
        <dt className="text-text-2 text-xs">{t('mesa.real')}</dt>
        <dd className={`mt-1 font-medium ${tone(s.realReturn)}`} data-num>
          {pct(s.realReturn)}
        </dd>
        <dd className="text-text-2 text-xs" data-num>
          {t('mesa.inflation')} {pct(s.inflation)}
        </dd>
      </div>
    </dl>
  );
}

function Wire({ day }: { day: MarketDay }) {
  const n = day.news;
  return (
    <section
      aria-labelledby="mesa-wire"
      className="bg-surface-1 border-line grid gap-2 rounded-[var(--radius-md)] border p-4"
    >
      <h2
        id="mesa-wire"
        className="text-text-2 flex items-center gap-2 text-xs font-medium tracking-wide uppercase"
      >
        <span aria-hidden="true" className="mesa-live size-2 rounded-full" />
        {t('mesa.wire')}
        {n && (
          <span className="text-text-2 normal-case">
            · {n.companyId ? t('mesa.wireCompany') : t('mesa.wireMacro')}
          </span>
        )}
      </h2>
      <p className="text-xl leading-snug" data-testid="mesa-headline">
        {n ? n.headline : t('mesa.noNews')}
      </p>
    </section>
  );
}

interface TradeState {
  stock: LiveStock;
  side: Side;
  qty: string;
}

function TradeSheet({
  trade,
  portfolio,
  market,
  onChange,
  onClose,
  onConfirm,
}: {
  trade: TradeState | null;
  portfolio: Portfolio;
  market: MarketDay[];
  onChange: (t: TradeState) => void;
  onClose: () => void;
  onConfirm: (t: TradeState, qty: number) => void;
}) {
  if (!trade) return null;
  const qty = Number(trade.qty);
  const q = quoteOrder(portfolio, market, trade.stock.id, trade.side, qty);
  const held = portfolio.positions[trade.stock.id]?.qty ?? 0;
  const unit = quoteOrder(portfolio, market, trade.stock.id, trade.side, 1);
  const maxQty =
    trade.side === 'sell'
      ? held
      : Math.max(0, Math.floor((portfolio.cash - 1) / (unit.price * 1.001)));
  const reason =
    trade.qty.trim() === ''
      ? null
      : q.reason === 'qty'
        ? t('mesa.badQty')
        : q.reason === 'cash'
          ? t('mesa.noCash')
          : q.reason === 'position'
            ? t('mesa.noPosition')
            : null;
  const set = (patch: Partial<TradeState>) => onChange({ ...trade, ...patch });
  return (
    <Sheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={t('mesa.trade', { name: trade.stock.name })}
    >
      <div className="grid gap-4">
        <div
          role="group"
          aria-label={t('mesa.trade', { name: trade.stock.name })}
          className="grid grid-cols-2 gap-2"
        >
          {(['buy', 'sell'] as const).map((side) => (
            <Button
              key={side}
              variant={trade.side === side ? 'primary' : 'secondary'}
              aria-pressed={trade.side === side}
              onClick={() => set({ side })}
            >
              {side === 'buy' ? t('mesa.buy') : t('mesa.sell')}
            </Button>
          ))}
        </div>
        <div className="grid gap-2">
          <label htmlFor="mesa-qty" className="text-sm">
            {t('mesa.qty')}
          </label>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              aria-label={t('mesa.less')}
              onClick={() => set({ qty: String(Math.max(1, (qty || 1) - 1)) })}
            >
              −
            </Button>
            <input
              id="mesa-qty"
              inputMode="numeric"
              value={trade.qty}
              onChange={(e) => set({ qty: e.target.value.replace(/[^\d]/g, '') })}
              className="bg-surface-2 border-line min-h-12 w-full min-w-0 rounded-[var(--radius-sm)] border px-3 text-center text-lg"
              data-num
            />
            <Button
              variant="secondary"
              aria-label={t('mesa.more')}
              onClick={() => set({ qty: String((qty || 0) + 1) })}
            >
              +
            </Button>
            <Button
              variant="ghost"
              onClick={() => set({ qty: String(maxQty) })}
              disabled={maxQty < 1}
            >
              {t('mesa.max')}
            </Button>
          </div>
        </div>
        <dl className="grid gap-1 text-sm" data-num>
          <div className="flex justify-between gap-3">
            <dt className="text-text-2">{t('mesa.price')}</dt>
            <dd>{formatEur(q.price)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-text-2">{t('mesa.fee')}</dt>
            <dd>
              {q.ok || q.reason === 'cash' || q.reason === 'position' ? formatEur(q.fee) : '—'}
            </dd>
          </div>
          <div className="flex justify-between gap-3 text-base font-medium">
            <dt>{trade.side === 'buy' ? t('mesa.totalBuy') : t('mesa.totalSell')}</dt>
            <dd data-testid="mesa-total">
              {q.ok || q.reason === 'cash' || q.reason === 'position' ? formatEur(q.total) : '—'}
            </dd>
          </div>
        </dl>
        <p role="status" aria-live="polite" className="text-bear min-h-5 text-sm">
          {reason}
        </p>
        <Button disabled={!q.ok} onClick={() => onConfirm(trade, qty)}>
          {trade.side === 'buy'
            ? t('mesa.confirmBuy', { n: formatNumber(qty || 0) })
            : t('mesa.confirmSell', { n: formatNumber(qty || 0) })}
        </Button>
      </div>
    </Sheet>
  );
}

interface Closed {
  day: MarketDay;
  prev: MarketDay;
  before: Portfolio;
  xp: number;
  diversified: boolean;
}

function CloseReport({
  closed,
  onNext,
  canContinue,
}: {
  closed: Closed;
  onNext: () => void;
  canContinue: boolean;
}) {
  const { day, prev, before } = closed;
  const startValue = before.history.at(-1)?.value ?? START_CASH;
  const endValue = valueAt(before, day, 'close');
  const dayRet = endValue / startValue - 1;
  const news = day.news;
  const focus = news?.companyId ? STOCKS.find((s) => s.id === news.companyId) : null;
  const d = focus ? day.quotes[focus.id]!.drivers : null;
  return (
    <section aria-labelledby="mesa-close" className="grid gap-4" data-testid="mesa-close">
      <h2 id="mesa-close" className="text-3xl">
        {t('mesa.closing', { n: day.day - firstDay + 1 })}
      </h2>
      <div className="bg-surface-1 border-line rounded-[var(--radius-md)] border p-4">
        <p className="text-text-2 text-sm">{t('mesa.dayResult')}</p>
        <p className="text-3xl" data-num>
          <AnimatedNumber value={endValue} initial={startValue} format={(n) => formatEur(n)} />
        </p>
        <p className={`text-sm ${tone(dayRet)}`} data-num>
          {pct(dayRet)}
        </p>
      </div>
      <ol className="grid grid-cols-1 gap-2" aria-label={t('mesa.stocks')}>
        {STOCKS.map((s, i) => {
          const c = day.quotes[s.id]!.close;
          const r = c / prev.quotes[s.id]!.close - 1;
          return (
            <li
              key={s.id}
              className="mesa-reveal bg-surface-1 border-line flex min-w-0 items-center justify-between gap-3 rounded-[var(--radius-sm)] border px-3 py-2"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className="min-w-0">
                <span className="font-medium" data-num>
                  {s.symbol}
                </span>{' '}
                <span className="text-text-2 text-sm">{s.name}</span>
              </span>
              <span className="text-right" data-num>
                <span className="block">{formatEur(c)}</span>
                <span className={`block text-sm ${tone(r)}`}>{pct(r)}</span>
              </span>
            </li>
          );
        })}
      </ol>
      {news && (
        <section
          aria-labelledby="mesa-why"
          className="bg-surface-2 border-line grid gap-2 rounded-[var(--radius-md)] border p-4"
        >
          <h3 id="mesa-why" className="text-xl">
            {focus ? t('mesa.why', { name: focus.name }) : t('mesa.whyMacro')}
          </h3>
          <p>{news.explanation}</p>
          {d && (
            <p className="text-text-2 text-sm" data-num>
              {t('mesa.drivers', {
                market: pct(Math.expm1(d.market)),
                own: pct(Math.expm1(d.own)),
                news: pct(Math.expm1(d.news)),
              })}
            </p>
          )}
        </section>
      )}
      <div className="grid gap-1 text-sm">
        <p className="font-medium" data-testid="mesa-xp">
          {t('games.xp', { n: closed.xp })}
        </p>
        <p className="text-text-2">
          {closed.diversified ? t('mesa.diversified') : t('mesa.notDiversified')}
        </p>
        <p className="text-text-2">{t('mesa.xpProcess')}</p>
      </div>
      {canContinue && <Button onClick={onNext}>{t('mesa.next')}</Button>}
    </section>
  );
}

export function Mesa() {
  const { repo, events, error, mesa, market, portfolio, reload } = useMesa();
  const [trade, setTrade] = useState<TradeState | null>(null);
  const [closed, setClosed] = useState<Closed | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const today = dayKey(new Date());

  if (error) return <ErrorState message={t('games.error')} onRetry={reload} />;
  if (!events) return <Loading />;

  const day = market[portfolio.day]!;
  const prev = market[portfolio.day - 1]!;
  const left = closesLeftToday(mesa, today);

  const confirm = async (tr: TradeState, qty: number) => {
    const q = quoteOrder(portfolio, market, tr.stock.id, tr.side, qty);
    if (!q.ok) return;
    setBusy(true);
    try {
      await repo.record('mesa_order', {
        day: portfolio.day,
        stockId: tr.stock.id,
        side: tr.side,
        qty,
        price: q.price,
        fee: q.fee,
      });
      haptic(HAPTIC.success);
      playSound('register');
      setNotice(
        t('mesa.done', {
          side: tr.side === 'buy' ? t('mesa.buy').toLowerCase() : t('mesa.sell').toLowerCase(),
          n: formatNumber(qty),
          symbol: tr.stock.symbol,
          price: formatEur(q.price),
        }),
      );
      setTrade(null);
      reload();
    } catch (e) {
      console.error('No se pudo guardar la orden', e);
      setNotice(t('games.error'));
    } finally {
      setBusy(false);
    }
  };

  const closeDay = async () => {
    if (left < 1) return;
    setBusy(true);
    const xp = closeXp(portfolio, day);
    try {
      await repo.record('mesa_day_closed', { day: portfolio.day, xp });
      playSound('close');
      haptic(HAPTIC.success);
      setClosed({ day, prev, before: portfolio, xp, diversified: isDiversified(portfolio, day) });
      setNotice(null);
      reload();
    } catch (e) {
      console.error('No se pudo cerrar el día', e);
      setNotice(t('games.error'));
    } finally {
      setBusy(false);
    }
  };

  if (closed)
    return (
      <div className="grid gap-4">
        <CloseReport closed={closed} canContinue={left > 0} onNext={() => setClosed(null)} />
        {left < 1 && <p className="text-text-2">{t('mesa.comeBack', { n: DAYS_PER_REAL_DAY })}</p>}
      </div>
    );

  const positions = Object.entries(portfolio.positions);
  return (
    <section aria-labelledby="mesa-title" className="grid gap-5">
      <header className="grid gap-1">
        <h1 id="mesa-title" className="text-4xl">
          {t('mesa.title')}
        </h1>
        <p className="text-text-2 text-sm" data-num data-testid="mesa-day">
          {t('mesa.day', { n: portfolio.day - firstDay + 1, date: longDate(day.date) })}
        </p>
        <p className="text-text-2">{t('mesa.subtitle')}</p>
      </header>
      <Scoreboard portfolio={portfolio} market={market} />
      <Wire day={day} />
      <section aria-labelledby="mesa-stocks" className="grid gap-2">
        <h2 id="mesa-stocks" className="text-2xl">
          {t('mesa.stocks')}
        </h2>
        <ul className="grid grid-cols-1 gap-2">
          {STOCKS.map((s) => {
            const open = day.quotes[s.id]!.open;
            const gap = open / prev.quotes[s.id]!.close - 1;
            const held = portfolio.positions[s.id]?.qty ?? 0;
            return (
              <li key={s.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => setTrade({ stock: s, side: 'buy', qty: '10' })}
                  className="bg-surface-1 border-line flex min-h-14 w-full min-w-0 cursor-pointer items-center gap-3 rounded-[var(--radius-sm)] border px-3 py-2 text-left transition-transform duration-100 ease-[var(--ease-out)] active:scale-[0.98]"
                  aria-label={`${t('mesa.trade', { name: s.name })}. ${t('mesa.opensAt', { price: formatEur(open) })}, ${pct(gap)}${held ? `. ${t('mesa.youHave', { n: formatNumber(held) })}` : ''}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium" data-num>
                      {s.symbol}
                    </span>
                    <span className="text-text-2 block truncate text-sm">{s.name}</span>
                  </span>
                  <Sparkline values={[...closesOf(market, s.id, portfolio.day), open]} />
                  <span className="w-24 text-right" data-num>
                    <span className="block">{formatEur(open)}</span>
                    <span className={`block text-sm ${tone(gap)}`}>{pct(gap)}</span>
                    {held > 0 && (
                      <span className="text-text-2 block text-xs">
                        {t('mesa.youHave', { n: formatNumber(held) })}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
      <section aria-labelledby="mesa-pos" className="grid gap-2">
        <h2 id="mesa-pos" className="text-2xl">
          {t('mesa.positions')}
        </h2>
        <p className="text-text-2 text-sm" data-num>
          {t('mesa.cash')}: {formatEur(portfolio.cash)}
        </p>
        {positions.length === 0 ? (
          <p className="text-text-2">{t('mesa.noPositions')}</p>
        ) : (
          <ul className="grid gap-1" data-testid="mesa-positions">
            {positions.map(([id, pos]) => {
              const s = STOCKS.find((x) => x.id === id)!;
              const now = pos.qty * day.quotes[id]!.open;
              const pnl = now - pos.cost;
              return (
                <li key={id} className="flex justify-between gap-3 text-sm" data-num>
                  <span>
                    {s.symbol} · {formatNumber(pos.qty)} ·{' '}
                    {t('mesa.avg', { price: formatEur(pos.cost / pos.qty) })}
                  </span>
                  <span className={tone(pnl)}>{t('mesa.pnl', { pnl: formatEur(pnl) })}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <p role="status" aria-live="polite" className="text-sm" data-testid="mesa-notice">
        {notice}
      </p>
      <div className="grid gap-2">
        {left > 0 ? (
          <>
            <Button onClick={() => void closeDay()} loading={busy}>
              {t('mesa.close')}
            </Button>
            <p className="text-text-2 text-sm">{t('mesa.closesLeft', { n: left })}</p>
          </>
        ) : (
          <p className="text-text-2" data-testid="mesa-come-back">
            {t('mesa.comeBack', { n: DAYS_PER_REAL_DAY })}
          </p>
        )}
        <p className="text-text-2 text-xs">{t('mesa.fictitious')}</p>
      </div>
      <TradeSheet
        trade={trade}
        portfolio={portfolio}
        market={market}
        onChange={setTrade}
        onClose={() => setTrade(null)}
        onConfirm={(tr, qty) => void confirm(tr, qty)}
      />
    </section>
  );
}
