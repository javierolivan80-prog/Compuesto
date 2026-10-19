import { describe, expect, it } from 'vitest';
import {
  dollarOptions,
  eurReturn,
  fxResult,
  fxValues,
  hedged,
  rightCompare,
  setupFx,
  unhedged,
} from './fx-trip';

describe('El viaje del dólar', () => {
  it('semilla 0: 11.000 $, el ETF sube un 10 % pero el dólar cae y en euros solo ganas un 0,83 %', () => {
    const s = setupFx(0);
    expect(dollarOptions(s)).toEqual([9091, 10000, 11000]);
    expect(Math.round(unhedged(s))).toBe(10083);
    expect(eurReturn(s)).toBeCloseTo(0.833, 3);
    expect(rightCompare(s)).toBe('less');
    expect(Math.round(hedged(s))).toBe(10850);
  });

  it('si el dólar se aprecia (baja el EUR/USD), ganas más que el ETF', () => {
    const s = { ...setupFx(0), rate1: 1.0 };
    expect(rightCompare(s)).toBe('more');
  });

  it('en todas las semillas, tres opciones de dólares distintas y la comparación definida', () => {
    for (let seed = 0; seed <= 40; seed++) {
      const s = setupFx(seed);
      expect(setupFx(seed)).toEqual(s);
      expect(new Set(dollarOptions(s)).size).toBe(3);
      expect(Math.abs(eurReturn(s) - s.etf)).toBeGreaterThan(1);
    }
  });

  it('nota y cifras para la lección', () => {
    const s = setupFx(0);
    const best = { dollars: 11000, compare: 'less' as const, hedge: true };
    expect(fxResult(s, best).score).toBe(1);
    expect(fxResult(s, { ...best, hedge: false }).score).toBe(0.667);
    const v = fxValues(s, best);
    expect(v.usd_end).toBe(12100);
    expect(v.eur_end).toBe(10083);
    expect(v.hedged_return).toBe(8.5);
  });
});
