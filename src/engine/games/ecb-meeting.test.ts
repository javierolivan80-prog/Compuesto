import { describe, expect, it } from 'vitest';
import {
  ecbResult,
  ecbValues,
  extraInterest,
  mortgageOptions,
  RIGHT_QE,
  rightFx,
  setupEcb,
  surpriseBp,
  taylor,
  taylorOptions,
  TARGET,
} from './ecb-meeting';

describe('La reunión del BCE', () => {
  it('semilla 0: Taylor 1 + 3 + 0,5 × 1 = 4,5 %; sube 50 pb con 25 descontados; 750 € más de hipoteca', () => {
    const s = setupEcb(0);
    expect(taylor(s)).toBe(4.5);
    expect(taylorOptions(s)).toEqual([4, 4.5, 5]);
    expect(surpriseBp(s)).toBe(25);
    expect(rightFx(s)).toBe('up');
    expect(extraInterest(s)).toBe(750);
    expect(mortgageOptions(s)).toEqual([75, 750, 5250]);
    expect(RIGHT_QE).toBe('priceUp');
  });

  it('en todas las semillas: opciones distintas con la buena e inflación distinta del objetivo', () => {
    for (let seed = 0; seed <= 60; seed++) {
      const s = setupEcb(seed);
      expect(setupEcb(seed)).toEqual(s);
      expect(s.inflation).not.toBe(TARGET);
      expect(new Set(taylorOptions(s)).size).toBe(3);
      expect(taylorOptions(s)).toContain(taylor(s));
      expect(new Set(mortgageOptions(s)).size).toBe(3);
      expect(mortgageOptions(s)).toContain(extraInterest(s));
      expect(s.euribor1).toBeGreaterThan(s.euribor0);
    }
  });

  it('el euro según la sorpresa: igual a lo descontado no se mueve; menos de lo esperado se deprecia', () => {
    const s = setupEcb(0);
    expect(rightFx({ ...s, moveBp: 25 })).toBe('flat');
    expect(rightFx({ ...s, moveBp: 0 })).toBe('down');
  });

  it('las semillas cubren las tres reacciones del euro', () => {
    const seen = new Set(Array.from({ length: 61 }, (_, seed) => rightFx(setupEcb(seed))));
    expect(seen).toEqual(new Set(['up', 'down', 'flat']));
  });

  it('nota y cifras para la lección', () => {
    const s = setupEcb(0);
    const best = { taylor: 4.5, fx: 'up' as const, extra: 750, qe: 'priceUp' as const };
    expect(ecbResult(s, best).score).toBe(1);
    expect(ecbResult(s, { ...best, fx: 'flat' }).score).toBe(0.75);
    expect(ecbValues(s, best)).toEqual({
      neutral: 1,
      inflation: 3,
      target: 2,
      taylor: 4.5,
      priced_bp: 25,
      move_bp: 50,
      surprise_bp: 25,
      principal: 150_000,
      euribor0: 3,
      euribor1: 3.5,
      extra_interest: 750,
      hits: 4,
    });
    expect(ecbValues(s, { taylor: 0, fx: 'down', extra: 0, qe: 'none' }).hits).toBe(0);
  });
});
