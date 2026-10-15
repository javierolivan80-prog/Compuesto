import { describe, expect, it } from 'vitest';
import { seededCandles } from './candles';
import { mulberry32 } from './prng';

describe('PRNG y velas con semilla', () => {
  it('misma semilla, misma secuencia; distinta semilla, distinta', () => {
    const a = mulberry32(1);
    const b = mulberry32(1);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(mulberry32(2)()).not.toBe(mulberry32(1)());
  });
  it('genera velas coherentes (low ≤ open,close ≤ high) y deterministas', () => {
    const c = seededCandles(7, 60);
    expect(c).toHaveLength(60);
    expect(seededCandles(7, 60)).toEqual(c);
    for (const k of c) {
      expect(k.low).toBeLessThanOrEqual(Math.min(k.open, k.close));
      expect(k.high).toBeGreaterThanOrEqual(Math.max(k.open, k.close));
    }
    expect(new Set(c.map((k) => k.time)).size).toBe(60);
  });
});
