import { describe, expect, it } from 'vitest';
import {
  comboPoints,
  comboStep,
  initialCombo,
  multiplierFor,
  ratingAtLeast,
  ratingFor,
} from './game-kit';
import { PARTICLE_MAX, PARTICLE_MIN, spawnBurst, stepParticles } from './particles';

describe('ratingFor', () => {
  it.each([
    [1, 'AAA'],
    [0.95, 'AAA'],
    [0.9, 'AA'],
    [0.72, 'A'],
    [0.6, 'BBB'],
    [0.5, 'BB'],
    [0.1, 'B'],
    [0, 'B'],
    [-3, 'B'],
    [7, 'AAA'],
    [NaN, 'B'],
  ])('puntuación %s → %s', (s, r) => expect(ratingFor(s)).toBe(r));
  it('ratingAtLeast ordena AAA > … > B', () => {
    expect(ratingAtLeast('AA', 'A')).toBe(true);
    expect(ratingAtLeast('BB', 'BBB')).toBe(false);
    expect(ratingAtLeast('B', 'B')).toBe(true);
  });
});

describe('combo', () => {
  it('los multiplicadores suben en 2, 4 y 7 aciertos', () => {
    expect([0, 1, 2, 3, 4, 6, 7, 20].map(multiplierFor)).toEqual([1, 1, 2, 2, 3, 3, 4, 4]);
  });
  it('encadena aciertos, avisa al subir y guarda el mejor', () => {
    let s = initialCombo();
    const raised: boolean[] = [];
    for (let i = 0; i < 7; i++) {
      const r = comboStep(s, true);
      raised.push(r.raised);
      s = r.state;
    }
    expect(raised).toEqual([false, true, false, true, false, false, true]);
    expect(s).toEqual({ streak: 7, best: 7, multiplier: 4 });
    expect(comboPoints(10, s)).toBe(40);
  });
  it('un fallo rompe el combo solo si valía más de ×1', () => {
    const one = comboStep(initialCombo(), true).state;
    expect(comboStep(one, false).broken).toBe(false);
    let s = one;
    for (let i = 0; i < 3; i++) s = comboStep(s, true).state;
    const miss = comboStep(s, false);
    expect(miss.broken).toBe(true);
    expect(miss.state).toEqual({ streak: 0, best: 4, multiplier: 1 });
  });
});

describe('partículas', () => {
  it('genera entre 20 y 40, deterministas por semilla', () => {
    expect(spawnBurst({ x: 0, y: 0, seed: 1, count: 5 })).toHaveLength(PARTICLE_MIN);
    expect(spawnBurst({ x: 0, y: 0, seed: 1, count: 500 })).toHaveLength(PARTICLE_MAX);
    expect(spawnBurst({ x: 0, y: 0, seed: 3 })).toEqual(spawnBurst({ x: 0, y: 0, seed: 3 }));
    expect(spawnBurst({ x: 0, y: 0, seed: 3 })).not.toEqual(spawnBurst({ x: 0, y: 0, seed: 4 }));
  });
  it('desaparecen en ~700 ms y la gravedad las baja', () => {
    let ps = spawnBurst({ x: 0, y: 0, seed: 2 });
    const vy0 = ps[0]!.vy;
    ps = stepParticles(ps, 16);
    expect(ps[0]!.vy).toBeGreaterThan(vy0);
    let t = 16;
    while (ps.length && t < 2000) {
      ps = stepParticles(ps, 16);
      t += 16;
    }
    expect(ps).toHaveLength(0);
    expect(t).toBeGreaterThanOrEqual(690);
    expect(t).toBeLessThan(760);
  });
  it('un tirón largo no teletransporta: el avance se limita a 50 ms', () => {
    const ps = spawnBurst({ x: 0, y: 0, seed: 5 });
    const moved = stepParticles(ps, 600)[0]!;
    expect(moved.x).toBeCloseTo(ps[0]!.vx * (50 / 16.667), 6);
  });
});
