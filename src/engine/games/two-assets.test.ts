import { describe, expect, it } from 'vitest';
import {
  alpha,
  alphaOptions,
  beta,
  cml,
  cmlOptions,
  minVarOptions,
  minVarWeight,
  portVol,
  setupTwo,
  twoResult,
  twoValues,
  volOptions,
} from './two-assets';

describe('La cartera de dos activos (N6)', () => {
  it('semilla 0: volatilidad del 13,02 %, mínima varianza con un 8 % en acciones, CML del 5,75 % y alfa del 2,8 %', () => {
    const s = setupTwo(0);
    expect(portVol(s)).toBe(13.02);
    expect(volOptions(s)).toEqual([12.42, 13.02, 15.2]);
    expect(minVarWeight(s)).toBe(8);
    expect(minVarOptions(s)).toEqual([8, 28.6, 50]);
    expect(cml(s)).toBe(5.75);
    expect(cmlOptions(s)).toEqual([5.25, 5.75, 8.67]);
    expect(beta(s)).toBe(1.2);
    expect(alpha(s)).toBe(2.8);
    expect(alphaOptions(s)).toEqual([2.8, 4, 6.4]);
  });

  it('la cartera de mínima varianza tiene menos volatilidad que sus vecinas y que el activo menos volátil', () => {
    for (let seed = 0; seed < 300; seed++) {
      const s = setupTwo(seed);
      const w = minVarWeight(s) / 100;
      const v = portVol(s, w);
      expect(v).toBeLessThanOrEqual(portVol(s, w + 0.01) + 1e-9);
      expect(v).toBeLessThanOrEqual(portVol(s, w - 0.01) + 1e-9);
      expect(v).toBeLessThanOrEqual(Math.min(s.sA, s.sB) + 1e-9);
    }
  });

  it('en 10.000 semillas: opciones distintas con la buena', () => {
    for (let seed = 0; seed < 10_000; seed++) {
      const s = setupTwo(seed);
      for (const [opts, right] of [
        [volOptions(s), portVol(s)],
        [minVarOptions(s), minVarWeight(s)],
        [cmlOptions(s), cml(s)],
        [alphaOptions(s), alpha(s)],
      ] as const) {
        expect(new Set(opts).size).toBe(3);
        expect(opts).toContain(right);
      }
    }
  });

  it('cifras para la lección: todo bien da 4 aciertos', () => {
    const s = setupTwo(0);
    const v = twoValues(s, { vol: 13.02, minVar: 8, cml: 5.75, alpha: 2.8 });
    expect(v).toMatchObject({
      s_a: 20,
      s_b: 8,
      rho: 0.2,
      w_a: 60,
      port_vol: 13.02,
      avg_vol: 15.2,
      min_var_w: 8,
      rf: 2,
      rt: 7,
      st: 12,
      target: 9,
      cml: 5.75,
      ri: 12,
      rho_m: 0.6,
      si: 30,
      sm: 15,
      rm: 8,
      beta: 1.2,
      alpha: 2.8,
      hits: 4,
    });
    expect(twoResult(s, { vol: 0, minVar: 0, cml: 0, alpha: 0 }).score).toBe(0);
  });
});
