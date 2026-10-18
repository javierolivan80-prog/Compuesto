import { mulberry32 } from '../prng';

/*
 * «La subasta de apertura» (lección-juego de la planta 0, unidad «Precios, órdenes y subastas»): tu cliente quiere
 * 500 acciones de Naranjas del Turia en la apertura. De 8:30 a 9:00 las órdenes se acumulan sin ejecutarse y se
 * publica un precio indicativo; a las 8:59 llega una orden grande que lo mueve y puedes cambiar la tuya. Al cerrar
 * (en un momento aleatorio), todo se casa a un único precio: el que permite negociar más acciones. Lo que no compres
 * en la subasta lo compras después en el mercado continuo, pagando la horquilla.
 * Lógica pura y determinista por semilla.
 */

export const TICK = 0.01;
export const TARGET = 500;
/**
 * Lo que pagas de media por encima del precio de apertura si compras después, en el continuo: la media horquilla más
 * el impacto de barrer un libro poco profundo (unos 5 céntimos, ≈ 0,5 %).
 */
export const CONT_PREMIUM = 0.05;
/** Diferencia de coste (€) que se considera igual de buena que la mejor orden posible. */
export const SCORE_SLACK = 2;

export type Side = 'buy' | 'sell';

export interface AuctionOrder {
  side: Side;
  qty: number;
  /** `null` = orden a mercado. */
  limit: number | null;
  mine?: boolean;
}

export interface AuctionSetup {
  seed: number;
  /** Cierre de ayer: precio de referencia para desempatar. */
  ref: number;
  /** Órdenes a las 8:30. */
  book: AuctionOrder[];
  /** Orden grande que llega a las 8:59. */
  shock: AuctionOrder;
}

const r2 = (x: number) => Math.round(x * 100) / 100;

export function setupAuction(seed: number): AuctionSetup {
  const rnd = mulberry32(seed);
  const ref = r2(9 + Math.floor(rnd() * 50) / 100);
  // buenas noticias de madrugada: hay más ganas de comprar y el precio de partida está entre un 1 % y un 2 % arriba
  const p0 = r2(ref * (1 + 0.01 + Math.floor(rnd() * 5) * 0.0025));
  const qty = () => 150 + Math.floor(rnd() * 5) * 50;
  const book: AuctionOrder[] = [];
  for (let k = -4; k <= 4; k++) {
    book.push({ side: 'buy', qty: qty(), limit: r2(p0 + k * TICK) });
    book.push({ side: 'sell', qty: qty(), limit: r2(p0 + k * TICK) });
  }
  book.push({ side: 'buy', qty: 200, limit: null }, { side: 'sell', qty: 200, limit: null });
  const shock: AuctionOrder =
    rnd() < 0.5
      ? { side: 'buy', qty: 800, limit: r2(p0 + 6 * TICK) }
      : { side: 'sell', qty: 800, limit: r2(p0 - 6 * TICK) };
  return { seed, ref, book, shock };
}

export interface Equilibrium {
  price: number;
  /** Acciones que se casan a ese precio. */
  volume: number;
  /** Compra − venta dispuestas a ese precio (positivo: sobra demanda). */
  imbalance: number;
}

const demandAt = (orders: readonly AuctionOrder[], p: number) =>
  orders
    .filter((o) => o.side === 'buy' && (o.limit === null || o.limit >= p - 1e-9))
    .reduce((s, o) => s + o.qty, 0);
const supplyAt = (orders: readonly AuctionOrder[], p: number) =>
  orders
    .filter((o) => o.side === 'sell' && (o.limit === null || o.limit <= p + 1e-9))
    .reduce((s, o) => s + o.qty, 0);

const at = (orders: readonly AuctionOrder[], p: number): Equilibrium => {
  const d = demandAt(orders, p);
  const s = supplyAt(orders, p);
  return { price: p, volume: Math.min(d, s), imbalance: d - s };
};

/**
 * Precio de la subasta, con las reglas de BME aplicadas en orden: (1) el que permite casar más acciones; (2) si
 * empatan, el de menor desequilibrio; (3) si sigue el empate, el del lado con más volumen: el más alto si en todos
 * sobra demanda, el más bajo si en todos sobra oferta; (4) si no, el más cercano al último precio negociado (en la
 * apertura, el cierre de ayer) y, si ese precio está dentro de los empatados, ese mismo.
 */
export function equilibrium(orders: readonly AuctionOrder[], ref: number): Equilibrium {
  const prices = [...new Set(orders.flatMap((o) => (o.limit === null ? [] : [o.limit])))].sort(
    (a, b) => a - b,
  );
  if (!prices.length) return at(orders, ref);
  const all = prices.map((p) => at(orders, p));
  const maxVol = Math.max(...all.map((c) => c.volume));
  let tied = all.filter((c) => c.volume === maxVol);
  const minImb = Math.min(...tied.map((c) => Math.abs(c.imbalance)));
  tied = tied.filter((c) => Math.abs(c.imbalance) === minImb);
  if (tied.length === 1) return tied[0]!;
  if (tied.every((c) => c.imbalance > 0)) return tied.at(-1)!;
  if (tied.every((c) => c.imbalance < 0)) return tied[0]!;
  const lo = tied[0]!.price;
  const hi = tied.at(-1)!.price;
  if (ref >= lo - 1e-9 && ref <= hi + 1e-9) return at(orders, ref);
  return ref < lo ? tied[0]! : tied.at(-1)!;
}

/**
 * Cuántas acciones compra tu orden al precio de la subasta. Prioridad: primero las órdenes a mercado, luego las de
 * límite más alto; a igual precio, por orden de llegada (el orden de `orders`).
 */
export function myFill(orders: readonly AuctionOrder[], eq: Equilibrium): number {
  const buyers = orders
    .map((o, i) => ({ o, i }))
    .filter(({ o }) => o.side === 'buy' && (o.limit === null || o.limit >= eq.price - 1e-9))
    .sort(
      (a, b) =>
        (a.o.limit === null ? 0 : 1) - (b.o.limit === null ? 0 : 1) ||
        (b.o.limit ?? 0) - (a.o.limit ?? 0) ||
        a.i - b.i,
    );
  let left = eq.volume;
  for (const { o } of buyers) {
    const take = Math.min(left, o.qty);
    if (o.mine) return take;
    left -= take;
  }
  return 0;
}

/**
 * Tu orden: a mercado o con un precio máximo. `early`: la pusiste a las 8:30 y no la cambiaste, así que conserva su
 * prioridad por delante de la orden grande de las 8:59; si la cambias, vuelve a la cola (llega la última).
 */
export type MyOrder = { limit: number | null; early?: boolean };

const mineOrder = (mine: MyOrder): AuctionOrder => ({
  side: 'buy',
  qty: TARGET,
  limit: mine.limit,
  mine: true,
});

export const withMine = (orders: readonly AuctionOrder[], mine: MyOrder): AuctionOrder[] => [
  ...orders,
  mineOrder(mine),
];

export const ordersAt830 = (s: AuctionSetup) => s.book;
export const ordersAt859 = (s: AuctionSetup) => [...s.book, s.shock];
/** Todas las órdenes al cierre, en orden de llegada, con la tuya donde le toca. */
export const finalOrders = (s: AuctionSetup, mine: MyOrder): AuctionOrder[] =>
  mine.early ? [...s.book, mineOrder(mine), s.shock] : [...s.book, s.shock, mineOrder(mine)];

/** Precios entre los que puedes elegir tu límite: del indicativo − 3 a + 3 céntimos. */
export function limitChoices(setup: AuctionSetup, phase: 0 | 1): number[] {
  const base = equilibrium(phase === 0 ? ordersAt830(setup) : ordersAt859(setup), setup.ref).price;
  return Array.from({ length: 7 }, (_, i) => r2(base + (i - 3) * TICK));
}

export interface AuctionResult {
  ref: number;
  /** Precio indicativo a las 8:30, antes de tu orden. */
  ind: number;
  auction: number;
  volume: number;
  qty: number;
  filled: number;
  rest: number;
  /** Precio al que compras lo que falte, en el continuo. */
  cont: number;
  cost: number;
  avg: number;
  /** Subida de la apertura frente al cierre de ayer, en %. */
  pct: number;
  /** 0–1: 1 con la orden final más barata posible (± 2 €); 0 con la más cara. */
  score: number;
}

function outcome(setup: AuctionSetup, mine: MyOrder) {
  const orders = finalOrders(setup, mine);
  const eq = equilibrium(orders, setup.ref);
  const filled = myFill(orders, eq);
  const rest = TARGET - filled;
  const cont = r2(eq.price + CONT_PREMIUM);
  return { eq, filled, rest, cont, cost: r2(filled * eq.price + rest * cont) };
}

/** Las órdenes finales posibles: la de las 8:30 sin tocar, o una nueva a las 8:59 (a mercado o con límite). */
export const candidateOrders = (setup: AuctionSetup): MyOrder[] => [
  { limit: null, early: true },
  ...limitChoices(setup, 0).map((limit) => ({ limit, early: true })),
  { limit: null },
  ...limitChoices(setup, 1).map((limit) => ({ limit })),
];

export function auctionResult(setup: AuctionSetup, mine: MyOrder): AuctionResult {
  const o = outcome(setup, mine);
  const costs = candidateOrders(setup).map((c) => outcome(setup, c).cost);
  const best = Math.min(...costs);
  const worst = Math.max(...costs);
  const score =
    o.cost <= best + SCORE_SLACK
      ? 1
      : (worst - o.cost) / Math.max(worst - best - SCORE_SLACK, 0.01);
  return {
    ref: setup.ref,
    ind: equilibrium(ordersAt830(setup), setup.ref).price,
    auction: o.eq.price,
    volume: o.eq.volume,
    qty: TARGET,
    filled: o.filled,
    rest: o.rest,
    cont: o.cont,
    cost: o.cost,
    avg: Math.round((o.cost / TARGET) * 10_000) / 10_000,
    pct: r2((o.eq.price / setup.ref - 1) * 100),
    score: Math.round(Math.max(0, Math.min(1, score)) * 1000) / 1000,
  };
}

/** Cifras de la partida para la explicación y los ejercicios de la lección (marcadores {nombre}). */
export function auctionValues(r: AuctionResult): Record<string, number> {
  return {
    ref: r.ref,
    ind: r.ind,
    auction: r.auction,
    volume: r.volume,
    qty: r.qty,
    filled: r.filled,
    rest: r.rest,
    cont: r.cont,
    cost: r.cost,
    avg: r.avg,
    pct: r.pct,
  };
}
