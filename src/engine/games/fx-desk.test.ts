import { describe, expect, it } from 'vitest';
import {
  accountOptions,
  carryOptions,
  carryReturn,
  currentAccount,
  forward,
  forwardOptions,
  fxDeskResult,
  fxDeskValues,
  setupFxDesk,
} from './fx-desk';

describe('La mesa de divisas', () => {
  it('semilla 0: cuenta corriente +12, forward 1,1216, carry −2,5 % y el país B vulnerable', () => {
    const s = setupFxDesk(0);
    expect(currentAccount(s)).toBe(12);
    expect(accountOptions(s)).toEqual([-12, 12, 20]);
    expect(forward(s)).toBe(1.1216);
    expect(forwardOptions(s)).toEqual([1.0788, 1.1, 1.1216]);
    expect(carryReturn(s)).toBe(-2.5);
    expect(carryOptions(s)).toEqual([-2.5, 8, 18.5]);
    expect(s.vulnerable).toBe('b');
  });

  it('en todas las semillas: opciones distintas con la buena y el país vulnerable claro', () => {
    for (let seed = 0; seed <= 80; seed++) {
      const s = setupFxDesk(seed);
      expect(setupFxDesk(seed)).toEqual(s);
      expect(new Set(accountOptions(s)).size).toBe(3);
      expect(accountOptions(s)).toContain(currentAccount(s));
      expect(new Set(forwardOptions(s)).size).toBe(3);
      expect(forwardOptions(s)).toContain(forward(s));
      expect(new Set(carryOptions(s)).size).toBe(3);
      expect(carryOptions(s)).toContain(carryReturn(s));
      expect(carryReturn(s)).not.toBe(0);
      const [weakCc, weakDebt, strongCc, strongDebt] =
        s.vulnerable === 'a' ? [s.ccA, s.debtA, s.ccB, s.debtB] : [s.ccB, s.debtB, s.ccA, s.debtA];
      expect(weakCc).toBeLessThan(strongCc);
      expect(weakDebt).toBeGreaterThan(strongDebt);
      // el forward cotiza con prima si el dólar rinde más, y con descuento si rinde menos
      expect(forward(s) > s.spot).toBe(s.iUsd > s.iEur);
    }
  });

  it('las semillas cubren superávit y déficit, carry con ganancia y con pérdida, y los dos países', () => {
    const all = Array.from({ length: 81 }, (_, seed) => setupFxDesk(seed));
    expect(new Set(all.map((s) => Math.sign(currentAccount(s))))).toEqual(new Set([1, -1]));
    expect(new Set(all.map((s) => Math.sign(carryReturn(s))))).toEqual(new Set([1, -1]));
    expect(new Set(all.map((s) => s.vulnerable))).toEqual(new Set(['a', 'b']));
  });

  it('nota y cifras para la lección', () => {
    const s = setupFxDesk(0);
    const best = { account: 12, forward: 1.1216, carry: -2.5, country: 'b' as const };
    expect(fxDeskResult(s, best).score).toBe(1);
    expect(fxDeskResult(s, { ...best, country: 'same' }).score).toBe(0.75);
    expect(fxDeskValues(s, best)).toEqual({
      exports: 320,
      imports: 300,
      trade_balance: 20,
      income: -8,
      current_account: 12,
      spot: 1.1,
      i_eur: 2,
      i_usd: 4,
      forward: 1.1216,
      i_high: 10,
      i_fund: 2,
      depreciation: 10.5,
      carry: -2.5,
      hits: 4,
    });
    expect(fxDeskValues(s, { account: 0, forward: 0, carry: 0, country: 'a' }).hits).toBe(0);
  });
});
