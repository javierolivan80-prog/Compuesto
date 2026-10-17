import { describe, expect, it } from 'vitest';
import { DEFAULT_REGIMES, logReturns, marketPath } from './market';

const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
const sd = (a: number[]) => {
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1));
};
const kurtosis = (a: number[]) => {
  const m = mean(a);
  const s2 = a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length;
  return a.reduce((s, x) => s + (x - m) ** 4, 0) / a.length / s2 ** 2 - 3;
};

describe('marketPath', () => {
  it('es determinista por semilla y distinto con otra', () => {
    const a = marketPath({ seed: 1, steps: 200 });
    expect(marketPath({ seed: 1, steps: 200 })).toEqual(a);
    expect(marketPath({ seed: 2, steps: 200 }).prices).not.toEqual(a.prices);
  });
  it('tiene steps+1 precios, positivos y finitos; parte del precio inicial', () => {
    const p = marketPath({ seed: 5, steps: 1000, start: 42 });
    expect(p.prices).toHaveLength(1001);
    expect(p.prices[0]).toBe(42);
    expect(p.regimes).toHaveLength(1000);
    expect(p.prices.every((x) => x > 0 && Number.isFinite(x))).toBe(true);
  });
  it('con 0 pasos devuelve solo el precio inicial', () => {
    expect(marketPath({ seed: 1, steps: 0 }).prices).toEqual([100]);
  });
  it('rechaza pasos inválidos o sin regímenes', () => {
    expect(() => marketPath({ seed: 1, steps: -1 })).toThrow();
    expect(() => marketPath({ seed: 1, steps: 1.5 })).toThrow();
    expect(() => marketPath({ seed: 1, steps: 5, regimes: [] })).toThrow();
  });
  it('la volatilidad empírica coincide con sigma (un régimen, sin saltos)', () => {
    const sigma = 0.01;
    const p = marketPath({
      seed: 9,
      steps: 40_000,
      regimes: [{ name: 'x', mu: 0, sigma }],
      jumpProb: 0,
    });
    const r = logReturns(p.prices);
    expect(sd(r)).toBeGreaterThan(sigma * 0.97);
    expect(sd(r)).toBeLessThan(sigma * 1.03);
  });
  it('la rentabilidad media por paso coincide con mu (sin saltos)', () => {
    const mu = 0.001;
    const sigma = 0.01;
    const p = marketPath({
      seed: 3,
      steps: 60_000,
      regimes: [{ name: 'x', mu, sigma }],
      jumpProb: 0,
    });
    const simple = p.prices.slice(1).map((x, i) => x / p.prices[i]! - 1);
    // error típico de la media: sigma / sqrt(n) ≈ 4e-5; 5 errores de margen
    expect(Math.abs(mean(simple) - mu)).toBeLessThan((5 * sigma) / Math.sqrt(60_000));
  });
  it('los saltos engordan las colas (curtosis en exceso)', () => {
    const base = { seed: 4, steps: 30_000, regimes: [{ name: 'x', mu: 0, sigma: 0.008 }] };
    const sin = kurtosis(logReturns(marketPath({ ...base, jumpProb: 0 }).prices));
    const con = kurtosis(logReturns(marketPath({ ...base, jumpProb: 0.02, jumpSd: 0.05 }).prices));
    expect(Math.abs(sin)).toBeLessThan(0.3);
    expect(con).toBeGreaterThan(3);
  });
  it('el número de saltos se acerca a jumpProb × pasos', () => {
    const p = marketPath({ seed: 6, steps: 20_000, jumpProb: 0.01 });
    expect(p.jumps.length).toBeGreaterThan(150);
    expect(p.jumps.length).toBeLessThan(250);
  });
  it('visita todos los regímenes y respeta que cada uno exista', () => {
    const p = marketPath({ seed: 8, steps: 20_000, switchProb: 0.02 });
    expect(new Set(p.regimes)).toEqual(new Set(DEFAULT_REGIMES.map((_, i) => i)));
  });
  it('el régimen de pánico es más volátil que el de calma', () => {
    const p = marketPath({ seed: 10, steps: 60_000, switchProb: 0.02, jumpProb: 0 });
    const r = logReturns(p.prices);
    const by = (k: number) => r.filter((_, i) => p.regimes[i] === k);
    expect(sd(by(2))).toBeGreaterThan(sd(by(0)) * 2);
  });
  it('con switchProb 0 se queda en el primer régimen', () => {
    const p = marketPath({ seed: 1, steps: 500, switchProb: 0 });
    expect(new Set(p.regimes)).toEqual(new Set([0]));
  });
});
