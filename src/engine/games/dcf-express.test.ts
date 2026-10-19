import { describe, expect, it } from 'vitest';
import model from '../../../content/shared/models/naranjas-del-turia-dcf.json';
import {
  approved,
  BASE,
  bossGrowth,
  dcf,
  dcfResult,
  dcfValues,
  defensible,
  hitsPrice,
  hitsTarget,
  impliedWacc,
  RULES,
  setupDcf,
  START_3,
  withinRules,
} from './dcf-express';

describe('DCF Express', () => {
  it('con las hipótesis del modelo reproduce la valoración por Gordon del modelo de referencia', () => {
    const d = dcf(BASE);
    const g = model.valuation.gordon;
    // el WACC del modelo se redondea a 8,27 % para la rejilla: diferencias de unos pocos miles de €
    expect(d.pvFcff).toBeCloseTo(g.sumPvFcff, -1);
    expect(Math.abs(d.pvTerminal / g.pvTerminalValue - 1)).toBeLessThan(0.001);
    expect(d.perShare).toBeCloseTo(g.pricePerShare, 2);
    expect(d.tvShare).toBeCloseTo(g.terminalValueShareOfEv, 3);
  });

  it('el valor baja con el WACC y sube con g y con el margen', () => {
    expect(dcf({ ...BASE, wacc: 9 }).perShare).toBeLessThan(dcf(BASE).perShare);
    expect(dcf({ ...BASE, g: 2.5 }).perShare).toBeGreaterThan(dcf(BASE).perShare);
    expect(dcf({ ...BASE, margin: 1 }).perShare).toBeGreaterThan(dcf(BASE).perShare);
    expect(dcf({ ...BASE, g: 3 }).tvShare).toBeGreaterThan(dcf(BASE).tvShare);
  });

  it('en todas las semillas el precio y el objetivo del jefe se alcanzan en la rejilla, y la g del jefe no es defendible', () => {
    for (let seed = 0; seed <= 40; seed++) {
      const s = setupDcf(seed);
      expect(setupDcf(seed)).toEqual(s);
      expect(hitsPrice(impliedWacc(s), s)).toBe(true);
      expect(impliedWacc(s)).toBeGreaterThan(BASE.wacc);
      expect(hitsTarget(bossGrowth(s), s)).toBe(true);
      expect(defensible(bossGrowth(s))).toBe(false);
    }
  });

  it('semilla 0: la cotización de 7,50 € descuenta un 9,9 % y los 12 € del jefe piden g = 3,7 %', () => {
    const s = setupDcf(0);
    expect(s.price).toBe(7.5);
    expect(impliedWacc(s)).toBe(9.9);
    expect(bossGrowth(s)).toBe(3.7);
  });

  it('el reto 3 empieza fuera de las reglas; el caso base del modelo se aprueba', () => {
    const r = withinRules(START_3);
    expect(r.wacc || r.g).toBe(false);
    expect(approved(START_3)).toBe(false);
    expect(approved(BASE)).toBe(true);
    expect(approved({ ...BASE, g: RULES.g[1] + 0.5 })).toBe(false);
  });

  it('nota: 30 / 20 / 20 / 30 y cifras para la lección', () => {
    const s = setupDcf(0);
    const best = { wacc: 9.9, g: 3.7, defend: false, final: BASE };
    expect(dcfResult(s, best).score).toBe(1);
    expect(dcfResult(s, { ...best, defend: true }).score).toBe(0.8);
    expect(dcfResult(s, { ...best, wacc: 8.3, final: START_3 }).score).toBe(0.4);
    const v = dcfValues(s, best);
    expect(v.value).toBeCloseTo(9.35, 2);
    expect(v.tv_share).toBeCloseTo(75.8, 1);
    expect(v.wacc_implied).toBe(9.9);
  });
});
