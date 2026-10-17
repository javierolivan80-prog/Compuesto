import { mulberry32 } from '../prng';

/*
 * «La compra grande» (lección-juego de N1-U4): un cliente te encarga comprar un paquete de acciones en un libro
 * poco profundo antes de que salgan unos resultados que lo encarecerán. Enseña horquilla, liquidez, impacto de
 * mercado, orden de mercado frente a limitada y trocear una orden. Lógica pura y determinista por semilla.
 */

export const TICK = 0.01;
export const ROUNDS = 4;
/** Ronda (0-based) tras la cual se publican los resultados y el libro sube. */
export const NEWS_AFTER_ROUND = 1;
/** Parte de la liquidez consumida que vuelve al libro en la ronda siguiente. */
export const REFILL = 0.6;

export interface Level {
  price: number;
  qty: number;
}

export interface Book {
  bids: Level[];
  asks: Level[];
}

export interface BlockTradeSetup {
  seed: number;
  target: number;
  /** Punto medio inicial (referencia para medir el impacto). */
  mid: number;
  /** Subida del libro cuando salen los resultados (en tanto por uno). */
  newsJump: number;
  book: Book;
}

export type Action =
  | { type: 'market'; qty: number }
  | { type: 'limit'; qty: number; price: number }
  | { type: 'wait' };

export interface RoundLog {
  round: number;
  action: Action;
  filled: number;
  cost: number;
  /** Mejor precio de venta antes de actuar. */
  bestAsk: number;
}

export interface BlockTradeState {
  setup: BlockTradeSetup;
  round: number;
  book: Book;
  bought: number;
  cost: number;
  /** Orden limitada pendiente (se revisa al empezar cada ronda). */
  resting: { qty: number; price: number } | null;
  log: RoundLog[];
  done: boolean;
  /** Acciones compradas a la fuerza al final (el cliente exige completar). */
  forced: number;
}

const r2 = (x: number) => Math.round(x * 100) / 100;

export function setupBlockTrade(seed: number): BlockTradeSetup {
  const rnd = mulberry32(seed);
  const mid = r2(9 + Math.floor(rnd() * 200) * TICK);
  const half = TICK * (1 + Math.floor(rnd() * 2));
  const levelQty = () => 100 + Math.floor(rnd() * 3) * 50;
  const asks = Array.from({ length: 8 }, (_, k) => ({
    price: r2(mid + half + k * TICK),
    qty: levelQty(),
  }));
  const bids = Array.from({ length: 5 }, (_, k) => ({
    price: r2(mid - half - k * TICK),
    qty: levelQty(),
  }));
  return {
    seed,
    target: 600,
    mid,
    newsJump: 0.03 + Math.floor(rnd() * 3) * 0.005,
    book: { asks, bids },
  };
}

export function startBlockTrade(setup: BlockTradeSetup): BlockTradeState {
  return {
    setup,
    round: 0,
    book: structuredClone(setup.book),
    bought: 0,
    cost: 0,
    resting: null,
    log: [],
    done: false,
    forced: 0,
  };
}

/** Compra contra el libro hasta `qty` acciones con precio ≤ `cap` (Infinity = a mercado). */
function sweep(
  asks: Level[],
  qty: number,
  cap: number,
): { filled: number; cost: number; asks: Level[] } {
  let left = qty;
  let cost = 0;
  const out = asks.map((l) => ({ ...l }));
  for (const l of out) {
    if (left <= 0 || l.price > cap + 1e-9) break;
    const take = Math.min(left, l.qty);
    l.qty -= take;
    left -= take;
    cost += take * l.price;
  }
  return { filled: qty - left, cost: r2(cost), asks: out.filter((l) => l.qty > 0) };
}

export const bestAsk = (b: Book): number => b.asks[0]?.price ?? Infinity;
export const remaining = (s: BlockTradeState): number => s.setup.target - s.bought;

/**
 * Entre rondas: vuelve parte de la liquidez consumida (al precio original de cada nivel) y, tras la ronda de la
 * noticia, todo el libro sube `newsJump`.
 */
function nextBook(before: Book, after: Level[], round: number, setup: BlockTradeSetup): Book {
  const refilled = setup.book.asks.map((orig) => {
    const now = after.find((l) => Math.abs(l.price - orig.price) < 1e-9)?.qty ?? 0;
    return { price: orig.price, qty: Math.round(now + (orig.qty - now) * REFILL) };
  });
  const keep = refilled.filter((l) => l.qty > 0);
  if (round !== NEWS_AFTER_ROUND) return { bids: before.bids, asks: keep };
  const up = (l: Level) => ({ ...l, price: r2(l.price * (1 + setup.newsJump)) });
  return { asks: setup.book.asks.map(up), bids: setup.book.bids.map(up) };
}

export function validQty(s: BlockTradeState, qty: number): boolean {
  return Number.isInteger(qty) && qty >= 1 && qty <= remaining(s);
}

/** Aplica la acción de la ronda actual. Una acción no válida no cambia nada. */
export function act(s: BlockTradeState, action: Action): BlockTradeState {
  if (s.done) return s;
  if (action.type !== 'wait' && !validQty(s, action.qty)) return s;
  if (action.type === 'limit' && !(action.price > 0)) return s;
  const ask0 = bestAsk(s.book);
  let asks = s.book.asks;
  let filled = 0;
  let cost = 0;
  let resting = s.resting;
  // primero se revisa la limitada pendiente de la ronda anterior
  if (resting) {
    const r = sweep(asks, Math.min(resting.qty, remaining(s)), resting.price);
    asks = r.asks;
    filled += r.filled;
    cost += r.cost;
    resting =
      resting.qty - r.filled > 0 ? { qty: resting.qty - r.filled, price: resting.price } : null;
  }
  const left = remaining(s) - filled;
  if (action.type === 'market' && left > 0) {
    const r = sweep(asks, Math.min(action.qty, left), Infinity);
    asks = r.asks;
    filled += r.filled;
    cost += r.cost;
  } else if (action.type === 'limit' && left > 0) {
    const qty = Math.min(action.qty, left);
    const r = sweep(asks, qty, action.price);
    asks = r.asks;
    filled += r.filled;
    cost += r.cost;
    // una limitada nueva sustituye a la pendiente
    resting = qty - r.filled > 0 ? { qty: qty - r.filled, price: action.price } : null;
  }
  let next: BlockTradeState = {
    ...s,
    bought: s.bought + filled,
    cost: r2(s.cost + cost),
    resting,
    log: [...s.log, { round: s.round, action, filled, cost: r2(cost), bestAsk: ask0 }],
  };
  if (next.bought >= s.setup.target)
    return { ...next, book: { ...s.book, asks }, done: true, resting: null };
  const round = s.round + 1;
  const book = nextBook(s.book, asks, s.round, s.setup);
  next = { ...next, round, book };
  if (round >= ROUNDS) {
    // se acabó el tiempo: el cliente exige el paquete completo, a mercado
    const r = sweep(book.asks, remaining(next), Infinity);
    const forced = r.filled;
    const lastPrice = book.asks.at(-1)?.price ?? 0;
    const missing = remaining(next) - forced;
    const extra = r2(r.cost + missing * lastPrice * 1.01);
    return {
      ...next,
      bought: s.setup.target,
      cost: r2(next.cost + extra),
      forced: forced + missing,
      resting: null,
      done: true,
    };
  }
  return next;
}

export interface BlockTradeResult {
  qty: number;
  avg: number;
  mid: number;
  cost: number;
  /** Coste del impacto frente a comprar todo al punto medio inicial. */
  impact: number;
  /** Horquilla inicial (mejor venta − mejor compra). */
  spread: number;
  forced: number;
  /** 0–1 frente a las dos referencias: todo de golpe en la ronda 0 (0,5) y trocear en las rondas antes de la noticia (1). */
  score: number;
}

/** Coste de dos estrategias de referencia con el mismo libro. */
export function benchmarks(setup: BlockTradeSetup): { allNow: number; split: number } {
  const allNow = act(startBlockTrade(setup), { type: 'market', qty: setup.target }).cost;
  let s = startBlockTrade(setup);
  const slices = NEWS_AFTER_ROUND + 1;
  for (let i = 0; i < slices; i++)
    s = act(s, {
      type: 'market',
      qty: i === slices - 1 ? remaining(s) : Math.round(setup.target / slices),
    });
  return { allNow, split: s.cost };
}

export function blockTradeResult(s: BlockTradeState): BlockTradeResult {
  const { setup } = s;
  // 4 decimales: con 2, «media × acciones − punto medio × acciones» no daría el impacto que se muestra
  const avg = Math.round((s.cost / setup.target) * 10_000) / 10_000;
  const spread = r2(bestAsk(setup.book) - (setup.book.bids[0]?.price ?? 0));
  const { allNow, split } = benchmarks(setup);
  // cuadrar con la referencia: trocear = 1, todo de golpe = 0,5, peor que todo de golpe baja proporcionalmente
  let score: number;
  if (s.cost <= split) score = 1;
  else if (s.cost <= allNow)
    score = 0.5 + (0.5 * (allNow - s.cost)) / Math.max(allNow - split, 0.01);
  else
    score = Math.max(0, 0.5 - (0.5 * (s.cost - allNow)) / Math.max(allNow * setup.newsJump, 0.01));
  return {
    qty: setup.target,
    avg,
    mid: setup.mid,
    cost: s.cost,
    impact: r2(s.cost - setup.target * setup.mid),
    spread,
    forced: s.forced,
    score: Math.round(score * 1000) / 1000,
  };
}

/** Cifras de la partida para la explicación y los ejercicios de la lección (marcadores {nombre}). */
export function resultValues(r: BlockTradeResult): Record<string, number> {
  return { qty: r.qty, avg: r.avg, mid: r.mid, cost: r.cost, impact: r.impact, spread: r.spread };
}
