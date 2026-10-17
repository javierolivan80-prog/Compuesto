import { describe, expect, it } from 'vitest';
import { RATINGS, ratingAtLeast } from '../game-kit';
import {
  CHANCE_PER_ROUND,
  COMPOUND_ROUNDS,
  compoundRounds,
  finalOf,
  growth,
  leaks,
  playCompound,
  randomChoices,
  roundScore,
} from './compound';

const base = { monthly: 200, years: 30, returnPct: 6, feePct: 0, inflationPct: 0 };

describe('growth', () => {
  it('sin rentabilidad ni comisiones es solo lo aportado', () => {
    const f = finalOf({ ...base, returnPct: 0 });
    expect(f.net).toBeCloseTo(200 * 12 * 30, 6);
    expect(f.contributed).toBe(72_000);
  });
  it('con rentabilidad crece más que lo aportado y es creciente cada año', () => {
    const g = growth(base);
    expect(g).toHaveLength(31);
    expect(g.at(-1)!.net).toBeGreaterThan(g.at(-1)!.contributed * 1.8);
    for (let i = 1; i < g.length; i++) expect(g[i]!.net).toBeGreaterThan(g[i - 1]!.net);
  });
  it('coincide con la fórmula de anualidad con tipo mensual equivalente', () => {
    const r = Math.pow(1.06, 1 / 12) - 1;
    const expected = (200 * (Math.pow(1 + r, 360) - 1)) / r;
    expect(finalOf(base).gross).toBeCloseTo(expected, 4);
  });
  it('las comisiones restan y su efecto crece con los años', () => {
    const l10 = leaks({ ...base, years: 10, feePct: 2 }).fees;
    const l30 = leaks({ ...base, years: 30, feePct: 2 }).fees;
    expect(l10).toBeGreaterThan(0);
    expect(l30).toBeGreaterThan(l10 * 3);
    expect(leaks({ ...base, feePct: 0 }).fees).toBeCloseTo(0, 6);
  });
  it('la inflación reduce el valor real', () => {
    const f = finalOf({ ...base, inflationPct: 3 });
    expect(f.real).toBeLessThan(f.net);
    expect(f.real).toBeCloseTo(f.net / Math.pow(1.03, 30), 4);
  });
});

describe('rondas y puntuación', () => {
  it('son deterministas, 3, y su objetivo es alcanzable dentro de los controles', () => {
    expect(compoundRounds(5)).toEqual(compoundRounds(5));
    expect(compoundRounds(5)).not.toEqual(compoundRounds(6));
    for (const r of compoundRounds(9)) {
      const best = finalOf({ ...r, monthly: r.monthlyMax, years: r.yearsMax }).real;
      const worst = finalOf({ ...r, monthly: r.monthlyMin, years: r.yearsMin }).real;
      expect(worst).toBeLessThan(r.target);
      expect(best).toBeGreaterThan(r.target);
    }
    expect(compoundRounds(1)).toHaveLength(COMPOUND_ROUNDS);
  });
  it('roundScore: 1 en el objetivo, baja simétrica en razón y 0 con factor 2', () => {
    expect(roundScore(50_000, 50_000)).toBe(1);
    expect(roundScore(100_000, 50_000)).toBeCloseTo(0, 9);
    expect(roundScore(25_000, 50_000)).toBeCloseTo(0, 9);
    expect(roundScore(0, 50_000)).toBe(0);
    expect(roundScore(70_000, 50_000)).toBeGreaterThan(0.4);
  });
  it('una partida perfecta saca AAA', () => {
    const rounds = compoundRounds(4);
    const perfect = rounds.map((r) => {
      let best = { monthly: r.monthlyMin, years: r.yearsMin, err: Infinity };
      for (let m = r.monthlyMin; m <= r.monthlyMax; m += r.monthlyStep)
        for (let y = r.yearsMin; y <= r.yearsMax; y++) {
          const err = Math.abs(Math.log(finalOf({ ...r, monthly: m, years: y }).real / r.target));
          if (err < best.err) best = { monthly: m, years: y, err };
        }
      return best;
    });
    expect(playCompound(4, perfect).rating).toBe('AAA');
  });
  it('misma semilla y elecciones → mismo resultado', () => {
    const c = randomChoices(8);
    expect(playCompound(8, c)).toEqual(playCompound(8, c));
  });
});

describe('JUEGOS §5: jugar al azar saca ≤ B', () => {
  it('la puntuación media al azar coincide con el azar descontado', () => {
    let sum = 0;
    const n = 400;
    for (let s = 1; s <= n; s++)
      compoundRounds(s).forEach((r, i) => {
        const c = randomChoices(s)[i]!;
        sum += roundScore(finalOf({ ...r, ...c }).real, r.target);
      });
    const mean = sum / (n * COMPOUND_ROUNDS);
    expect(Math.abs(mean - CHANCE_PER_ROUND)).toBeLessThan(0.03);
  });
  it('en 1.000 partidas al azar ≥ 97 % son B, ≥ 99,5 % no pasan de BB y ninguna llega a AA', () => {
    const counts: Record<string, number> = Object.fromEntries(RATINGS.map((r) => [r, 0]));
    const n = 1000;
    for (let s = 1; s <= n; s++) counts[playCompound(s, randomChoices(s)).rating]!++;
    expect(counts['B']! / n).toBeGreaterThanOrEqual(0.97);
    const aboveBB = RATINGS.filter((r) => ratingAtLeast(r, 'BBB')).reduce(
      (a, r) => a + counts[r]!,
      0,
    );
    expect(aboveBB / n).toBeLessThanOrEqual(0.005);
    expect(counts['AAA']! + counts['AA']!).toBe(0);
  });
});
