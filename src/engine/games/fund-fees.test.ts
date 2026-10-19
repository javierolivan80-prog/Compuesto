import { describe, expect, it } from 'vitest';
import {
  diffOptions,
  finals,
  fundResult,
  fundValues,
  rightDiff,
  setupFunds,
  SITUATIONS,
  switchOutcome,
} from './fund-fees';

describe('Dos fondos, veinte años', () => {
  it('semilla 0: 10.000 € al 4,2 % y al 5,8 % netos durante 20 años', () => {
    const s = setupFunds(0);
    const f = finals(s);
    expect(Math.round(f.dear)).toBe(22770);
    expect(Math.round(f.cheap)).toBe(30883);
    expect(rightDiff(s)).toBe(8100);
    expect(diffOptions(s)).toEqual([3200, 8100, 20900]);
  });

  it('traspasar deja más dinero que vender y volver a comprar', () => {
    const s = setupFunds(0);
    const tr = switchOutcome(s, true);
    const sell = switchOutcome(s, false);
    expect(sell.tax).toBe(760);
    expect(sell.invested).toBe(13240);
    expect(tr.end).toBeGreaterThan(sell.end);
  });

  it('en todas las semillas, tres opciones distintas y la buena entre ellas', () => {
    for (let seed = 0; seed <= 40; seed++) {
      const s = setupFunds(seed);
      expect(setupFunds(seed)).toEqual(s);
      expect(new Set(diffOptions(s)).size).toBe(3);
      expect(diffOptions(s)).toContain(rightDiff(s));
      expect(s.terCheap).toBeLessThan(s.terDear);
    }
  });

  it('nota 35 / 35 / 30 y cifras para la lección', () => {
    const s = setupFunds(0);
    const vehicles = SITUATIONS.map((x) => x.right);
    const best = { diff: rightDiff(s), vehicles: [...vehicles], transfer: true };
    expect(fundResult(s, best).score).toBe(1);
    expect(fundResult(s, { ...best, transfer: false }).score).toBe(0.7);
    const v = fundValues(s, best);
    expect(v.tax).toBe(760);
    expect(v.diff).toBe(Math.round(finals(s).diff));
    expect(v.vehicle_hits).toBe(4);
  });
});
