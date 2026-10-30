import { describe, expect, it } from 'vitest';
import {
  edgeResult,
  edgeValues,
  ev,
  evOptions,
  falsePositives,
  fpOptions,
  posterior,
  posteriorOptions,
  setupEdge,
  significant,
  tOptions,
  tStat,
} from './edge-test';

describe('¿Ventaja real? (N5)', () => {
  it('semilla 0: 21 € por operación, t de 1,6, 2 falsos positivos y un 30,8 % tras la señal', () => {
    const s = setupEdge(0);
    expect(ev(s)).toBe(21);
    expect(evOptions(s)).toEqual([10, 21, 66]);
    expect(tStat(s)).toBe(1.6);
    expect(tOptions(s)).toEqual([0.4, 1.6, 3.2]);
    expect(significant(s)).toBe(false);
    expect(falsePositives(s)).toBe(2);
    expect(fpOptions(s)).toEqual([0.4, 2, 20]);
    expect(posterior(s)).toBe(30.8);
    expect(posteriorOptions(s)).toEqual([8, 30.8, 80]);
  });

  it('en 10.000 semillas: opciones distintas con la buena', () => {
    for (let seed = 0; seed < 10_000; seed++) {
      const s = setupEdge(seed);
      for (const [opts, right] of [
        [evOptions(s), ev(s)],
        [tOptions(s), tStat(s)],
        [fpOptions(s), falsePositives(s)],
        [posteriorOptions(s), posterior(s)],
      ] as const) {
        expect(new Set(opts).size).toBe(3);
        expect(opts).toContain(right);
      }
    }
  });

  it('hay estrategias con valor esperado negativo y con t por encima de 2', () => {
    const all = Array.from({ length: 200 }, (_, seed) => setupEdge(seed));
    expect(all.some((s) => ev(s) < 0)).toBe(true);
    expect(all.some(significant)).toBe(true);
    expect(all.some((s) => !significant(s))).toBe(true);
    expect(setupEdge(3)).toEqual(setupEdge(3));
  });

  it('cifras para la lección: todo bien da 4 aciertos', () => {
    const s = setupEdge(0);
    const v = edgeValues(s, { ev: 21, t: 1.6, fp: 2, post: 30.8 });
    expect(v).toMatchObject({
      win_pct: 55,
      avg_win: 120,
      avg_loss: 100,
      ev: 21,
      sharpe: 0.8,
      years: 4,
      t_stat: 1.6,
      significant: 0,
      n_tests: 40,
      false_pos: 2,
      prior: 10,
      sens: 80,
      fpr: 20,
      posterior: 30.8,
      hits: 4,
    });
    expect(edgeResult(s, { ev: 0, t: 0, fp: 0, post: 0 }).score).toBe(0);
  });
});
