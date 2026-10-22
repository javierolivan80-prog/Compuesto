import { describe, expect, it } from 'vitest';
import {
  macroResult,
  macroValues,
  rateOptions,
  rightBondMove,
  rightCycle,
  setupMacro,
  surprise,
  unemploymentRate,
  yoy,
  yoyOptions,
} from './macro-day';

describe('El día del dato', () => {
  it('semilla 0: IPC de 112 a 115,6 = 3,2 %; consenso 2,9 → sorpresa +0,3; PMI 48,5; paro 11,5 %', () => {
    const s = setupMacro(0);
    expect(yoy(s)).toBe(3.2);
    expect(yoyOptions(s)).toEqual([3.1, 3.2, 3.6]);
    expect(surprise(s)).toBe(0.3);
    expect(rightBondMove(s)).toBe('up');
    expect(rightCycle(s)).toBe('contraction');
    expect(unemploymentRate(s)).toBe(11.5);
    expect(rateOptions(s)).toEqual([11.5, 13, 88.5]);
  });

  it('en todas las semillas: opciones distintas con la buena, sorpresa nunca nula y PMI lejos de 50', () => {
    for (let seed = 0; seed <= 60; seed++) {
      const s = setupMacro(seed);
      expect(setupMacro(seed)).toEqual(s);
      expect(new Set(yoyOptions(s)).size).toBe(3);
      expect(yoyOptions(s)).toContain(yoy(s));
      expect(new Set(rateOptions(s)).size).toBe(3);
      expect(rateOptions(s)).toContain(unemploymentRate(s));
      expect(Math.abs(surprise(s))).toBeGreaterThanOrEqual(0.2);
      expect(Math.abs(s.pmi - 50)).toBeGreaterThan(1);
    }
  });

  it('una sorpresa a la baja hace bajar la rentabilidad del bono', () => {
    const s = { ...setupMacro(0), consensus: 3.5 };
    expect(surprise(s)).toBe(-0.3);
    expect(rightBondMove(s)).toBe('down');
  });

  it('nota y cifras para la lección', () => {
    const s = setupMacro(0);
    const best = { yoy: 3.2, bond: 'up' as const, cycle: 'contraction' as const, rate: 11.5 };
    expect(macroResult(s, best).score).toBe(1);
    expect(macroResult(s, { ...best, bond: 'down' }).score).toBe(0.75);
    expect(macroValues(s, best)).toMatchObject({
      cpi_yoy: 3.2,
      surprise: 0.3,
      unemployment_rate: 11.5,
      hits: 4,
    });
  });
});
