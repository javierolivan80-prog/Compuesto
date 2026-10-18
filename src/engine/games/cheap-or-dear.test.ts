import { describe, expect, it } from 'vitest';
import {
  CASES,
  cheapResult,
  cheapValues,
  fundamentalsOf,
  meanOf,
  medianOf,
  priceFromEvEbitda,
  priceFromPe,
  rightVerdict,
  setupCheap,
} from './cheap-or-dear';

describe('¿cara o barata?', () => {
  it('fundamentales de Naranjas en 2025 desde companies.json', () => {
    const f = fundamentalsOf('naranjas-del-turia');
    expect(f.eps).toBe(0.6);
    expect(f.ebitda).toBe(10094 + 1682);
    expect(f.netDebt).toBe(12000 - 15385);
  });

  it('determinista; cinco comparables por empresa, uno raro que tira de la media pero no de la mediana', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const s = setupCheap(seed);
      expect(setupCheap(seed)).toEqual(s);
      for (const c of s.cases) {
        expect(c.peers).toHaveLength(5);
        const pes = c.peers.map((p) => p.pe);
        expect(Math.max(...pes)).toBeGreaterThan(2.5 * medianOf(pes));
        expect(meanOf(pes)).toBeGreaterThan(medianOf(pes) * 1.3);
        expect(c.price).toBeGreaterThan(0);
      }
    }
  });

  it('el precio que implica cada múltiplo', () => {
    expect(priceFromPe('naranjas-del-turia', 15)).toBe(9);
    // EV/EBITDA: (11.776 × 8 + 3.385 de caja neta) × 1.000 / 12.000.000
    expect(priceFromEvEbitda('naranjas-del-turia', 8)).toBeCloseTo(
      ((11776 * 8 + 3385) * 1000) / 12e6,
      2,
    );
  });

  it('veredicto: cara o barata fuera de ±10 % del valor por la mediana del PER, y aparecen los tres', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 30; seed++)
      for (const c of setupCheap(seed).cases) {
        const v = rightVerdict(c);
        seen.add(v);
        const value = priceFromPe(c.id, medianOf(c.peers.map((p) => p.pe)));
        if (v === 'cheap') expect(c.price).toBeLessThan(value * 0.9);
        if (v === 'dear') expect(c.price).toBeGreaterThan(value * 1.1);
      }
    expect(seen).toEqual(new Set(['cheap', 'fair', 'dear']));
  });

  it('nota: 40 % por la mediana y 60 % por el veredicto', () => {
    const s = setupCheap(2);
    const right = s.cases.map((c) => ({
      pe: medianOf(c.peers.map((p) => p.pe)),
      verdict: rightVerdict(c),
    }));
    expect(cheapResult(s, right).score).toBe(1);
    const meanOnly = s.cases.map((c) => ({
      pe: meanOf(c.peers.map((p) => p.pe)),
      verdict: rightVerdict(c),
    }));
    expect(cheapResult(s, meanOnly).score).toBeCloseTo(0.6, 3);
    expect(cheapResult(s, []).score).toBe(0);
    const v = cheapValues(s, cheapResult(s, right));
    expect(v.value_pe).toBeCloseTo(0.6 * v.pe_median!, 2);
    expect(CASES).toContain('naranjas-del-turia');
  });
});
