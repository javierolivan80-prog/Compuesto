import { describe, expect, it } from 'vitest';
import {
  committeeResult,
  committeeValues,
  DECISIONS,
  elCollateral,
  elOptions,
  expectedLoss,
  marginIncome,
  provision,
  provisionOptions,
  rightDecision,
  setupCommittee,
  stageOf,
} from './risk-committee';

describe('Comité de riesgos', () => {
  it('semilla 0: EL de 9, garantía, fase 2 y provisión de 19,2', () => {
    const s = setupCommittee(0);
    expect(expectedLoss(s)).toBe(9);
    expect(elOptions(s)).toEqual([9, 20, 450]);
    expect(marginIncome(s)).toBe(8);
    expect(elCollateral(s)).toBe(5);
    expect(rightDecision(s)).toBe('collateral');
    expect(stageOf(s)).toBe(2);
    expect(provision(s)).toBe(19.2);
    expect(provisionOptions(s)).toEqual([3.6, 19.2, 240]);
  });

  it('la regla de las fases: 90 y 30 días, y 3 escalones', () => {
    const s = setupCommittee(0);
    expect(stageOf({ ...s, days: 91 })).toBe(3);
    expect(stageOf({ ...s, days: 90, notches: 0 })).toBe(2);
    expect(stageOf({ ...s, days: 30, notches: 2 })).toBe(1);
    expect(stageOf({ ...s, days: 0, notches: 3 })).toBe(2);
  });

  it('en 10.000 semillas: opciones distintas con la buena y el margen lejos de los umbrales', () => {
    for (let seed = 0; seed < 10_000; seed++) {
      const s = setupCommittee(seed);
      expect(new Set(elOptions(s)).size).toBe(3);
      expect(elOptions(s)).toContain(expectedLoss(s));
      expect(new Set(provisionOptions(s)).size).toBe(3);
      expect(provisionOptions(s)).toContain(provision(s));
      expect(marginIncome(s)).not.toBe(expectedLoss(s));
      expect(marginIncome(s)).not.toBe(elCollateral(s));
      expect(s.margin).toBeGreaterThan(0);
    }
  });

  it('las semillas cubren las tres decisiones y las tres fases', () => {
    const all = Array.from({ length: 81 }, (_, seed) => setupCommittee(seed));
    expect(new Set(all.map(rightDecision))).toEqual(new Set(DECISIONS));
    expect(new Set(all.map(stageOf))).toEqual(new Set([1, 2, 3]));
    expect(setupCommittee(7)).toEqual(setupCommittee(7));
  });

  it('nota y cifras para la lección', () => {
    const s = setupCommittee(0);
    const best = { el: 9, decision: 'collateral' as const, stage: 2 as const, provision: 19.2 };
    expect(committeeResult(s, best).score).toBe(1);
    expect(committeeResult(s, { ...best, stage: 1 }).score).toBe(0.75);
    expect(committeeValues(s, best)).toEqual({
      ead: 1_000,
      pd: 2,
      lgd: 45,
      el: 9,
      margin: 0.8,
      margin_income: 8,
      lgd_collateral: 25,
      el_collateral: 5,
      ead2: 600,
      pd12: 1.5,
      pd_life: 8,
      lgd2: 40,
      days: 45,
      notches: 1,
      stage: 2,
      provision: 19.2,
      hits: 4,
    });
    expect(committeeValues(s, { el: 0, decision: 'reject', stage: 1, provision: 0 }).hits).toBe(0);
  });
});
