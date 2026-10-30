import { describe, expect, it } from 'vitest';
import {
  borrowFee,
  callOptions,
  callPrice,
  duty,
  feeOptions,
  p1,
  pnl,
  pnlOptions,
  setupShort,
  shortResult,
  shortValues,
  wipePrice,
} from './short-desk';

describe('La posición corta (N5)', () => {
  it('semilla 0: comisión de 1.000 €, resultado de 20.000 €, llamada de margen a 23,08 € y notificar', () => {
    const s = setupShort(0);
    expect(p1(s)).toBe(17.5);
    expect(borrowFee(s)).toBe(1000);
    expect(feeOptions(s)).toEqual([875, 1000, 4000]);
    expect(pnl(s)).toBe(20_000);
    expect(pnlOptions(s)).toEqual([20_000, 24_000, 25_000]);
    expect(callPrice(s)).toBe(23.08);
    expect(callOptions(s)).toEqual([23.08, 26, 30]);
    expect(wipePrice(s)).toBe(30);
    expect(duty(s)).toBe('notify');
  });

  it('en 10.000 semillas: opciones distintas con la buena', () => {
    for (let seed = 0; seed < 10_000; seed++) {
      const s = setupShort(seed);
      for (const [opts, right] of [
        [feeOptions(s), borrowFee(s)],
        [pnlOptions(s), pnl(s)],
        [callOptions(s), callPrice(s)],
      ] as const) {
        expect(new Set(opts).size).toBe(3);
        expect(opts).toContain(right);
      }
    }
  });

  it('hay cortos que ganan y que pierden, y las tres obligaciones', () => {
    const all = Array.from({ length: 200 }, (_, seed) => setupShort(seed));
    expect(all.some((s) => pnl(s) > 0)).toBe(true);
    expect(all.some((s) => pnl(s) < 0)).toBe(true);
    expect(new Set(all.map(duty))).toEqual(new Set(['none', 'notify', 'publish']));
    expect(setupShort(9)).toEqual(setupShort(9));
  });

  it('cifras para la lección: todo bien da 4 aciertos', () => {
    const s = setupShort(0);
    const v = shortValues(s, { fee: 1000, pnl: 20_000, call: 23.08, duty: 'notify' });
    expect(v).toMatchObject({
      qty: 10_000,
      p0: 20,
      p1: 17.5,
      move_pct: -12.5,
      rate: 2,
      days: 90,
      fee: 1000,
      gross: 25_000,
      div: 0.4,
      div_paid: 4000,
      pnl: 20_000,
      mm: 30,
      call_price: 23.08,
      wipe_price: 30,
      short_pct: 0.15,
      duty: 1,
      hits: 4,
    });
    expect(shortResult(s, { fee: 0, pnl: 0, call: 0, duty: 'none' }).score).toBe(0);
  });
});
