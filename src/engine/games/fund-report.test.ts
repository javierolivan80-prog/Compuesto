import { describe, expect, it } from 'vitest';
import {
  ddOptions,
  endValue,
  maxDrawdown,
  mwr,
  mwrOptions,
  reportResult,
  reportValues,
  roi,
  setupReport,
  sharpe,
  sharpeOptions,
  twr,
  twrOptions,
  vol,
} from './fund-report';

describe('El informe del gestor (N6)', () => {
  it('semilla 0: TWR del 9,97 %, MWR del 4,51 %, caída máxima del 7,89 % y Sharpe de 0,80', () => {
    const s = setupReport(0);
    expect(twr(s)).toBe(9.97);
    expect(twrOptions(s)).toEqual([5.21, 9.97, 10.41]);
    expect(endValue(s)).toBe(20673.94);
    expect(mwr(s)).toBe(4.51);
    expect(roi(s)).toBe(3.37);
    expect(mwrOptions(s)).toEqual([3.37, 4.51, 9.97]);
    expect(maxDrawdown(s)).toBe(7.89);
    expect(ddOptions(s)).toEqual([3.23, 5, 7.89]);
    expect(vol(s)).toBe(9.91);
    expect(sharpe(s)).toBe(0.8);
    expect(sharpeOptions(s)).toEqual([0.8, 1.01, 2.79]);
  });

  it('la TIR del cliente cuadra: lo aportado, capitalizado a la MWR, da el valor final', () => {
    for (let seed = 0; seed < 200; seed++) {
      const s = setupReport(seed);
      const r = mwr(s) / 100;
      const v = s.start * (1 + r) + s.added * Math.sqrt(1 + r);
      expect(Math.abs(v - endValue(s)) / endValue(s)).toBeLessThan(0.0005);
    }
  });

  it('en 10.000 semillas: opciones distintas con la buena', () => {
    for (let seed = 0; seed < 10_000; seed++) {
      const s = setupReport(seed);
      for (const [opts, right] of [
        [twrOptions(s), twr(s)],
        [mwrOptions(s), mwr(s)],
        [ddOptions(s), maxDrawdown(s)],
        [sharpeOptions(s), sharpe(s)],
      ] as const) {
        expect(new Set(opts).size).toBe(3);
        expect(opts).toContain(right);
      }
    }
  });

  it('cifras para la lección: todo bien da 4 aciertos', () => {
    const s = setupReport(0);
    const v = reportValues(s, { twr: 9.97, mwr: 4.51, dd: 7.89, sharpe: 0.8 });
    expect(v).toMatchObject({
      h1: 13.64,
      h2: -3.23,
      twr: 9.97,
      start: 10_000,
      added: 10_000,
      end_value: 20673.94,
      mwr: 4.51,
      roi: 3.37,
      max_dd: 7.89,
      worst_month: 5,
      vol_m: 2.86,
      vol: 9.91,
      rf: 2,
      sharpe: 0.8,
      hits: 4,
    });
    expect(reportResult(s, { twr: 0, mwr: 0, dd: 0, sharpe: 0 }).score).toBe(0);
  });
});
