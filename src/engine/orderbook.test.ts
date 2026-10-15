import { describe, expect, it } from 'vitest';
import { auctionPrice, limitBuy, marketBuy, marketSell, spread } from './orderbook';

const asks = [
  { price: 10.02, qty: 300 },
  { price: 10.03, qty: 500 },
  { price: 10.05, qty: 1000 },
];
const bids = [
  { price: 10.0, qty: 400 },
  { price: 9.99, qty: 600 },
];

describe('libro de órdenes', () => {
  it('horquilla', () => {
    expect(spread(10.0, 10.02)).toBeCloseTo(0.02, 9);
    expect(() => spread(10.1, 10.0)).toThrow(RangeError);
  });
  it('compra a mercado consume niveles y mueve el precio', () => {
    const f = marketBuy(asks, 600);
    expect(f.fills).toEqual([
      { price: 10.02, qty: 300 },
      { price: 10.03, qty: 300 },
    ]);
    expect(f.cost).toBeCloseTo(300 * 10.02 + 300 * 10.03, 9);
    expect(f.avgPrice).toBeCloseTo(10.025, 9);
    expect(f.lastPrice).toBe(10.03);
    expect(f.unfilled).toBe(0);
  });
  it('si no hay suficiente, queda sin ejecutar', () => {
    const f = marketBuy(asks, 2000);
    expect(f.filled).toBe(1800);
    expect(f.unfilled).toBe(200);
    expect(marketBuy([], 10).avgPrice).toBeNull();
  });
  it('venta a mercado empieza por la mejor compra', () => {
    const f = marketSell(bids, 500);
    expect(f.fills).toEqual([
      { price: 10.0, qty: 400 },
      { price: 9.99, qty: 100 },
    ]);
    expect(f.lastPrice).toBe(9.99);
  });
  it('compra limitada no supera el límite', () => {
    const f = limitBuy(asks, 1000, 10.03);
    expect(f.filled).toBe(800);
    expect(f.unfilled).toBe(200);
    expect(f.lastPrice).toBe(10.03);
    expect(limitBuy(asks, 100, 10.0).filled).toBe(0);
  });
  it('subasta: el precio que maximiza el volumen', () => {
    const buys = [
      { price: 10.3, qty: 100 },
      { price: 10.2, qty: 200 },
      { price: 10.1, qty: 300 },
    ];
    const sells = [
      { price: 10.0, qty: 150 },
      { price: 10.1, qty: 250 },
      { price: 10.3, qty: 400 },
    ];
    // a 10,10: demanda 600, oferta 400 → 400; a 10,20: demanda 300, oferta 400 → 300; a 10,00: oferta 150
    expect(auctionPrice(buys, sells)).toEqual({ price: 10.1, volume: 400 });
    expect(auctionPrice([{ price: 9, qty: 10 }], [{ price: 10, qty: 10 }])).toBeNull();
  });
  it('subasta: el empate de volumen se resuelve por menor desequilibrio y luego por la referencia', () => {
    const buys = [{ price: 10.2, qty: 100 }];
    const sells = [{ price: 10.0, qty: 100 }];
    // a 10,00 y a 10,20 se ejecutan 100 con desequilibrio 0: gana la más cercana a la referencia
    expect(auctionPrice(buys, sells, 10.18)).toEqual({ price: 10.2, volume: 100 });
    expect(auctionPrice(buys, sells, 10.01)).toEqual({ price: 10.0, volume: 100 });
  });
});
