/* Libro de órdenes didáctico: horquilla, ejecución de órdenes a mercado y precio de subasta. Pura y sin dependencias. */

export interface Level {
  price: number;
  qty: number;
}

export interface Fill {
  price: number;
  qty: number;
}

export interface MarketFill {
  fills: Fill[];
  filled: number;
  unfilled: number;
  cost: number;
  /** Precio medio de ejecución; null si no se ejecutó nada. */
  avgPrice: number | null;
  /** Precio del último tramo ejecutado; null si no se ejecutó nada. */
  lastPrice: number | null;
}

/** Horquilla (spread) = mejor precio de venta − mejor precio de compra. */
export function spread(bid: number, ask: number): number {
  if (ask < bid) throw new RangeError('El precio de venta no puede ser menor que el de compra');
  return ask - bid;
}

function sweep(levels: readonly Level[], qty: number): MarketFill {
  if (qty < 0) throw new RangeError('La cantidad no puede ser negativa');
  const fills: Fill[] = [];
  let left = qty;
  for (const l of levels) {
    if (left <= 0) break;
    const take = Math.min(left, l.qty);
    if (take > 0) fills.push({ price: l.price, qty: take });
    left -= take;
  }
  const filled = qty - left;
  const cost = fills.reduce((s, f) => s + f.price * f.qty, 0);
  return {
    fills,
    filled,
    unfilled: left,
    cost,
    avgPrice: filled > 0 ? cost / filled : null,
    lastPrice: fills.length ? fills[fills.length - 1]!.price : null,
  };
}

/** Compra a mercado: consume los niveles de venta (ordenados de menor a mayor precio). */
export function marketBuy(asks: readonly Level[], qty: number): MarketFill {
  return sweep(
    [...asks].sort((a, b) => a.price - b.price),
    qty,
  );
}

/** Venta a mercado: consume los niveles de compra (de mayor a menor precio). */
export function marketSell(bids: readonly Level[], qty: number): MarketFill {
  return sweep(
    [...bids].sort((a, b) => b.price - a.price),
    qty,
  );
}

/** Compra limitada: solo ejecuta en niveles de venta con precio ≤ límite. */
export function limitBuy(asks: readonly Level[], qty: number, limit: number): MarketFill {
  return sweep(
    [...asks].filter((l) => l.price <= limit).sort((a, b) => a.price - b.price),
    qty,
  );
}

export interface AuctionOrder {
  /** Precio límite */
  price: number;
  qty: number;
}

export interface AuctionResult {
  price: number;
  volume: number;
}

/**
 * Precio de subasta: el que maximiza el volumen ejecutable. Empates: menor desequilibrio entre lo que
 * se compraría y lo que se vendería y, después, el más cercano al precio de referencia (si se da).
 */
export function auctionPrice(
  buys: readonly AuctionOrder[],
  sells: readonly AuctionOrder[],
  reference?: number,
): AuctionResult | null {
  const candidates = [...new Set([...buys, ...sells].map((o) => o.price))].sort((a, b) => a - b);
  let best: { price: number; volume: number; imbalance: number } | null = null;
  for (const p of candidates) {
    const demand = buys.filter((o) => o.price >= p).reduce((s, o) => s + o.qty, 0);
    const supply = sells.filter((o) => o.price <= p).reduce((s, o) => s + o.qty, 0);
    const volume = Math.min(demand, supply);
    if (volume <= 0) continue;
    const imbalance = Math.abs(demand - supply);
    const better =
      !best ||
      volume > best.volume ||
      (volume === best.volume && imbalance < best.imbalance) ||
      (volume === best.volume &&
        imbalance === best.imbalance &&
        reference !== undefined &&
        Math.abs(p - reference) < Math.abs(best.price - reference));
    if (better) best = { price: p, volume, imbalance };
  }
  return best ? { price: best.price, volume: best.volume } : null;
}
