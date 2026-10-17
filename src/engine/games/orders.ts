import { gamesData } from '../../content/games-data';
import { marketBuy, marketSell, type Level } from '../orderbook';
import { mulberry32 } from '../prng';
import { addTally, emptyTally, makeResult, type GameResult } from './common';

/* Mesa de órdenes (juego 3): llegan clientes con peticiones; eliges el tipo de orden y la lanzas al libro. */

export type Intent = 'immediate' | 'cap' | 'auction';
export type OrderType = 'market' | 'limit' | 'auction';
export const ORDER_TYPES: readonly OrderType[] = ['market', 'limit', 'auction'];
export const ORDER_REQUESTS = 12;
const TICK = 0.05;

export interface OrderRequest {
  id: number;
  intent: Intent;
  side: 'buy' | 'sell';
  company: string;
  qty: number;
  text: string;
  /** Precio límite del cliente (solo `cap`). */
  cap: number | null;
  bids: Level[];
  asks: Level[];
  /** Precios entre los que elegir si se lanza una limitada (el correcto es `cap`). */
  limitOptions: number[];
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function orderRequests(
  seed: number,
  count = ORDER_REQUESTS,
  withAuction = true,
): OrderRequest[] {
  const rnd = mulberry32(seed);
  const intents: Intent[] = withAuction ? ['immediate', 'cap', 'auction'] : ['immediate', 'cap'];
  return Array.from({ length: count }, (_, id) => {
    // reparto equilibrado: cada tres peticiones salen los tres tipos, en orden aleatorio
    const intent = intents[(id + Math.floor(rnd() * intents.length)) % intents.length]!;
    const tpl = gamesData.ordenes.intents[intent];
    const t = tpl[Math.floor(rnd() * tpl.length)]!;
    const company =
      gamesData.ordenes.companies[Math.floor(rnd() * gamesData.ordenes.companies.length)]!;
    const qty = (1 + Math.floor(rnd() * 8)) * 50;
    const mid = r2(8 + Math.floor(rnd() * 400) * TICK);
    const half = r2(TICK * (1 + Math.floor(rnd() * 2)));
    const bestBid = r2(mid - half);
    const bestAsk = r2(mid + half);
    const bids: Level[] = Array.from({ length: 5 }, (_, k) => ({
      price: r2(bestBid - k * TICK),
      qty: 100 + Math.floor(rnd() * 5) * 50,
    }));
    const asks: Level[] = Array.from({ length: 5 }, (_, k) => ({
      price: r2(bestAsk + k * TICK),
      qty: 100 + Math.floor(rnd() * 5) * 50,
    }));
    let cap: number | null = null;
    let limitOptions: number[] = [];
    if (intent === 'cap') {
      if (t.side === 'buy') {
        // la limitada del cliente espera dentro del libro: un tick por encima de la mejor compra, por debajo de la venta
        cap = r2(bestBid + TICK);
        limitOptions = [cap, bestAsk, r2(cap - 4 * TICK)];
      } else {
        cap = r2(bestAsk - TICK);
        limitOptions = [cap, bestBid, r2(cap + 4 * TICK)];
      }
      // opciones en orden estable pero no siempre la correcta primero
      const shift = Math.floor(rnd() * 3);
      limitOptions = limitOptions.map((_, i) => limitOptions[(i + shift) % 3]!);
    }
    const text = t.text
      .replace('{q}', String(qty))
      .replace('{co}', company)
      .replace('{p}', cap !== null ? cap.toFixed(2).replace('.', ',') : '');
    return { id, intent, side: t.side, company, qty, text, cap, bids, asks, limitOptions };
  });
}

export interface OrderChoice {
  type: OrderType;
  /** Solo con `limit`. */
  limitPrice?: number;
}

export interface OrderOutcome {
  /** 0–1 de acierto (tipo 0,6 + precio 0,4 en las limitadas; tipo 1 en el resto). */
  raw: number;
  /** Lo que daría elegir al azar en esta petición. */
  chance: number;
  /** ¿Se ejecuta de inmediato? */
  executed: boolean;
  /** Precio medio de ejecución si se ejecutó. */
  price: number | null;
  /** ¿El cliente queda satisfecho? */
  satisfied: boolean;
  /** Mensaje para el cliente. */
  message: string;
  /** Concepto fallado, si lo hay. */
  missed: string | null;
}

const money = (n: number) => `${n.toFixed(2).replace('.', ',')} €`;

const CORRECT_TYPE: Record<Intent, OrderType> = {
  immediate: 'market',
  cap: 'limit',
  auction: 'auction',
};

export function chanceOf(intent: Intent): number {
  return intent === 'cap' ? (1 / 3) * (0.6 + 0.4 / 3) : 1 / 3;
}

export function resolveOrder(req: OrderRequest, choice: OrderChoice): OrderOutcome {
  const rightType = choice.type === CORRECT_TYPE[req.intent];
  const pricePart = req.intent === 'cap' && choice.type === 'limit';
  const priceOk =
    pricePart && choice.limitPrice !== undefined && Math.abs(choice.limitPrice - req.cap!) < 1e-9;
  const raw =
    req.intent === 'cap' ? (rightType ? 0.6 + (priceOk ? 0.4 : 0) : 0) : rightType ? 1 : 0;
  const chance = chanceOf(req.intent);
  const buy = req.side === 'buy';

  if (choice.type === 'auction') {
    return {
      raw,
      chance,
      executed: false,
      price: null,
      satisfied: req.intent === 'auction',
      message:
        req.intent === 'auction'
          ? 'Tu orden entra en la subasta y se casa con todas las demás al precio único: justo lo que quería el cliente.'
          : 'Tu orden espera a la subasta, pero el cliente la quería ya o con un precio concreto.',
      missed:
        req.intent === 'auction' ? null : req.intent === 'cap' ? 'orden-limitada' : 'orden-mercado',
    };
  }
  if (choice.type === 'market') {
    const fill = buy ? marketBuy(req.asks, req.qty) : marketSell(req.bids, req.qty);
    const price = fill.avgPrice;
    const breaks =
      req.intent === 'cap' &&
      price !== null &&
      (buy ? price > req.cap! + 1e-9 : price < req.cap! - 1e-9);
    const satisfied = req.intent === 'immediate' && fill.unfilled === 0;
    return {
      raw,
      chance,
      executed: fill.filled > 0,
      price,
      satisfied,
      message: satisfied
        ? `Ejecutada al momento a ${money(price!)} de media: el cliente quería asegurar la operación.`
        : breaks
          ? `Se ejecuta a ${money(price!)}, ${buy ? 'por encima de su máximo' : 'por debajo de su mínimo'} de ${money(req.cap!)}: la de mercado no garantiza el precio.`
          : 'La orden de mercado se ejecuta ya, pero el cliente quería otra cosa.',
      missed: satisfied ? null : req.intent === 'cap' ? 'orden-limitada' : 'subastas',
    };
  }
  // limitada
  const p = choice.limitPrice ?? req.cap ?? 0;
  const crosses = buy ? p >= req.asks[0]!.price : p <= req.bids[0]!.price;
  const satisfied = req.intent === 'cap' && priceOk;
  return {
    raw,
    chance,
    executed: crosses,
    price: crosses ? (buy ? req.asks[0]!.price : req.bids[0]!.price) : null,
    satisfied,
    message: satisfied
      ? `La limitada a ${money(p)} espera en el libro y no se ejecutará fuera del precio del cliente: precio garantizado, ejecución no.`
      : req.intent === 'immediate'
        ? 'La limitada se queda esperando en el libro: el cliente necesitaba ejecutar ya.'
        : req.intent === 'auction'
          ? 'Una limitada no es lo que pedía el cliente: quería el precio único de la subasta.'
          : crosses
            ? `A ${money(p)} la orden se cruza de inmediato y rompe el precio que el cliente había fijado.`
            : `A ${money(p)} la orden queda esperando, pero no es el precio que fijó el cliente.`,
    missed: satisfied
      ? null
      : req.intent === 'immediate'
        ? 'orden-mercado'
        : req.intent === 'auction'
          ? 'subastas'
          : 'orden-limitada',
  };
}

export function playOrders(
  seed: number,
  withAuction: boolean,
  choices: readonly (OrderChoice | null)[],
): GameResult {
  const reqs = orderRequests(seed, ORDER_REQUESTS, withAuction);
  let tally = emptyTally();
  const missed: string[] = [];
  let satisfied = 0;
  reqs.forEach((r, i) => {
    const c = choices[i];
    if (!c) {
      tally = addTally(tally, 0, chanceOf(r.intent));
      missed.push(
        r.intent === 'auction'
          ? 'subastas'
          : r.intent === 'cap'
            ? 'orden-limitada'
            : 'orden-mercado',
      );
      return;
    }
    const o = resolveOrder(r, c);
    tally = addTally(tally, o.raw, o.chance);
    if (o.satisfied) satisfied++;
    if (o.missed) missed.push(o.missed);
  });
  return makeResult(
    'mesa-ordenes',
    seed,
    tally,
    missed,
    gamesData.ordenes.learned,
    `${satisfied} de ${reqs.length} clientes quedaron satisfechos.`,
  );
}
