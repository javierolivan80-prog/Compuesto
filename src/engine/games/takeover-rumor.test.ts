import { describe, expect, it } from 'vitest';
import companies from '../../../content/shared/companies.json';
import {
  EXTRA,
  MY_SHARES,
  setupTakeover,
  TARGET_SHARES,
  takeoverResult,
  takeoverValues,
} from './takeover-rumor';

const base = { buyOnRumor: false, reportInsider: true, final: 'accept' } as const;

describe('el rumor de OPA', () => {
  it('Mediterránea de Navieras tiene las acciones de companies.json', () => {
    const med = (companies as { id: string; sharesOutstanding?: number }[]).find(
      (c) => c.id === 'mediterranea-de-navieras',
    );
    expect(med?.sharesOutstanding).toBe(TARGET_SHARES);
  });

  it('determinista; rumor +5–8 %, oferta con un premio del 20–30 % y cotización algo por debajo de la oferta', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const s = setupTakeover(seed);
      expect(setupTakeover(seed)).toEqual(s);
      expect(s.pRumor / s.p0 - 1).toBeGreaterThan(0.045);
      expect(s.pRumor / s.p0 - 1).toBeLessThan(0.085);
      expect(s.offer / s.p0 - 1).toBeGreaterThan(0.195);
      expect(s.offer / s.p0 - 1).toBeLessThan(0.305);
      expect(s.pAfter).toBeLessThan(s.offer);
      expect(s.pAfter).toBeGreaterThan(s.pRumor);
      expect(s.pFalse).toBeLessThan(s.pRumor);
    }
  });

  it('cifras: premio, diferencial, tamaño de la operación y ganancias', () => {
    const s = setupTakeover(1);
    const r = takeoverResult(s, base);
    expect(r.premium).toBeCloseTo((s.offer / s.p0 - 1) * 100, 2);
    expect(r.premiumRumor).toBeLessThan(r.premium);
    expect(r.spread).toBeCloseTo((s.offer / s.pAfter - 1) * 100, 2);
    expect(r.dealSize).toBeCloseTo(s.offer * TARGET_SHARES, 2);
    expect(r.gainAccept).toBeCloseTo(MY_SHARES * (s.offer - s.p0), 2);
    expect(r.gainSell).toBeLessThan(r.gainAccept);
    expect(r.falseLoss).toBeCloseTo(EXTRA * (s.pRumor - s.pFalse), 2);
    expect(r.rumorAccept).toBeCloseTo(EXTRA * (s.offer - s.pRumor), 2);
    expect(r.rumorSell).toBeLessThan(r.rumorAccept);
    expect(Object.keys(takeoverValues(r))).toHaveLength(14);
  });

  it('nota: lo que pesa es no operar con información privilegiada; vender o acudir valen igual', () => {
    const s = setupTakeover(1);
    expect(takeoverResult(s, base).score).toBe(1);
    expect(takeoverResult(s, { ...base, final: 'sell' }).score).toBe(1);
    expect(takeoverResult(s, { ...base, final: 'reject' }).score).toBe(0.8);
    expect(takeoverResult(s, { ...base, reportInsider: false }).score).toBe(0.4);
    // comprar por el rumor es legal: no resta nota, pero se enseña el riesgo
    expect(takeoverResult(s, { ...base, buyOnRumor: true }).score).toBe(1);
  });
});
