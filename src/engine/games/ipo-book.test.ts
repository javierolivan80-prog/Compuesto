import { describe, expect, it } from 'vitest';
import companies from '../../../content/shared/companies.json';
import {
  bestPrice,
  coverage,
  demandAt,
  firstDayClose,
  FAMILY_BEFORE,
  ipoResult,
  ipoValues,
  NEW_SHARES,
  OFFER,
  outcomeAt,
  PRICES,
  SHARES_AFTER,
  setupIpo,
  SOLD_SHARES,
} from './ipo-book';

describe('la salida a bolsa', () => {
  it('cuadra con el universo: 12.000.000 de acciones después y un 35 % de free float', () => {
    const nar = (companies as { id: string; sharesOutstanding?: number }[]).find(
      (c) => c.id === 'naranjas-del-turia',
    );
    expect(SHARES_AFTER).toBe(nar?.sharesOutstanding);
    expect(((NEW_SHARES + SOLD_SHARES) / SHARES_AFTER) * 100).toBeCloseTo(35, 9);
    expect(ipoResult(setupIpo(1), 10).family).toBe(65);
    expect(FAMILY_BEFORE - SOLD_SHARES).toBe(7_800_000);
  });

  it('rango de 9,00 a 10,50 € de 0,25 en 0,25; la demanda baja con el precio', () => {
    expect(PRICES).toEqual([9, 9.25, 9.5, 9.75, 10, 10.25, 10.5]);
    for (let seed = 1; seed <= 40; seed++) {
      const s = setupIpo(seed);
      expect(setupIpo(seed)).toEqual(s);
      for (let i = 1; i < PRICES.length; i++)
        expect(demandAt(s, PRICES[i]!)).toBeLessThan(demandAt(s, PRICES[i - 1]!));
      expect(demandAt(s, 9) % 50_000).toBe(0);
    }
  });

  it('el estreno: a más demanda sobrante, más sube; siempre hay un precio bueno y es el más alto que no rompe', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const s = setupIpo(seed);
      expect(firstDayClose(s, 9)).toBeGreaterThan(firstDayClose(s, 10));
      const best = bestPrice(s);
      expect(best).not.toBeNull();
      expect(outcomeAt(s, best!)).toBe('good');
      for (const p of PRICES.filter((x) => x > best!)) expect(outcomeAt(s, p)).not.toBe('good');
      expect(ipoResult(s, best!).score).toBe(1);
    }
  });

  it('resultados: no cubierta, estreno por debajo, dinero en la mesa y bien', () => {
    const s = setupIpo(1);
    expect(coverage(s, 10.5)).toBeLessThan(1);
    expect(ipoResult(s, 10.5)).toMatchObject({ outcome: 'failed', score: 0, first: 0, pop: 0 });
    expect(ipoResult(s, 10.25)).toMatchObject({ outcome: 'broke', score: 0.25 });
    expect(ipoResult(s, 9)).toMatchObject({ outcome: 'table', score: 0.5 });
    expect(ipoResult(s, 10)).toMatchObject({ outcome: 'good', score: 1 });
    expect(ipoResult(s, 9.5)).toMatchObject({ outcome: 'good', score: 0.75 });
  });

  it('cifras: OPS para la empresa, OPV para la familia, veces cubierta y subida del estreno', () => {
    const s = setupIpo(1);
    const r = ipoResult(s, 10);
    expect(r.opsCash).toBe(30_000_000);
    expect(r.opvCash).toBe(12_000_000);
    expect(r.offer).toBe(OFFER);
    expect(r.cov).toBeCloseTo(r.demand / OFFER, 2);
    expect(r.pop).toBeCloseTo((r.first / 10 - 1) * 100, 2);
    expect(Object.keys(ipoValues(r)).sort()).toEqual(
      [
        'cov',
        'demand',
        'family',
        'first',
        'new_shares',
        'offer',
        'ops_cash',
        'opv_cash',
        'pop',
        'price',
        'shares_after',
        'sold_shares',
      ].sort(),
    );
  });
});
