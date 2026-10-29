import { describe, expect, it } from 'vitest';
import {
  commission,
  costOptions,
  driftBp,
  explicitCost,
  itf,
  setupVwap,
  shortfallBp,
  shortfallOptions,
  tradeValue,
  vsVwapBp,
  vwap,
  vwapOptions,
  vwapResult,
  vwapValues,
} from './vwap-desk';

describe('Contra el VWAP (N5)', () => {
  it('semilla 0: VWAP de 10,106 €, shortfall de 80 pb, 1.260 € de costes explícitos y subasta de cierre', () => {
    const s = setupVwap(0);
    expect(vwap(s)).toBe(10.106);
    expect(vwapOptions(s)).toEqual([10.1, 10.106, 10.16]);
    expect(shortfallBp(s)).toBe(80);
    expect(vsVwapBp(s)).toBe(-25.7);
    expect(driftBp(s)).toBe(106);
    expect(shortfallOptions(s)).toEqual([-25.7, 80, 106]);
    expect(tradeValue(s)).toBe(504_000);
    expect(commission(s)).toBe(252);
    expect(itf(s)).toBe(1008);
    expect(explicitCost(s)).toBe(1260);
    expect(costOptions(s)).toEqual([252, 1008, 1260]);
    expect(s.venue).toBe('close');
  });

  it('en 10.000 semillas: opciones distintas con la buena', () => {
    for (let seed = 0; seed < 10_000; seed++) {
      const s = setupVwap(seed);
      for (const [opts, right] of [
        [vwapOptions(s), vwap(s)],
        [shortfallOptions(s), shortfallBp(s)],
        [costOptions(s), explicitCost(s)],
      ] as const) {
        expect(new Set(opts).size).toBe(3);
        expect(opts).toContain(right);
      }
    }
  });

  it('el impuesto solo entra en las compras de empresas grandes; hay los tres clientes', () => {
    const all = Array.from({ length: 200 }, (_, seed) => setupVwap(seed));
    for (const s of all)
      expect(explicitCost(s)).toBe(
        s.costCase === 'buy-large'
          ? Math.round((commission(s) + itf(s)) * 100) / 100
          : commission(s),
      );
    expect(new Set(all.map((s) => s.costCase)).size).toBe(3);
    expect(new Set(all.map((s) => s.venue)).size).toBe(3);
    expect(setupVwap(7)).toEqual(setupVwap(7));
  });

  it('cifras para la lección: todo bien da 4 aciertos', () => {
    const s = setupVwap(0);
    const v = vwapValues(s, {
      vwap: vwap(s),
      shortfall: shortfallBp(s),
      cost: explicitCost(s),
      venue: 'close',
    });
    expect(v).toMatchObject({
      arrival: 10,
      p1: 10.04,
      p2: 10.1,
      p3: 10.16,
      v1: 20_000,
      v2: 50_000,
      v3: 30_000,
      d1_c: 4,
      d2_c: 10,
      d3_c: 16,
      fill_c: 8,
      vwap: 10.106,
      twap: 10.1,
      fill: 10.08,
      shortfall_bp: 80,
      vs_vwap_bp: -25.7,
      drift_bp: 106,
      qty: 50_000,
      value: 504_000,
      comm_bp: 5,
      commission: 252,
      itf: 1008,
      itf_applies: 1,
      explicit: 1260,
      hits: 4,
    });
    expect(vwapResult(s, { vwap: 0, shortfall: 0, cost: 0, venue: 'now' }).score).toBe(0);
  });
});
