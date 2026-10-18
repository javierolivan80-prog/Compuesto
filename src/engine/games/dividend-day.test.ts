import { describe, expect, it } from 'vitest';
import {
  BROKERS,
  CAPTURE_QTY,
  cheapestBroker,
  commission,
  dividendResult,
  dividendValues,
  RETENTION,
  setupDividend,
} from './dividend-day';

describe('el primer dividendo', () => {
  it('comisiones: porcentaje con mínimo y tarifa fija; el corte entre 0,10 % y 5 € está en 5.000 €', () => {
    const [llave, fijo, banco] = BROKERS;
    expect(commission(llave!, 500)).toBe(1); // mínimo
    expect(commission(llave!, 7200)).toBe(7.2);
    expect(commission(fijo!, 100)).toBe(5);
    expect(commission(fijo!, 100_000)).toBe(5);
    expect(commission(banco!, 1000)).toBe(8);
    expect(commission(banco!, 7200)).toBe(18);
    expect(commission(llave!, 5000)).toBe(commission(fijo!, 5000));
  });

  it('determinista; el precio de referencia en la fecha ex es el cierre anterior menos el dividendo', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const s = setupDividend(seed);
      expect(setupDividend(seed)).toEqual(s);
      expect(s.pEx).toBeCloseTo(s.pBefore - s.div, 9);
      expect(s.pEnd).toBeGreaterThan(s.pEx);
      expect(s.div).toBeGreaterThanOrEqual(0.3);
      expect(s.div).toBeLessThanOrEqual(0.5);
    }
  });

  it('el bróker más barato depende del tamaño de la orden', () => {
    const winners = new Set<number>();
    for (let seed = 1; seed <= 40; seed++) {
      const s = setupDividend(seed);
      const c = cheapestBroker(s);
      winners.add(c);
      const fees = BROKERS.map((b) => commission(b, s.n * s.p0));
      expect(fees[c]).toBe(Math.min(...fees));
      expect(c).not.toBe(2); // el banco nunca es el más barato en estas órdenes
    }
    expect(winners).toEqual(new Set([0, 1]));
  });

  it('resultado: retención del 19 %, rentabilidad total con el dividendo bruto y coste de cazar el dividendo', () => {
    const s = setupDividend(1);
    const r = dividendResult(s, { broker: 1, capture: false, exGuess: 'down' });
    expect(r.cost).toBeCloseTo(s.n * s.p0 + r.feeBuy, 2);
    expect(r.gross).toBeCloseTo(s.n * s.div, 2);
    expect(r.retained).toBeCloseTo((r.gross * RETENTION) / 100, 2);
    expect(r.net).toBeCloseTo(r.gross - r.retained, 2);
    expect(r.sale).toBeCloseTo(s.n * s.pEnd - r.feeSell, 2);
    expect(r.gain).toBeCloseTo(r.sale - r.cost, 2);
    expect(r.total).toBeCloseTo(((r.gain + r.gross) / r.cost) * 100, 2);
    expect(r.dy).toBeCloseTo((s.div / s.p0) * 100, 2);
    // cazar el dividendo: la bajada se come el dividendo y quedan dos comisiones
    const b = BROKERS[1]!;
    const pl = CAPTURE_QTY * (s.pEx - s.pBefore) + CAPTURE_QTY * s.div;
    expect(pl).toBeCloseTo(0, 9);
    expect(r.capLoss).toBeCloseTo(
      commission(b, CAPTURE_QTY * s.pBefore) + commission(b, CAPTURE_QTY * s.pEx),
      2,
    );
  });

  it('nota: un tercio por bróker más barato, por no cazar el dividendo y por acertar la fecha ex', () => {
    const s = setupDividend(1);
    const best = cheapestBroker(s);
    expect(dividendResult(s, { broker: best, capture: false, exGuess: 'down' }).score).toBe(1);
    expect(dividendResult(s, { broker: 2, capture: true, exGuess: 'same' }).score).toBe(0);
    expect(dividendResult(s, { broker: best, capture: true, exGuess: 'up' }).score).toBeCloseTo(
      0.333,
      3,
    );
    const v = dividendValues(dividendResult(s, { broker: best, capture: false, exGuess: 'down' }));
    expect(v).toMatchObject({ n: 600, p0: 12, div: 0.4, p_ex: 11.72, cap_loss: 10 });
  });
});
