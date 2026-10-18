import { describe, expect, it } from 'vitest';
import {
  auctionResult,
  auctionValues,
  candidateOrders,
  CONT_PREMIUM,
  equilibrium,
  finalOrders,
  limitChoices,
  myFill,
  ordersAt830,
  ordersAt859,
  setupAuction,
  TARGET,
  withMine,
  type AuctionOrder,
} from './opening-auction';

const o = (side: 'buy' | 'sell', qty: number, limit: number | null): AuctionOrder => ({
  side,
  qty,
  limit,
});

describe('precio de subasta', () => {
  it('el ejemplo de la lección n1-u4-l4: casa a 10,10 € con 400 acciones', () => {
    const orders = [
      o('buy', 100, 10.3),
      o('buy', 200, 10.2),
      o('buy', 300, 10.1),
      o('sell', 150, 10),
      o('sell', 250, 10.1),
      o('sell', 400, 10.3),
    ];
    expect(equilibrium(orders, 10.1)).toEqual({ price: 10.1, volume: 400, imbalance: 200 });
  });
  it('reglas de BME en orden: volumen, desequilibrio, lado con más volumen y último precio', () => {
    // (2) mismo volumen a 10 y a 11: a 10 sobran 200 de compra, a 11 no sobra nada → 11
    const a = [o('buy', 200, 10), o('buy', 100, 11), o('sell', 100, 9), o('sell', 0, 11)];
    expect(equilibrium(a, 10).price).toBe(11);
    // (3) mismo volumen y desequilibrio, y en todos sobra demanda → el más alto
    const up = [o('buy', 200, 11), o('sell', 100, 10)];
    expect(equilibrium(up, 10).price).toBe(11);
    // …y si en todos sobra oferta → el más bajo
    const down = [o('buy', 100, 11), o('sell', 200, 10)];
    expect(equilibrium(down, 11).price).toBe(10);
    // (4) sin desequilibrio: el último precio negociado si está entre los empatados; si no, el más cercano
    const flat = [o('buy', 100, 11), o('sell', 100, 10)];
    expect(equilibrium(flat, 10.9)).toEqual({ price: 10.9, volume: 100, imbalance: 0 });
    expect(equilibrium(flat, 12).price).toBe(11);
    expect(equilibrium(flat, 9).price).toBe(10);
  });
  it('solo órdenes a mercado: casa al precio de referencia', () => {
    expect(equilibrium([o('buy', 50, null), o('sell', 80, null)], 9.5)).toEqual({
      price: 9.5,
      volume: 50,
      imbalance: -30,
    });
  });
  it('prioridad: a mercado antes que las limitadas; a igual límite, por orden de llegada', () => {
    const orders = [o('buy', 300, 10), o('sell', 350, 10)];
    const mkt = withMine(orders, { limit: null });
    const eq = equilibrium(mkt, 10);
    expect(eq.volume).toBe(350);
    expect(myFill(mkt, eq)).toBe(350); // la de mercado (500) va primero y se lleva todo
    const same = withMine(orders, { limit: 10 });
    expect(myFill(same, equilibrium(same, 10))).toBe(50); // a 10 €, detrás de las 300 que ya estaban
    const low = withMine(orders, { limit: 9.99 });
    expect(myFill(low, equilibrium(low, 10))).toBe(0);
  });
});

describe('prioridad de tu orden frente a la de las 8:59', () => {
  it('si no la cambias, va por delante de la orden grande al mismo precio; si la cambias, detrás', () => {
    const setup = {
      seed: 0,
      ref: 10,
      book: [o('sell', 600, 10)],
      shock: o('buy', 400, 10.05),
    };
    const mine = { limit: 10.05 };
    const early = finalOrders(setup, { ...mine, early: true });
    const eq = equilibrium(early, setup.ref);
    expect(eq).toMatchObject({ price: 10.05, volume: 600 });
    expect(myFill(early, eq)).toBe(500);
    const late = finalOrders(setup, mine);
    expect(myFill(late, equilibrium(late, setup.ref))).toBe(200);
  });
});

describe('la subasta de apertura (partida)', () => {
  it('determinista; buenas noticias de madrugada: el indicativo abre entre un 1 % y un 2,5 % sobre el cierre', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const s = setupAuction(seed);
      expect(setupAuction(seed)).toEqual(s);
      const ind = equilibrium(ordersAt830(s), s.ref).price;
      expect(ind / s.ref - 1).toBeGreaterThan(0.005);
      expect(ind / s.ref - 1).toBeLessThan(0.03);
      expect(limitChoices(s, 1)).toHaveLength(7);
    }
  });
  it('la orden grande de las 8:59 mueve el indicativo en su dirección', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const s = setupAuction(seed);
      const before = equilibrium(ordersAt830(s), s.ref).price;
      const after = equilibrium(ordersAt859(s), s.ref).price;
      if (s.shock.side === 'buy') expect(after).toBeGreaterThanOrEqual(before);
      else expect(after).toBeLessThanOrEqual(before);
    }
  });
  it('a mercado siempre compras las 500 en la subasta y sacas la mejor nota; con un límite muy bajo, ninguna', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const s = setupAuction(seed);
      const mkt = auctionResult(s, { limit: null });
      expect(mkt.filled).toBe(TARGET);
      expect(mkt.score).toBe(1);
      const low = auctionResult(s, { limit: limitChoices(s, 1)[0]! });
      expect(low.filled).toBe(0);
      expect(low.cont).toBeCloseTo(low.auction + CONT_PREMIUM, 9);
      expect(low.cost).toBeGreaterThan(mkt.cost);
      expect(low.score).toBeLessThan(0.5);
    }
  });
  it('dejar la limitada en el indicativo de las 8:30 sale peor si la orden grande es de compra', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const s = setupAuction(seed);
      if (s.shock.side !== 'buy') continue;
      const stay = auctionResult(s, { limit: equilibrium(ordersAt830(s), s.ref).price });
      expect(stay.filled).toBeLessThan(TARGET);
      expect(stay.score).toBeLessThan(1);
    }
  });
  it('resultado coherente: coste = compradas × apertura + resto × continuo; cifras para la lección', () => {
    const s = setupAuction(1);
    for (const c of candidateOrders(s)) {
      const r = auctionResult(s, c);
      expect(r.filled + r.rest).toBe(TARGET);
      expect(r.cost).toBeCloseTo(r.filled * r.auction + r.rest * r.cont, 2);
      expect(r.avg).toBeCloseTo(r.cost / TARGET, 4);
      expect(r.pct).toBeCloseTo((r.auction / r.ref - 1) * 100, 2);
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(1);
    }
    const v = auctionValues(auctionResult(s, { limit: null }));
    expect(Object.keys(v).sort()).toEqual(
      [
        'auction',
        'avg',
        'cont',
        'cost',
        'filled',
        'ind',
        'pct',
        'qty',
        'ref',
        'rest',
        'volume',
      ].sort(),
    );
  });
});
