import { describe, expect, it } from 'vitest';
import {
  debtRatio0,
  nextRatio,
  phaseOf,
  PHASES,
  premiumResult,
  premiumValues,
  ratioOptions,
  sectorFor,
  setupPremium,
  spreadBp,
  spreadOptions,
} from './risk-premium';

describe('La prima de riesgo', () => {
  it('semilla 0: desaceleración, defensivos, prima de 85 pb y deuda/PIB del 103,8 %', () => {
    const s = setupPremium(0);
    expect(phaseOf(s)).toBe('slowdown');
    expect(sectorFor(phaseOf(s))).toBe('defensive');
    expect(spreadBp(s)).toBe(85);
    expect(spreadOptions(s)).toEqual([-85, 0.85, 85]);
    expect(debtRatio0(s)).toBe(105);
    expect(nextRatio(s)).toBe(103.8);
    expect(ratioOptions(s)).toEqual([101, 103.8, 108]);
  });

  it('la regla de la fase: potencial e inflación arriba; PMI abajo', () => {
    const s = setupPremium(0);
    expect(phaseOf({ ...s, growth: 2.5, inflNow: 3.6 })).toBe('boom');
    expect(phaseOf({ ...s, growth: 2.5, inflNow: 3 })).toBe('expansion');
    expect(phaseOf({ ...s, pmi: 47 })).toBe('recession');
    expect(sectorFor('expansion')).toBe('cyclical');
    expect(sectorFor('boom')).toBe('cyclical');
    expect(sectorFor('recession')).toBe('defensive');
  });

  it('en todas las semillas: opciones distintas con la buena y cifras realistas', () => {
    for (let seed = 0; seed <= 80; seed++) {
      const s = setupPremium(seed);
      expect(setupPremium(seed)).toEqual(s);
      const bp = spreadBp(s);
      expect(bp).toBeGreaterThanOrEqual(50);
      expect(bp).toBeLessThanOrEqual(250);
      expect(new Set(spreadOptions(s)).size).toBe(3);
      expect(spreadOptions(s)).toContain(bp);
      expect(new Set(ratioOptions(s)).size).toBe(3);
      expect(ratioOptions(s)).toContain(nextRatio(s));
      for (const r of [...ratioOptions(s), debtRatio0(s)]) {
        expect(r).toBeGreaterThanOrEqual(60);
        expect(r).toBeLessThanOrEqual(120);
      }
      expect(s.inflNow).not.toBe(s.inflPrev);
      expect(s.growth).not.toBe(s.potential);
      expect(s.pmi).not.toBe(50);
      // la regla coherente con los datos: por encima del potencial, el PMI está por encima de 50
      if (s.growth > s.potential) expect(s.pmi).toBeGreaterThan(50);
    }
  });

  it('las semillas cubren las cuatro fases', () => {
    const seen = new Set(Array.from({ length: 81 }, (_, seed) => phaseOf(setupPremium(seed))));
    expect(seen).toEqual(new Set(PHASES));
  });

  it('nota y cifras para la lección', () => {
    const s = setupPremium(0);
    const best = {
      phase: 'slowdown' as const,
      sector: 'defensive' as const,
      spread: 85,
      ratio: 103.8,
    };
    expect(premiumResult(s, best).score).toBe(1);
    expect(premiumResult(s, { ...best, phase: 'boom' }).score).toBe(0.75);
    expect(premiumValues(s, best)).toEqual({
      growth: 1,
      potential: 1.5,
      infl_prev: 3.4,
      infl_now: 3.2,
      pmi: 50.8,
      spain: 3.45,
      bund: 2.6,
      spread_bp: 85,
      debt: 1050,
      gdp: 1000,
      deficit: 30,
      nominal_growth: 4,
      debt_ratio0: 105,
      debt_ratio1: 103.8,
      hits: 4,
    });
    expect(premiumValues(s, { phase: 'boom', sector: 'cyclical', spread: 0, ratio: 0 }).hits).toBe(
      0,
    );
  });
});
