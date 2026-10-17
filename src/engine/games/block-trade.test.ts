import { describe, expect, it } from 'vitest';
import {
  act,
  benchmarks,
  bestAsk,
  blockTradeResult,
  NEWS_AFTER_ROUND,
  remaining,
  resultValues,
  ROUNDS,
  setupBlockTrade,
  startBlockTrade,
  validQty,
} from './block-trade';

const setup = setupBlockTrade(7);

describe('la compra grande', () => {
  it('determinista por semilla; libro ordenado con horquilla positiva', () => {
    expect(setupBlockTrade(7)).toEqual(setup);
    const { asks, bids } = setup.book;
    for (let i = 1; i < asks.length; i++)
      expect(asks[i]!.price).toBeGreaterThan(asks[i - 1]!.price);
    expect(asks[0]!.price).toBeGreaterThan(bids[0]!.price);
    expect(setup.mid).toBeGreaterThan(bids[0]!.price);
    expect(setup.mid).toBeLessThan(asks[0]!.price);
  });

  it('comprar todo de golpe barre el libro: el precio medio sube con la cantidad (impacto)', () => {
    const small = act(startBlockTrade(setup), { type: 'market', qty: 50 });
    const all = act(startBlockTrade(setup), { type: 'market', qty: setup.target });
    expect(all.done).toBe(true);
    expect(all.cost / setup.target).toBeGreaterThan(small.cost / 50);
    expect(small.cost / 50).toBeCloseTo(setup.book.asks[0]!.price, 9);
  });

  it('trocear antes de la noticia sale más barato que todo de golpe; esperar a la noticia, más caro', () => {
    const { allNow, split } = benchmarks(setup);
    expect(split).toBeLessThan(allNow);
    let s = startBlockTrade(setup);
    for (let i = 0; i <= NEWS_AFTER_ROUND; i++) s = act(s, { type: 'wait' });
    expect(bestAsk(s.book)).toBeGreaterThan(bestAsk(setup.book) * (1 + setup.newsJump) - 0.011);
    s = act(s, { type: 'market', qty: remaining(s) });
    expect(s.cost).toBeGreaterThan(allNow);
    expect(blockTradeResult(s).score).toBeLessThan(0.5);
  });

  it('la limitada por debajo del mercado no se ejecuta; si el precio no baja, se queda pendiente', () => {
    const low = setup.book.bids[0]!.price;
    let s = act(startBlockTrade(setup), { type: 'limit', qty: 200, price: low });
    expect(s.bought).toBe(0);
    expect(s.resting).toEqual({ qty: 200, price: low });
    s = act(s, { type: 'wait' });
    expect(s.bought).toBe(0); // nadie vende tan barato
  });

  it('la limitada al mejor precio de venta compra lo que hay a ese precio', () => {
    const a0 = setup.book.asks[0]!;
    const s = act(startBlockTrade(setup), { type: 'limit', qty: 400, price: a0.price });
    expect(s.bought).toBe(a0.qty);
    expect(s.resting?.qty).toBe(400 - a0.qty);
    const next = act(s, { type: 'wait' }); // vuelve liquidez a ese precio y se ejecuta parte de lo pendiente
    expect(next.bought).toBeGreaterThan(s.bought);
  });

  it('si se acaba el tiempo, el cliente exige completar a mercado (compra forzada)', () => {
    let s = startBlockTrade(setup);
    for (let i = 0; i < ROUNDS; i++) s = act(s, { type: 'wait' });
    expect(s.done).toBe(true);
    expect(s.bought).toBe(setup.target);
    expect(s.forced).toBe(setup.target);
    expect(blockTradeResult(s).forced).toBe(setup.target);
  });

  it('cantidades no válidas no cambian nada; tras terminar tampoco', () => {
    const s0 = startBlockTrade(setup);
    expect(validQty(s0, 0)).toBe(false);
    expect(validQty(s0, 601)).toBe(false);
    expect(act(s0, { type: 'market', qty: 0 })).toBe(s0);
    expect(act(s0, { type: 'limit', qty: 10, price: 0 })).toBe(s0);
    const done = act(s0, { type: 'market', qty: 600 });
    expect(act(done, { type: 'market', qty: 1 })).toBe(done);
  });

  it('resultado: precio medio, impacto frente al punto medio y nota 1 si troceas', () => {
    let s = startBlockTrade(setup);
    s = act(s, { type: 'market', qty: 300 });
    s = act(s, { type: 'market', qty: remaining(s) });
    const r = blockTradeResult(s);
    expect(r.avg).toBeCloseTo(s.cost / 600, 2);
    expect(r.impact).toBeCloseTo(s.cost - 600 * setup.mid, 2);
    expect(r.impact).toBeGreaterThan(0);
    expect(r.score).toBe(1);
    expect(resultValues(r)).toEqual({
      qty: 600,
      avg: r.avg,
      mid: r.mid,
      cost: r.cost,
      impact: r.impact,
      spread: r.spread,
    });
  });

  it('todo de golpe puntúa 0,5', () => {
    const r = blockTradeResult(act(startBlockTrade(setup), { type: 'market', qty: 600 }));
    expect(r.score).toBe(0.5);
  });
});
