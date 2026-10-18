import { describe, expect, it } from 'vitest';
import {
  COMPANIES,
  detectiveResult,
  detectiveValues,
  dupontOf,
  ratiosOf,
  REVEAL_COST,
  setupDetective,
  YEARS,
} from './ratio-detective';

describe('¿quién es quién?', () => {
  it('determinista: un año del universo y las cinco empresas barajadas', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const s = setupDetective(seed);
      expect(setupDetective(seed)).toEqual(s);
      expect(YEARS).toContain(s.year);
      expect([...s.cards].sort()).toEqual([...COMPANIES].sort());
    }
  });

  it('ratios de Naranjas en 2025 a partir de companies.json', () => {
    const r = ratiosOf('naranjas-del-turia', 2025);
    expect(r.ebitMargin).toBeCloseTo((10094 / 58882) * 100, 2);
    expect(r.assetTurnover).toBeCloseTo(58882 / 54913, 2);
    expect(r.stockDays).toBe(70);
    expect(r.collectionDays).toBe(60);
    expect(r.cashConversion).toBeCloseTo(8151 / 7233, 2);
  });

  it('DuPont: margen × rotación × apalancamiento = ROE', () => {
    for (const y of YEARS)
      for (const c of COMPANIES) {
        const d = dupontOf(c, y);
        expect((d.net / d.sales) * (d.sales / d.assets) * (d.assets / d.equity) * 100).toBeCloseTo(
          d.roe,
          1,
        );
      }
  });

  it('cada año, cada empresa se distingue por al menos uno de los tres ratios de salida', () => {
    for (const y of YEARS) {
      const keys = COMPANIES.map((c) => {
        const r = ratiosOf(c, y);
        return `${Math.round(r.ebitMargin / 5)}|${Math.round(r.assetTurnover * 2)}|${r.stockDays > 30}`;
      });
      expect(new Set(keys).size).toBe(COMPANIES.length);
    }
  });

  it('nota: aciertos / 5 menos 0,04 por ratio pedido, sin bajar de 0', () => {
    const s = setupDetective(3);
    expect(detectiveResult(s, s.cards, 0).score).toBe(1);
    expect(detectiveResult(s, s.cards, 2).score).toBeCloseTo(1 - 2 * REVEAL_COST, 3);
    const wrong = [...s.cards].reverse();
    const r = detectiveResult(s, wrong, 5);
    expect(r.hits).toBe(1);
    expect(r.score).toBe(0);
    expect(detectiveResult(s, [null, null, null, null, null], 0).hits).toBe(0);
    expect(detectiveValues(s, r)).toMatchObject({ year: s.year, hits: 1, reveals: 5 });
  });
});
