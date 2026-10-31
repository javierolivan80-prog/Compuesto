import { describe, expect, it } from 'vitest';
import { impulsiveMarket } from './impulsive';
import {
  breakeven,
  breakevenOptions,
  exitOf,
  result,
  resultOptions,
  setupStop,
  shares,
  sharesOptions,
  stopPrice,
  stopResult,
  stopValues,
  targetPrice,
  temptDay,
} from './stop-trade';

describe('El trader con stop (N5, variante de El trader impulsivo)', () => {
  it('reutiliza el mercado de El trader impulsivo', () => {
    expect(setupStop(7).market).toEqual(impulsiveMarket(7));
  });

  it('semilla 0: 100 acciones, acierto mínimo del 33,3 %, cierre del día 30 con +24 €', () => {
    const s = setupStop(0);
    expect(stopPrice(s)).toBe(19);
    expect(targetPrice(s)).toBe(22);
    expect(shares(s)).toBe(100);
    expect(sharesOptions(s)).toEqual([5, 100, 500]);
    expect(breakeven(s)).toBe(33.3);
    expect(breakevenOptions(s)).toEqual([33.3, 50, 66.7]);
    expect(exitOf(s)).toEqual({ outcome: 'close', day: 30, priceC: 2024 });
    expect(result(s)).toBe(24);
    expect(resultOptions(s)).toEqual([-100, 24, 200]);
  });

  it('en 10.000 semillas: opciones distintas con la buena, y salen los tres finales', () => {
    const outcomes = new Set<string>();
    for (let seed = 0; seed < 10_000; seed++) {
      const s = setupStop(seed);
      for (const [opts, right] of [
        [sharesOptions(s), shares(s)],
        [breakevenOptions(s), breakeven(s)],
        [resultOptions(s), result(s)],
      ] as const) {
        expect(new Set(opts).size).toBe(3);
        expect(opts).toContain(right);
      }
      outcomes.add(exitOf(s).outcome);
      const d = temptDay(s);
      expect(d).toBeGreaterThanOrEqual(1);
      expect(d).toBeLessThanOrEqual(exitOf(s).day);
    }
    expect(outcomes).toEqual(new Set(['stop', 'target', 'close']));
  });

  it('cifras para la lección: todo bien da 4 aciertos', () => {
    const s = setupStop(0);
    const v = stopValues(s, { shares: 100, breakeven: 33.3, result: 24, move: 'keep' });
    expect(v).toMatchObject({
      capital: 10_000,
      risk_pct: 1,
      risk_eur: 100,
      entry: 20,
      stop_pct: 5,
      stop: 19,
      rr: 2,
      target: 22,
      shares: 100,
      position: 2000,
      breakeven: 33.3,
      outcome: 2,
      exit_day: 30,
      exit_price: 20.24,
      result: 24,
      hits: 4,
    });
    expect(stopResult(s, { shares: 0, breakeven: 0, result: 0, move: 'lower' }).score).toBe(0);
  });
});
