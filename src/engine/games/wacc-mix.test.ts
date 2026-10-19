import { describe, expect, it } from 'vitest';
import model from '../../../content/shared/models/naranjas-del-turia-dcf.json';
import {
  bestWeight,
  costOfDebt,
  costOfEquity,
  CURRENT,
  leveredBeta,
  setupWacc,
  waccAt,
  waccResult,
  waccValues,
  WEIGHTS,
} from './wacc-mix';

describe('la mezcla de la financiación', () => {
  it('la semilla 0 reproduce el WACC del modelo DCF de referencia de Naranjas', () => {
    const s = setupWacc(0);
    const a = model.assumptions.wacc;
    expect(s.rf / 100).toBeCloseTo(a.riskFree, 6);
    expect(s.betaU).toBe(a.unleveredBeta);
    expect(leveredBeta(s, CURRENT)).toBeCloseTo(model.wacc.leveredBeta, 4);
    expect(costOfEquity(s, CURRENT) / 100).toBeCloseTo(model.wacc.costOfEquity, 5);
    expect(waccAt(s, CURRENT) / 100).toBeCloseTo(model.wacc.wacc, 5);
  });

  it('determinista y con forma de U: baja con algo de deuda y sube con mucha', () => {
    for (let seed = 0; seed <= 40; seed++) {
      const s = setupWacc(seed);
      expect(setupWacc(seed)).toEqual(s);
      const b = bestWeight(s);
      expect(b).toBeGreaterThan(0);
      expect(b).toBeLessThan(70);
      expect(waccAt(s, b)).toBeLessThan(waccAt(s, 0));
      expect(waccAt(s, b)).toBeLessThan(waccAt(s, 70));
      for (const w of WEIGHTS) expect(waccAt(s, w)).toBeGreaterThanOrEqual(waccAt(s, b));
    }
  });

  it('más deuda sube la beta y el coste del capital propio; el de la deuda sube pasado el umbral', () => {
    const s = setupWacc(0);
    expect(leveredBeta(s, 0)).toBe(s.betaU);
    expect(costOfEquity(s, 40)).toBeGreaterThan(costOfEquity(s, 20));
    expect(costOfDebt(s, 30)).toBe(s.kd0);
    expect(costOfDebt(s, 50)).toBeGreaterThan(costOfDebt(s, 40));
  });

  it('nota: 30 % por la beta y 70 % por la estructura', () => {
    const s = setupWacc(0);
    const best = bestWeight(s);
    expect(waccResult(s, true, best).score).toBe(1);
    expect(waccResult(s, false, best).score).toBe(0.7);
    expect(waccResult(s, true, 70).score).toBeLessThan(0.5);
    const v = waccValues(s, waccResult(s, true, best));
    expect(v.wacc).toBeCloseTo(8.2713, 3);
    expect(v.best).toBe(best);
  });
});
