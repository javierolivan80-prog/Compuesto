import { describe, expect, it } from 'vitest';
import {
  curveResult,
  curveValues,
  durations,
  fall10,
  fallOptions,
  LEVEL_GRID,
  longFalls,
  pricesAt,
  setupCurve,
  SLOPE_GRID,
  slopeWeight,
  twist,
  yieldsAt,
} from './yield-curve';

const grid = (g: { min: number; max: number; step: number }) =>
  Array.from({ length: Math.round((g.max - g.min) / g.step) + 1 }, (_, i) => g.min + i * g.step);

describe('Curva de tipos', () => {
  it('todos los bonos empiezan a la par; la pendiente gira alrededor de los 5 años', () => {
    for (const seed of [0, 1, 2]) {
      const s = setupCurve(seed);
      for (const p of pricesAt(s, { level: 0, slope: 0 })) expect(p).toBeCloseTo(100, 8);
    }
    expect(slopeWeight(5)).toBe(0);
    expect(slopeWeight(30)).toBeCloseTo(1, 10);
    expect(slopeWeight(1)).toBeLessThan(0);
    const s = setupCurve(0);
    expect(yieldsAt(s, { level: 0, slope: 1 })[2]).toBeCloseTo(s.base[2]!, 10);
  });

  it('con +1 punto, los largos caen más: la caída sigue a la duración', () => {
    const s = setupCurve(0);
    const p = pricesAt(s, { level: 1, slope: 0 });
    for (let i = 1; i < p.length; i++) expect(p[i]!).toBeLessThan(p[i - 1]!);
    const d = durations(s);
    // la duración modificada aproxima la caída por punto (algo menos por la convexidad)
    expect(100 - p[3]!).toBeLessThan(d[3]!);
    expect(100 - p[3]!).toBeGreaterThan(d[3]! * 0.9);
  });

  it('en las tres curvas los retos 1 y 2 tienen solución en la rejilla y las opciones son distintas', () => {
    for (const seed of [0, 1, 2]) {
      const s = setupCurve(seed);
      const combos = grid(LEVEL_GRID).flatMap((level) =>
        grid(SLOPE_GRID).map((slope) => ({ level, slope })),
      );
      expect(combos.some((l) => longFalls(s, l))).toBe(true);
      expect(combos.some((l) => twist(s, l))).toBe(true);
      expect(new Set(fallOptions(s)).size).toBe(3);
      expect(fallOptions(s)).toContain(fall10(s));
    }
  });

  it('nota 35 / 35 / 30 y cifras para la lección', () => {
    const s = setupCurve(0);
    const best = {
      first: { level: 1, slope: 0 },
      second: { level: 0, slope: -1 },
      pick: fall10(s),
    };
    expect(longFalls(s, best.first)).toBe(true);
    expect(twist(s, best.second)).toBe(true);
    expect(curveResult(s, best).score).toBe(1);
    expect(curveResult(s, { ...best, pick: 0 }).score).toBe(0.7);
    const v = curveValues(s, best);
    expect(v.fall_10).toBe(fall10(s));
    expect(v.dur_30!).toBeGreaterThan(v.dur_10!);
  });
});
