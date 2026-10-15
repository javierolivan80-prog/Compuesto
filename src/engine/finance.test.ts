import { describe, expect, it } from 'vitest';
import {
  compoundValueAt,
  doublingYearsExact,
  doublingYearsRule72,
  inflatedPrice,
  presentValue,
  purchasingPower,
  realReturnPct,
  simpleValue,
} from './finance';

describe('finanzas básicas', () => {
  it('interés simple y compuesto (ejemplos de la Unidad 1)', () => {
    expect(simpleValue(1000, 5, 3)).toBeCloseTo(1150, 9);
    expect(compoundValueAt(1000, 5, 3)).toBeCloseTo(1157.625, 9);
    expect(compoundValueAt(2000, 4, 5)).toBeCloseTo(2433.3058, 4);
    expect(compoundValueAt(1000, 5, 0)).toBe(1000);
  });
  it('inflación y poder adquisitivo', () => {
    expect(inflatedPrice(100, 3, 2)).toBeCloseTo(106.09, 9);
    expect(inflatedPrice(500, 4, 2)).toBeCloseTo(540.8, 9);
    expect(purchasingPower(100, 3, 10)).toBeCloseTo(74.4094, 4);
  });
  it('regla del 72 vs tiempo exacto', () => {
    expect(doublingYearsRule72(6)).toBe(12);
    expect(doublingYearsExact(6)).toBeCloseTo(11.8957, 4);
    // la aproximación se queda a menos de 0,35 años entre el 4 % y el 12 %
    for (const r of [4, 6, 8, 10, 12])
      expect(Math.abs(doublingYearsRule72(r) - doublingYearsExact(r))).toBeLessThan(0.35);
    expect(() => doublingYearsRule72(0)).toThrow(RangeError);
    expect(() => doublingYearsExact(-1)).toThrow(RangeError);
  });
  it('rentabilidad real y valor actual', () => {
    expect(realReturnPct(2, 3)).toBeCloseTo(-0.9709, 4);
    expect(realReturnPct(5, 0)).toBeCloseTo(5, 9);
    expect(presentValue(1102.5, 5, 2)).toBeCloseTo(1000, 9);
    expect(presentValue(1215.51, 5, 4)).toBeCloseTo(1000.003, 3);
  });
});
