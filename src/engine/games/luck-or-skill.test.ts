import { describe, expect, it } from 'vitest';
import {
  EXPECTED_PERFECT,
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
      expect(s.fatTailMonths).toBeGreaterThan(2.3);
      const o = meanOptions(s);
      expect(new Set(o).size).toBe(3);
      expect(o).toContain(Math.round(mean(s.a) * 100) / 100);
    }
  });

  it('de media, uno de cada 32 acierta cinco de cinco a cara o cruz', () => {
    expect(EXPECTED_PERFECT).toBe(1);
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
