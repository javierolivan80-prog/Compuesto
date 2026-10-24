import { describe, expect, it } from 'vitest';
import {
  apr,
  CET1_REFERENCE,
  cet1Options,
  cet1Ratio,
  lcr,
  lcrOptions,
  nii,
  niiOptions,
  setupStress,
  stressedRatio,
  stressOptions,
  stressResult,
  stressValues,
} from './stress-test';

describe('Stress test', () => {
  it('semilla 0: margen de 620, CET1 del 13,0 %, 8,2 % estresado y LCR del 150,0 %', () => {
    const s = setupStress(0);
    expect(nii(s)).toBe(620);
    expect(niiOptions(s)).toEqual([600, 620, 800]);
    expect(apr(s)).toBe(12_200);
    expect(cet1Ratio(s)).toBe(13);
    expect(cet1Options(s)).toEqual([8, 10.7, 13]);
    expect(stressedRatio(s)).toBe(8.2);
    expect(stressOptions(s)).toEqual([8.2, 9, 11.8]);
    expect(lcr(s)).toBe(150);
    expect(lcrOptions(s)).toEqual([66.7, 112.5, 150]);
  });

  it('en 10.000 semillas: opciones distintas con la buena y cifras realistas', () => {
    for (let seed = 0; seed < 10_000; seed++) {
      const s = setupStress(seed);
      expect(setupStress(seed)).toEqual(s);
      expect(s.mortgages + s.corporates).toBe(s.loans);
      for (const [opts, right] of [
        [niiOptions(s), nii(s)],
        [cet1Options(s), cet1Ratio(s)],
        [stressOptions(s), stressedRatio(s)],
        [lcrOptions(s), lcr(s)],
      ] as const) {
        expect(new Set(opts).size).toBe(3);
        expect(opts).toContain(right);
      }
      expect(cet1Ratio(s)).toBeGreaterThanOrEqual(11.5);
      expect(cet1Ratio(s)).toBeLessThanOrEqual(15.5);
      expect(stressedRatio(s)).toBeGreaterThan(4);
      expect(stressedRatio(s)).toBeLessThan(cet1Ratio(s));
      expect(lcr(s)).toBeGreaterThan(100);
      expect(lcr(s)).toBeLessThanOrEqual(200);
    }
  });

  it('las semillas cubren bancos que aguantan el 7 % y bancos que caen por debajo', () => {
    const all = Array.from({ length: 81 }, (_, seed) => stressedRatio(setupStress(seed)));
    expect(all.some((r) => r >= CET1_REFERENCE)).toBe(true);
    expect(all.some((r) => r < CET1_REFERENCE)).toBe(true);
  });

  it('nota y cifras para la lección', () => {
    const s = setupStress(0);
    const best = { nii: 620, cet1: 13, stressed: 8.2, lcr: 150 };
    expect(stressResult(s, best).score).toBe(1);
    expect(stressResult(s, { ...best, lcr: 112.5 }).score).toBe(0.75);
    expect(stressValues(s, best)).toEqual({
      loans: 20_000,
      deposits: 18_000,
      r_loans: 4,
      r_deposits: 1,
      nii: 620,
      mortgages: 12_000,
      corporates: 8_000,
      apr: 12_200,
      cet1: 1_590,
      k_cet1: 0.13,
      m_loss: 0.04,
      k_hqla: 1.5,
      cet1_ratio: 13,
      losses: 490,
      apr_rise: 10,
      stressed_ratio: 8.2,
      hqla: 2_700,
      outflows: 2_400,
      inflows: 600,
      lcr: 150,
      hits: 4,
    });
    expect(stressValues(s, { nii: 0, cet1: 0, stressed: 0, lcr: 0 }).hits).toBe(0);
  });
});
