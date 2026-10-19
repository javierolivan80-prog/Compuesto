import { describe, expect, it } from 'vitest';
import {
  dividendOptions,
  futurePnl,
  minDividend,
  pnlOptions,
  PRODUCTS,
  savingOptions,
  setupWindow,
  taxSaving,
  windowResult,
  windowValues,
} from './bank-window';

describe('El escaparate del banco', () => {
  it('semilla 0: 1.500 € al 30 % ahorran 450 €; 1.000 mil € de alquileres obligan a repartir 800; el futuro gana 80', () => {
    const s = setupWindow(0);
    expect(taxSaving(s)).toBe(450);
    expect(savingOptions(s)).toEqual([285, 450, 1500]);
    expect(minDividend(s)).toBe(800);
    expect(dividendOptions(s)).toEqual([500, 800, 1000]);
    expect(futurePnl(s)).toBe(80);
    expect(pnlOptions(s)).toEqual([-80, 8, 80]);
  });

  it('en todas las semillas, tres opciones distintas con la buena entre ellas', () => {
    for (let seed = 0; seed <= 40; seed++) {
      const s = setupWindow(seed);
      expect(setupWindow(seed)).toEqual(s);
      for (const [opts, good] of [
        [savingOptions(s), taxSaving(s)],
        [dividendOptions(s), minDividend(s)],
        [pnlOptions(s), futurePnl(s)],
      ] as const) {
        expect(new Set(opts).size).toBe(3);
        expect(opts).toContain(good);
      }
    }
  });

  it('nota y cifras para la lección', () => {
    const s = setupWindow(0);
    const best = { complex: PRODUCTS.map((p) => p.complex), saving: 450, dividend: 800, pnl: 80 };
    expect(windowResult(s, best).score).toBe(1);
    expect(windowResult(s, { ...best, complex: [true, true, true, true] }).score).toBe(0.875);
    expect(windowValues(s, best)).toMatchObject({
      saving: 450,
      min_dividend: 800,
      pnl: 80,
      complex_hits: 4,
    });
  });
});
