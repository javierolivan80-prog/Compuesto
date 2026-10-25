import { describe, expect, it } from 'vitest';
import {
  bankResult,
  bankValues,
  justified,
  justifiedOptions,
  justifiedR,
  pvtc,
  pvtcOptions,
  rightPick,
  rote,
  roteOptions,
  setupBank,
  upside,
  upsideR,
} from './bank-valuation';

describe('¿Qué banco compras?', () => {
  it('semilla 0: ROTE del 12 %, P/VTC de 1,10, justificado de 1,25 y Malvarrosa más barata', () => {
    const s = setupBank(0);
    expect(rote(s)).toBe(12);
    expect(roteOptions(s)).toEqual([9.3, 10.5, 12]);
    expect(pvtc(s)).toBe(1.1);
    expect(pvtcOptions(s)).toEqual([0.86, 0.96, 1.1]);
    expect(justified(s)).toBe(1.25);
    expect(justifiedOptions(s)).toEqual([1, 1.2, 1.25]);
    expect(justifiedR(s)).toBe(1.63);
    expect(rightPick(s)).toBe('malvarrosa');
  });

  it('en 10.000 semillas: opciones distintas con la buena y un ganador claro', () => {
    for (let seed = 0; seed < 10_000; seed++) {
      const s = setupBank(seed);
      for (const [opts, right] of [
        [roteOptions(s), rote(s)],
        [pvtcOptions(s), pvtc(s)],
        [justifiedOptions(s), justified(s)],
      ] as const) {
        expect(new Set(opts).size).toBe(3);
        expect(opts).toContain(right);
      }
      expect(Math.abs(upside(s) - upsideR(s))).toBeGreaterThan(0.1);
      expect(s.pvtcR).toBeGreaterThanOrEqual(0.4);
      expect(s.pvtcR).toBeLessThanOrEqual(2.8);
      expect(pvtc(s)).toBeGreaterThan(0.3);
      expect(pvtc(s)).toBeLessThan(2.5);
    }
  });

  it('las semillas cubren los dos ganadores y bancos por encima y por debajo de 1', () => {
    const all = Array.from({ length: 81 }, (_, seed) => setupBank(seed));
    expect(new Set(all.map(rightPick))).toEqual(new Set(['malvarrosa', 'russafa']));
    expect(all.some((s) => justified(s) > 1)).toBe(true);
    expect(all.some((s) => justified(s) < 1)).toBe(true);
    expect(setupBank(9)).toEqual(setupBank(9));
  });

  it('nota y cifras para la lección', () => {
    const s = setupBank(0);
    const best = { rote: 12, pvtc: 1.1, justified: 1.25, pick: 'malvarrosa' as const };
    expect(bankResult(s, best).score).toBe(1);
    expect(bankResult(s, { ...best, pick: 'russafa' }).score).toBe(0.75);
    expect(bankValues(s, best)).toEqual({
      ni: 168,
      equity: 1_600,
      intangibles: 200,
      tangible: 1_400,
      rote: 12,
      roe: 10.5,
      cap: 1_540,
      pvtc: 1.1,
      pvc: 0.96,
      ke: 10,
      g: 2,
      justified: 1.25,
      rote_r: 15,
      pvtc_r: 1.7,
      justified_r: 1.63,
      hits: 4,
    });
    expect(bankValues(s, { rote: 0, pvtc: 0, justified: 0, pick: 'same' }).hits).toBe(0);
  });
});
