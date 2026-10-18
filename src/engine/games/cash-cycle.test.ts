import { describe, expect, it } from 'vitest';
import {
  ALL_PLANS,
  bestPlan,
  cashScore,
  cashValues,
  DPO_OPTIONS,
  DSO_OPTIONS,
  planResult,
  setupCash,
} from './cash-cycle';

describe('ciclo de caja', () => {
  it('determinista y con cifras dentro de sus rangos; plazos dentro de los 60 días de la Ley 3/2004', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const s = setupCash(seed);
      expect(setupCash(seed)).toEqual(s);
      expect(s.baseSales).toBeGreaterThanOrEqual(60000);
      expect(s.baseSales).toBeLessThanOrEqual(64000);
      expect(s.available % 1000).toBe(0);
      expect([5, 6, 7, 8, 9]).toContain(s.rate);
      expect([1.5, 1.75, 2]).toContain(s.fee);
    }
    expect(Math.max(...DSO_OPTIONS, ...DPO_OPTIONS)).toBeLessThanOrEqual(60);
    expect(ALL_PLANS).toHaveLength(54);
  });

  it('NOF = clientes + existencias − proveedores y ciclo de caja = cobro + existencias − pago', () => {
    const s = setupCash(2);
    const r = planResult(s, { dso: 60, dio: 60, dpo: 50, funding: 'poliza' });
    expect(r.clients).toBe(Math.round((r.sales * 60) / 365));
    expect(r.nof).toBe(r.clients + r.stock - r.payables);
    expect(r.ccc).toBe(70);
    expect(r.shortfall).toBe(Math.max(0, r.nof - s.available));
    expect(r.margin).toBe(r.sales - r.cost - r.fundingCost);
  });

  it('cobrar antes baja las NOF pero vende menos; pagar antes tiene descuento pero sube las NOF', () => {
    const s = setupCash(2);
    const late = planResult(s, { dso: 60, dio: 60, dpo: 50, funding: 'poliza' });
    const early = planResult(s, { dso: 30, dio: 60, dpo: 50, funding: 'poliza' });
    expect(early.nof).toBeLessThan(late.nof);
    expect(early.sales).toBeLessThan(late.sales);
    const pay = planResult(s, { dso: 60, dio: 60, dpo: 30, funding: 'poliza' });
    expect(pay.cost).toBeLessThan(late.cost);
    expect(pay.nof).toBeGreaterThan(late.nof);
  });

  it('la póliza tiene límite (si te pasas, sin caja); el factoring cubre el hueco, pero es más caro', () => {
    const s = setupCash(2);
    const plan = { dso: 60, dio: 60, dpo: 50 } as const;
    const pol = planResult(s, { ...plan, funding: 'poliza' });
    const fac = planResult(s, { ...plan, funding: 'factoring' });
    expect(pol.shortfall).toBeGreaterThan(s.limit);
    expect(pol.feasible).toBe(false);
    expect(cashScore(s, pol)).toBe(0);
    expect(fac.feasible).toBe(true);
    expect(fac.fundingCost).toBeGreaterThan((fac.shortfall * s.rate) / 100);
  });

  it('el mejor plan es factible, no lo supera ningún plan factible y saca nota 1', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const s = setupCash(seed);
      const b = bestPlan(s);
      expect(b.feasible).toBe(true);
      for (const p of ALL_PLANS) {
        const r = planResult(s, p);
        if (r.feasible) expect(r.margin).toBeLessThanOrEqual(b.margin);
      }
      expect(cashScore(s, b)).toBe(1);
    }
  });

  it('la nota baja con lo que te alejas del mejor margen, con un suelo de 0,3', () => {
    const s = setupCash(8);
    const r = planResult(s, { dso: 30, dio: 45, dpo: 50, funding: 'factoring' });
    const score = cashScore(s, r);
    expect(score).toBeGreaterThanOrEqual(0.3);
    expect(score).toBeLessThan(1);
    expect(cashValues(s, r)).toMatchObject({ factoring: 1, best_margin: bestPlan(s).margin });
  });
});
