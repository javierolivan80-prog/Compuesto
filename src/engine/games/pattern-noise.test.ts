import { describe, expect, it } from 'vitest';
import {
  exposure,
  loser,
  loss,
  lossOptions,
  lossPct,
  net,
  netOptions,
  patternResult,
  patternValues,
  randomWalk,
  setupPattern,
  winner,
} from './pattern-noise';

describe('¿Patrón o ruido? (N5)', () => {
  it('semilla 0: 3 % neto, compra Naranjas y vende Pirineo, y pierde 800 € con el CFD', () => {
    const s = setupPattern(0);
    expect(net(s)).toBe(3);
    expect(netOptions(s)).toEqual([3, 17.75, 18]);
    expect(winner(s)).toBe(0);
    expect(loser(s)).toBe(1);
    expect(exposure(s)).toBe(40_000);
    expect(loss(s)).toBe(800);
    expect(lossPct(s)).toBe(40);
    expect(lossOptions(s)).toEqual([40, 800, 40_000]);
  });

  it('los paseos aleatorios son reproducibles, de 60 sesiones y empiezan en 100', () => {
    const a = randomWalk(101);
    expect(a).toHaveLength(60);
    expect(a[0]).toBe(100);
    expect(randomWalk(101)).toEqual(a);
    expect(randomWalk(202)).not.toEqual(a);
  });

  it('en 10.000 semillas: opciones distintas, cuatro rentabilidades distintas y nunca el cierre del 50 %', () => {
    for (let seed = 0; seed < 10_000; seed++) {
      const s = setupPattern(seed);
      expect(new Set(netOptions(s)).size).toBe(3);
      expect(new Set(lossOptions(s)).size).toBe(3);
      expect(new Set(s.past).size).toBe(4);
      expect(lossPct(s)).toBeLessThan(50);
      expect(net(s)).not.toBe(0);
      expect([5, 10, 20]).toContain(s.lev);
    }
  });

  it('cifras para la lección: todo bien da 4 aciertos', () => {
    const s = setupPattern(0);
    const v = patternValues(s, { chart: 'unknown', net: 3, pick: 'momentum', loss: 800 });
    expect(v).toMatchObject({
      gross: 18,
      trades: 60,
      cost: 0.25,
      net: 3,
      best: 24,
      worst: -12,
      deposit: 2000,
      lev: 20,
      move: 2,
      exposure: 40_000,
      loss: 800,
      loss_pct: 40,
      hits: 4,
    });
    expect(patternResult(s, { chart: 'a', net: 0, pick: 'none', loss: 0 }).score).toBe(0);
  });
});
