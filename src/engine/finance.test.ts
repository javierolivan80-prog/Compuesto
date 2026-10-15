import { describe, expect, it } from 'vitest';
import {
  compoundValueAt,
  doublingYearsExact,
  doublingYearsRule72,
  inflatedPrice,
  presentValue,
  taeFromTin,
  monthlyPayment,
  amortizationSchedule,
  totalInterest,
  depositChain,
  marketCap,
  capWeightedIndex,
  freeFloatShares,
  maxDeposits,
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
  it('TAE a partir del TIN', () => {
    expect(taeFromTin(12, 1)).toBeCloseTo(12, 9);
    expect(taeFromTin(12, 12)).toBeCloseTo(12.6825, 4);
    expect(taeFromTin(6, 2)).toBeCloseTo(6.09, 9);
    expect(taeFromTin(0, 12)).toBe(0);
    expect(() => taeFromTin(5, 0)).toThrow(RangeError);
    expect(() => taeFromTin(5, 1.5)).toThrow(RangeError);
  });
  it('cuota y cuadro de amortización francés', () => {
    expect(monthlyPayment(120000, 3, 25)).toBeCloseTo(569.05, 2);
    expect(monthlyPayment(12000, 0, 1)).toBe(1000);
    expect(() => monthlyPayment(1000, 3, 0)).toThrow(RangeError);
    const rows = amortizationSchedule(100000, 3, 20);
    expect(rows).toHaveLength(240);
    expect(rows[0]!.interest).toBeCloseTo(250, 9);
    expect(rows[0]!.capital).toBeCloseTo(304.6, 1);
    expect(rows[239]!.balance).toBe(0);
    // el capital amortizado suma el principal y el interés baja cada mes
    expect(rows.reduce((s, r) => s + r.capital, 0)).toBeCloseTo(100000, 6);
    for (let i = 1; i < rows.length; i++)
      expect(rows[i]!.interest).toBeLessThan(rows[i - 1]!.interest);
    expect(totalInterest(100000, 3, 20)).toBeCloseTo(
      rows.reduce((s, r) => s + r.payment, 0) - 100000,
      6,
    );
    expect(totalInterest(10000, 0, 2)).toBeCloseTo(0, 9);
  });
  it('cadena de depósitos del modelo escolar', () => {
    const rows = depositChain(1000, 10, 4);
    expect(rows.map((r) => r.deposit)).toEqual(
      [1000, 900, 810, 729].map((x) => expect.closeTo(x, 9)),
    );
    expect(rows[0]!.reserve).toBeCloseTo(100, 9);
    expect(rows[0]!.loan).toBeCloseTo(900, 9);
    expect(rows[3]!.cumulative).toBeCloseTo(3439, 9);
    expect(maxDeposits(1000, 10)).toBe(10000);
    expect(depositChain(1000, 10, 200)[199]!.cumulative).toBeCloseTo(10000, 3);
    expect(() => depositChain(1000, 0, 3)).toThrow(RangeError);
    expect(() => maxDeposits(1000, 101)).toThrow(RangeError);
  });
  it('capitalización y free float', () => {
    expect(marketCap(10, 12_000_000)).toBe(120_000_000);
    expect(freeFloatShares(12_000_000, 40)).toBe(4_800_000);
    expect(marketCap(10, freeFloatShares(12_000_000, 40))).toBe(48_000_000);
    expect(freeFloatShares(100, 0)).toBe(0);
    expect(() => marketCap(-1, 10)).toThrow(RangeError);
    expect(() => freeFloatShares(100, 101)).toThrow(RangeError);
  });
  it('índice ponderado por capitalización', () => {
    const { rows, returnPct } = capWeightedIndex([
      { name: 'A', cap: 100, returnPct: 10 },
      { name: 'B', cap: 50, returnPct: -10 },
      { name: 'C', cap: 50, returnPct: 0 },
    ]);
    expect(rows.map((r) => r.weightPct)).toEqual([50, 25, 25]);
    expect(rows[0]!.contributionPp).toBeCloseTo(5, 9);
    expect(rows[1]!.contributionPp).toBeCloseTo(-2.5, 9);
    expect(returnPct).toBeCloseTo(2.5, 9);
    expect(() => capWeightedIndex([])).toThrow(RangeError);
    expect(() => capWeightedIndex([{ name: 'X', cap: 0, returnPct: 1 }])).toThrow(RangeError);
  });
});
