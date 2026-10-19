import { describe, expect, it } from 'vitest';
import {
  EXPECTED_PERFECT,
  FAT_TAIL,
  NORMAL_TAIL,
  luckResult,
  luckValues,
  mean,
  meanOptions,
  MONTHS,
  setupLuck,
  stdev,
} from './luck-or-skill';

describe('¿Suerte o habilidad?', () => {
  it('estadística básica: media y desviación típica muestral', () => {
    expect(mean([1, 2, 3, 4])).toBe(2.5);
    expect(stdev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 3);
  });

  it('en todas las semillas, los dos fondos tienen la misma media y B es más volátil', () => {
    for (let seed = 0; seed <= 40; seed++) {
      const s = setupLuck(seed);
      expect(setupLuck(seed)).toEqual(s);
      expect(s.a).toHaveLength(MONTHS);
      expect(mean(s.a)).toBeCloseTo(mean(s.b), 6);
      expect(stdev(s.b)).toBeGreaterThan(stdev(s.a) * 2);
      expect(s.perfect).toBeGreaterThanOrEqual(1);
      const o = meanOptions(s);
      expect(new Set(o).size).toBe(3);
      expect(o).toContain(Math.round(mean(s.a) * 100) / 100);
    }
  });

  it('de media, uno de cada 32 acierta cinco de cinco a cara o cruz', () => {
    expect(EXPECTED_PERFECT).toBe(1);
  });

  it('colas: a tres desviaciones, la normal da 1,3 por mil y la t3 reescalada unos 6,9', () => {
    const normalCdf = (z: number) => {
      // aproximación de Abramowitz y Stegun 7.1.26 para erf
      const x = Math.abs(z) / Math.SQRT2;
      const t = 1 / (1 + 0.3275911 * x);
      const y =
        1 -
        ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
          0.254829592) *
          t *
          Math.exp(-x * x);
      return z < 0 ? (1 - y) / 2 : (1 + y) / 2;
    };
    const t3Cdf = (z: number) => {
      const a = (z * Math.sqrt(3)) / Math.sqrt(3);
      return 0.5 + (a / (1 + a * a) + Math.atan(a)) / Math.PI;
    };
    expect(normalCdf(-3) * 1000).toBeCloseTo(NORMAL_TAIL, 1);
    expect(t3Cdf(-3) * 1000).toBeCloseTo(FAT_TAIL, 1);
    // a dos desviaciones, la t3 reescalada tiene MENOS cola que la normal
    expect(t3Cdf(-2)).toBeLessThan(normalCdf(-2));
  });

  it('nota: 25 % por acierto y cifras para la lección', () => {
    const s = setupLuck(0);
    const best = {
      mean: Math.round(mean(s.a) * 100) / 100,
      volatile: 'b' as const,
      tails: 'more' as const,
      genius: false,
    };
    expect(luckResult(s, best).score).toBe(1);
    expect(luckResult(s, { ...best, genius: true }).score).toBe(0.75);
    const v = luckValues(s, best);
    expect(v.mean_a).toBe(v.mean_b);
    expect(v.sd_b).toBeGreaterThan(v.sd_a!);
    expect(v.hits).toBe(4);
  });
});
