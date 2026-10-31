import { describe, expect, it } from 'vitest';
import {
  cvarOptions,
  cvarPct,
  expected,
  expectedOptions,
  machineResult,
  machineValues,
  setupMachine,
  varEur,
  varOptions,
  varPct,
  worstLosses,
  zone,
} from './time-machine';

describe('Máquina del tiempo (N6)', () => {
  it('semilla 0: VaR al 99 % de 23.300 €, CVaR del 7 %, 2,5 excepciones esperadas y zona roja', () => {
    const s = setupMachine(0);
    expect(varPct(s)).toBe(2.33);
    expect(varEur(s)).toBe(23_300);
    expect(varOptions(s)).toEqual([10_000, 16_500, 23_300]);
    expect(cvarPct(s)).toBe(7);
    expect(cvarOptions(s)).toEqual([2.33, 7, 9]);
    expect(expected(s)).toBe(2.5);
    expect(expectedOptions(s)).toEqual([1, 2.5, 12]);
    expect(zone(s)).toBe('red');
  });

  it('en 10.000 semillas: opciones distintas, pérdidas por encima del VaR y las tres crisis', () => {
    const crises = new Set<string>();
    for (let seed = 0; seed < 10_000; seed++) {
      const s = setupMachine(seed);
      for (const [opts, right] of [
        [varOptions(s), varEur(s)],
        [cvarOptions(s), cvarPct(s)],
        [expectedOptions(s), expected(s)],
      ] as const) {
        expect(new Set(opts).size).toBe(3);
        expect(opts).toContain(right);
      }
      expect(Math.min(...worstLosses(s))).toBeGreaterThan(varPct(s));
      crises.add(s.crisis);
    }
    expect(crises).toEqual(new Set(['2000', '2012', '2020']));
  });

  it('cifras para la lección: todo bien da 4 aciertos', () => {
    const s = setupMachine(0);
    const v = machineValues(s, { var: 23_300, cvar: 7, expected: 2.5, move: 'hold' });
    expect(v).toMatchObject({
      value: 1_000_000,
      sigma: 1,
      conf: 99,
      z: 2.33,
      var_pct: 2.33,
      var_eur: 23_300,
      worst: 9,
      cvar_pct: 7,
      cvar_eur: 70_000,
      days: 250,
      expected: 2.5,
      observed: 12,
      hits: 4,
    });
    expect(machineResult(s, { var: 0, cvar: 0, expected: 0, move: 'sell' }).score).toBe(0);
  });
});
