import { describe, expect, it } from 'vitest';
import {
  atPar,
  bondResult,
  bondValues,
  price,
  priceAfter,
  required,
  setupBond,
  tirOptions,
  ytm,
  YEARS,
} from './bond-issue';

describe('La emisión de Naranjas', () => {
  it('precio y TIR: a la par si cupón = rentabilidad; por debajo si el cupón es menor', () => {
    expect(price(4.2, 4.2, 5)).toBeCloseTo(100, 8);
    expect(price(3, 4.2, 5)).toBeLessThan(100);
    expect(price(5, 4.2, 5)).toBeGreaterThan(100);
    expect(ytm(price(3, 4.2, 5), 3, 5)).toBeCloseTo(4.2, 6);
    // semilla 0: cupón del 3 % a 5 años al 4,2 % → 94,7
    expect(price(3, 4.2, 5)).toBeCloseTo(94.7, 1);
  });

  it('semilla 0: los inversores piden un 4,2 %; un año después, con +1 punto, el bono a la par vale 96,47', () => {
    const s = setupBond(0);
    expect(required(s)).toBe(4.2);
    expect(atPar(s, 4.2)).toBe(true);
    expect(atPar(s, 4.1)).toBe(true);
    expect(atPar(s, 4)).toBe(false);
    expect(priceAfter(s, 4.2)).toBeCloseTo(96.47, 2);
  });

  it('en todas las semillas hay un cupón a la par en la rejilla y tres opciones de TIR distintas', () => {
    for (let seed = 0; seed <= 40; seed++) {
      const s = setupBond(seed);
      expect(setupBond(seed)).toEqual(s);
      expect(atPar(s, required(s))).toBe(true);
      for (const c of [2, required(s), 6]) {
        const o = tirOptions(s, c);
        expect(new Set(o).size).toBe(3);
        expect(o).toContain(Math.round((required(s) + s.shock) * 100) / 100);
      }
      expect(priceAfter(s, required(s)) < 100).toBe(s.shock > 0);
    }
  });

  it('nota 40 / 30 / 30 y cifras para la lección', () => {
    const s = setupBond(0);
    const best = { coupon: 4.2, up: false, tir: 5.2 };
    expect(bondResult(s, best).score).toBe(1);
    expect(bondResult(s, { ...best, up: true }).score).toBe(0.7);
    expect(bondResult(s, { coupon: 3, up: true, tir: 3 }).score).toBe(0);
    const v = bondValues(s, best);
    expect(v.price_issue).toBe(100);
    expect(v.raised).toBe(20_000_000);
    expect(v.new_yield).toBe(5.2);
    expect(v.tir_buy).toBe(5.2);
    expect(v.price_after).toBeLessThan(100);
    expect(YEARS).toBe(5);
  });
});
