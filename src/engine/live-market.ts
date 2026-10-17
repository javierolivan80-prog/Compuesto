import { mulberry32 } from './prng';

/*
 * La Mesa: mercado vivo del universo ficticio (docs/specs/la-mesa.md). Lógica pura y determinista:
 * las velas de cada día salen de una semilla y la cartera es una proyección de los eventos de órdenes y cierres.
 * Sin API ni datos reales.
 */

export const START_CASH = 10_000;
/** Media horquilla: se compra un 0,05 % por encima de la apertura y se vende un 0,05 % por debajo. */
export const HALF_SPREAD = 0.0005;
export const FEE_PCT = 0.001;
export const FEE_MIN = 1;
/** Días de mercado que se pueden cerrar por día real (una semana de mercado por sesión). */
export const DAYS_PER_REAL_DAY = 5;
/** Inflación de referencia (objetivo del BCE) para medir la rentabilidad real. */
export const INFLATION_YEAR = 0.02;
export const TRADING_DAYS_YEAR = 252;
/** Días de historia previos al primer día de Javier, para que los gráficos tengan pasado. */
export const PRE_DAYS = 30;
/** Primer día de mercado del calendario simulado (lunes). */
export const EPOCH = '2026-01-05';
export const DIVERSIFIED_MIN_POSITIONS = 3;
export const DIVERSIFIED_MAX_WEIGHT = 0.4;
export const XP_CLOSE = 5;
export const XP_DIVERSIFIED = 5;

export interface LiveStock {
  id: string;
  name: string;
  symbol: string;
  sector: string;
  startPrice: number;
  /** Sensibilidad al mercado. */
  beta: number;
  /** Volatilidad diaria propia (desviación del log-rendimiento). */
  vol: number;
}

export interface NewsTemplate {
  id: string;
  scope: 'company' | 'macro';
  sign: 1 | -1;
  impactMin: number;
  impactMax: number;
  headline: string;
  explanation: string;
  concepts: string[];
}

export interface DayNews {
  templateId: string;
  companyId: string | null;
  headline: string;
  explanation: string;
  concepts: string[];
  /** Impacto en log-rendimiento, con signo. */
  impact: number;
}

export interface Drivers {
  /** Parte del movimiento que viene del mercado (beta × factor de mercado). */
  market: number;
  /** Parte propia de la empresa (ruido). */
  own: number;
  /** Parte que viene de la noticia de la empresa. */
  news: number;
}

export interface DayQuote {
  open: number;
  high: number;
  low: number;
  close: number;
  /** Log-rendimiento de cierre a cierre = market + own + news. */
  drivers: Drivers;
}

export interface MarketDay {
  day: number;
  date: string;
  news: DayNews | null;
  quotes: Record<string, DayQuote>;
  /** Índice Compuesto: media de los rendimientos diarios, base 100 antes del día 0. */
  index: number;
}

const r2 = (x: number) => Math.round(x * 100) / 100;

function normal(rnd: () => number): number {
  const u = Math.max(rnd(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd());
}

/** Fecha del día de mercado n (lunes a viernes) a partir de EPOCH. */
export function tradingDate(n: number): string {
  const d = new Date(`${EPOCH}T00:00:00Z`);
  let left = n;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) left--;
  }
  return d.toISOString().slice(0, 10);
}

/**
 * Días de mercado 0..days−1. Cada día usa su propia semilla (seed, día), así que alargar el mercado no cambia
 * los días ya generados. Probabilidad de noticia: 70 %; de ellas, 30 % macro (mueven a todos vía beta).
 */
export function buildMarket(
  stocks: readonly LiveStock[],
  templates: readonly NewsTemplate[],
  days: number,
  seed = 2026,
): MarketDay[] {
  const company = templates.filter((t) => t.scope === 'company');
  const macro = templates.filter((t) => t.scope === 'macro');
  const prev: Record<string, number> = Object.fromEntries(stocks.map((s) => [s.id, s.startPrice]));
  let index = 100;
  const out: MarketDay[] = [];
  for (let day = 0; day < days; day++) {
    const rnd = mulberry32((Math.imul(seed, 1_000_003) + day * 7919) >>> 0);
    let news: DayNews | null = null;
    if (rnd() < 0.7) {
      const isMacro = macro.length > 0 && (company.length === 0 || rnd() < 0.3);
      const pool = isMacro ? macro : company;
      const t = pool[Math.floor(rnd() * pool.length)]!;
      const target = isMacro ? null : stocks[Math.floor(rnd() * stocks.length)]!;
      const impact = t.sign * (t.impactMin + rnd() * (t.impactMax - t.impactMin));
      news = {
        templateId: t.id,
        companyId: target?.id ?? null,
        headline: t.headline.replace('{empresa}', target?.name ?? ''),
        explanation: t.explanation,
        concepts: t.concepts,
        impact,
      };
    }
    const macroImpact = news && news.companyId === null ? news.impact : 0;
    const factor = normal(rnd) * 0.007 + macroImpact;
    const quotes: Record<string, DayQuote> = {};
    let sumReturn = 0;
    for (const s of stocks) {
      const p = prev[s.id]!;
      const newsPart = news?.companyId === s.id ? news.impact : 0;
      const market = s.beta * factor;
      const own = normal(rnd) * s.vol;
      const total = market + own + newsPart;
      // la noticia se descuenta en buena parte en la apertura (hueco); el resto, durante la sesión
      const gap = 0.6 * (newsPart + s.beta * macroImpact) + normal(rnd) * 0.002;
      const open = p * Math.exp(gap);
      const close = p * Math.exp(total);
      const high = Math.max(open, close) * (1 + Math.abs(normal(rnd)) * 0.004);
      const low = Math.min(open, close) * (1 - Math.abs(normal(rnd)) * 0.004);
      quotes[s.id] = { open, high, low, close, drivers: { market, own, news: newsPart } };
      sumReturn += close / p - 1;
      prev[s.id] = close;
    }
    index *= 1 + sumReturn / stocks.length;
    out.push({ day, date: tradingDate(day), news, quotes, index });
  }
  return out;
}

/* ---------- Órdenes y cartera ---------- */

export type Side = 'buy' | 'sell';

export interface OrderEvent {
  kind: 'order';
  day: number;
  stockId: string;
  side: Side;
  qty: number;
  price: number;
  fee: number;
}

export interface CloseEvent {
  kind: 'close';
  day: number;
  /** Día natural (zona del dispositivo) en que se cerró, para el tope diario. */
  realDay: string;
}

export type MesaEvent = OrderEvent | CloseEvent;

export interface Position {
  qty: number;
  /** Coste total pagado (incluye comisiones), para el precio medio. */
  cost: number;
}

export interface Portfolio {
  cash: number;
  positions: Record<string, Position>;
  /** Día de mercado abierto ahora (absoluto en el mercado generado). */
  day: number;
  closedDays: number;
  /** Valor al cierre de cada día cerrado. */
  history: { day: number; value: number }[];
  rejected: number;
}

export const firstDay = PRE_DAYS;

export function feeFor(gross: number): number {
  return r2(Math.max(FEE_MIN, gross * FEE_PCT));
}

export interface Quote {
  ok: boolean;
  reason?: 'qty' | 'cash' | 'position' | 'closed';
  price: number;
  gross: number;
  fee: number;
  /** Lo que sale de la caja (compra) o entra (venta). */
  total: number;
}

/** Precio y coste de una orden a mercado en el día abierto: a la apertura ± media horquilla, más comisión. */
export function quoteOrder(
  p: Portfolio,
  market: readonly MarketDay[],
  stockId: string,
  side: Side,
  qty: number,
): Quote {
  const q = market[p.day]?.quotes[stockId];
  if (!q) return { ok: false, reason: 'closed', price: 0, gross: 0, fee: 0, total: 0 };
  const price = r2(q.open * (side === 'buy' ? 1 + HALF_SPREAD : 1 - HALF_SPREAD));
  const gross = r2(price * qty);
  const fee = feeFor(gross);
  const total = side === 'buy' ? r2(gross + fee) : r2(gross - fee);
  if (!Number.isInteger(qty) || qty < 1)
    return { ok: false, reason: 'qty', price, gross, fee, total };
  if (side === 'buy' && total > p.cash + 1e-9)
    return { ok: false, reason: 'cash', price, gross, fee, total };
  if (side === 'sell' && qty > (p.positions[stockId]?.qty ?? 0))
    return { ok: false, reason: 'position', price, gross, fee, total };
  return { ok: true, price, gross, fee, total };
}

const emptyPortfolio = (): Portfolio => ({
  cash: START_CASH,
  positions: {},
  day: firstDay,
  closedDays: 0,
  history: [],
  rejected: 0,
});

/** Valor de la cartera con los precios de cierre (o de apertura, si el día está abierto). */
export function valueAt(
  p: Pick<Portfolio, 'cash' | 'positions'>,
  day: MarketDay,
  at: 'open' | 'close',
): number {
  let v = p.cash;
  for (const [id, pos] of Object.entries(p.positions)) v += pos.qty * (day.quotes[id]?.[at] ?? 0);
  return r2(v);
}

/**
 * Cartera desde los eventos, en orden. Una orden de otro día o que no cabe (sin caja, sin posición) se descarta
 * y se cuenta en `rejected`: reconstruir siempre da lo mismo aunque lleguen eventos raros de otro dispositivo.
 */
export function projectPortfolio(
  events: readonly MesaEvent[],
  market: readonly MarketDay[],
): Portfolio {
  const p = emptyPortfolio();
  for (const e of events) {
    if (e.day !== p.day) {
      p.rejected++;
      continue;
    }
    if (e.kind === 'close') {
      const d = market[p.day];
      if (!d) {
        p.rejected++;
        continue;
      }
      p.history.push({ day: p.day, value: valueAt(p, d, 'close') });
      p.closedDays++;
      p.day++;
      continue;
    }
    const q = quoteOrder(p, market, e.stockId, e.side, e.qty);
    if (!q.ok) {
      p.rejected++;
      continue;
    }
    const pos = p.positions[e.stockId] ?? { qty: 0, cost: 0 };
    if (e.side === 'buy') {
      p.cash = r2(p.cash - q.total);
      p.positions[e.stockId] = { qty: pos.qty + e.qty, cost: r2(pos.cost + q.total) };
    } else {
      p.cash = r2(p.cash + q.total);
      const left = pos.qty - e.qty;
      if (left === 0) delete p.positions[e.stockId];
      else p.positions[e.stockId] = { qty: left, cost: r2((pos.cost * left) / pos.qty) };
    }
  }
  return p;
}

/** Cierres hechos en un día real: no se pueden pasar de DAYS_PER_REAL_DAY. */
export function closesLeftToday(events: readonly MesaEvent[], today: string): number {
  const used = events.filter((e) => e.kind === 'close' && e.realDay === today).length;
  return Math.max(0, DAYS_PER_REAL_DAY - used);
}

export function isDiversified(p: Pick<Portfolio, 'cash' | 'positions'>, day: MarketDay): boolean {
  const ids = Object.keys(p.positions);
  if (ids.length < DIVERSIFIED_MIN_POSITIONS) return false;
  const total = valueAt(p, day, 'close');
  return ids.every(
    (id) => (p.positions[id]!.qty * day.quotes[id]!.close) / total <= DIVERSIFIED_MAX_WEIGHT,
  );
}

/** XP de cerrar un día: por proceso (cerrar y diversificar), nunca por ganar o perder. */
export function closeXp(p: Pick<Portfolio, 'cash' | 'positions'>, day: MarketDay): number {
  return XP_CLOSE + (isDiversified(p, day) ? XP_DIVERSIFIED : 0);
}

export interface Scoreboard {
  value: number;
  portfolioReturn: number;
  indexReturn: number;
  inflation: number;
  realReturn: number;
}

/** Cartera frente al Índice Compuesto y la inflación de referencia desde el primer día de Javier. */
export function scoreboard(p: Portfolio, market: readonly MarketDay[]): Scoreboard {
  const lastClosed = p.closedDays > 0 ? market[p.day - 1]! : null;
  const value = lastClosed ? valueAt(p, lastClosed, 'close') : START_CASH;
  const base = market[firstDay - 1]?.index ?? 100;
  const indexReturn = lastClosed ? lastClosed.index / base - 1 : 0;
  const inflation = (1 + INFLATION_YEAR) ** (p.closedDays / TRADING_DAYS_YEAR) - 1;
  const portfolioReturn = value / START_CASH - 1;
  return {
    value,
    portfolioReturn,
    indexReturn,
    inflation,
    realReturn: (1 + portfolioReturn) / (1 + inflation) - 1,
  };
}

/** Cierres de los últimos n días de un valor, para el minigráfico. */
export function closesOf(market: readonly MarketDay[], stockId: string, upTo: number, n = 20) {
  return market.slice(Math.max(0, upTo - n), upTo).map((d) => d.quotes[stockId]!.close);
}

/** Eventos de la app → eventos de La Mesa, en orden de llegada; el día real se cuenta en la zona del evento. */
export function mesaEvents(
  events: readonly {
    type: string;
    createdAt: string;
    tz: string;
    payload: unknown;
  }[],
  dayOf: (iso: string, tz: string) => string,
): MesaEvent[] {
  const out: MesaEvent[] = [];
  const sorted = [...events].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const e of sorted) {
    if (e.type === 'mesa_order') {
      const p = e.payload as Omit<OrderEvent, 'kind'>;
      out.push({ kind: 'order', ...p });
    } else if (e.type === 'mesa_day_closed') {
      const p = e.payload as { day: number };
      out.push({ kind: 'close', day: p.day, realDay: dayOf(e.createdAt, e.tz) });
    }
  }
  return out;
}
