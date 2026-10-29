import { describe, expect, it } from 'vitest';
import {
  ask,
  darkSaving,
  deskResult,
  deskValues,
  effectiveBp,
  effectiveOptions,
  impactBp,
  mid5,
  quotedBp,
  realizedBp,
  realizedOptions,
  rightMove,
  savingOptions,
  setupDesk,
} from './order-desk';

describe('Mesa de órdenes (N5)', () => {
  it('semilla 0: efectiva de 60 pb, realizada de 10 pb, 1.200 € de ahorro y ensanchar', () => {
    const s = setupDesk(0);
    expect(ask(s)).toBe(10.02);
    expect(effectiveBp(s)).toBe(60);
    expect(effectiveOptions(s)).toEqual([30, 40, 60]);
    expect(mid5(s)).toBe(10.015);
    expect(realizedBp(s)).toBe(10);
    expect(impactBp(s)).toBe(30);
    expect(realizedOptions(s)).toEqual([10, 30, 40]);
    expect(darkSaving(s)).toBe(1200);
    expect(savingOptions(s)).toEqual([400, 800, 1200]);
    expect(rightMove(s)).toBe('widen');
  });

  it('la horquilla del market maker, que vendió al ask, es la realizada más el impacto', () => {
    for (let seed = 0; seed < 200; seed++) {
      const s = setupDesk(seed);
      expect(realizedBp(s) + impactBp(s)).toBeCloseTo(quotedBp(s), 0);
    }
  });

  it('en 10.000 semillas: opciones distintas con la buena', () => {
    for (let seed = 0; seed < 10_000; seed++) {
      const s = setupDesk(seed);
      for (const [opts, right] of [
        [effectiveOptions(s), effectiveBp(s)],
        [realizedOptions(s), realizedBp(s)],
        [savingOptions(s), darkSaving(s)],
      ] as const) {
        expect(new Set(opts).size).toBe(3);
        expect(opts).toContain(right);
      }
    }
  });

  it('las semillas cubren flujo informado y equilibrado, y horquillas realizadas negativas', () => {
    const all = Array.from({ length: 81 }, (_, seed) => setupDesk(seed));
    expect(new Set(all.map(rightMove))).toEqual(new Set(['widen', 'keep']));
    expect(all.some((s) => realizedBp(s) < 0)).toBe(true);
    expect(setupDesk(5)).toEqual(setupDesk(5));
  });

  it('nota y cifras para la lección', () => {
    const s = setupDesk(0);
    const best = { effective: 60, realized: 10, saving: 1200, move: 'widen' as const };
    expect(deskResult(s, best).score).toBe(1);
    expect(deskResult(s, { ...best, move: 'keep' }).score).toBe(0.75);
    expect(deskValues(s, best)).toEqual({
      mid: 10,
      half_c: 2,
      lit_c: 6,
      bid: 9.98,
      ask: 10.02,
      fill: 10.03,
      quoted_bp: 40,
      effective_bp: 60,
      mid5: 10.015,
      realized_bp: 10,
      impact_bp: 30,
      qty: 20_000,
      lit_avg: 10.06,
      saving: 1200,
      informed: 1,
      hits: 4,
    });
  });
});
