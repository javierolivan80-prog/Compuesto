import { describe, expect, it } from 'vitest';
import companies from '../../../content/shared/companies.json';
import {
  applyEntry,
  balanceResult,
  balances,
  balanceValues,
  classified,
  classify,
  finished,
  OPENING,
  post,
  setupBalance,
  SIDE_OF,
  startBalance,
  TO_CLASSIFY,
  totals,
  type BalanceState,
  type Side,
} from './balance-builder';

const playAll = (seed: number, side: (id: (typeof TO_CLASSIFY)[number]) => Side, right = true) => {
  const setup = setupBalance(seed);
  let s: BalanceState = startBalance(setup);
  for (const id of setup.order) s = classify(s, side(id));
  for (const op of setup.ops) s = post(s, right ? op.right : (op.right + 1) % 3);
  return s;
};

describe('cuadra el balance', () => {
  it('el balance de partida es el de Naranjas del Turia a 31/12/2024 en companies.json y cuadra', () => {
    const nar = (
      companies as { id: string; years: { year: number; balance: Record<string, number> }[] }[]
    )
      .find((c) => c.id === 'naranjas-del-turia')!
      .years.find((y) => y.year === 2024)!.balance;
    for (const k of [
      'caja',
      'clientes',
      'existencias',
      'inmovilizado',
      'proveedores',
      'deuda',
      'capital',
      'reservas',
    ] as const)
      expect(OPENING[k]).toBe(nar[k]);
    const t = totals(OPENING);
    expect(t.activo).toBe(nar.total_activo);
    expect(t.pasivo).toBe(nar.total_pasivo);
    expect(t.patrimonio).toBe(nar.total_patrimonio);
    expect(t.diff).toBe(0);
  });

  it('determinista; cada operación tiene un apunte correcto que cuadra y tres opciones distintas', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const s = setupBalance(seed);
      expect(setupBalance(seed)).toEqual(s);
      expect([...s.order].sort()).toEqual([...TO_CLASSIFY].sort());
      for (const op of s.ops) {
        expect(op.options).toHaveLength(3);
        expect(balances(op.options[op.right]!)).toBe(true);
        expect(new Set(op.options.map((o) => JSON.stringify(o))).size).toBe(3);
      }
      const sale = s.ops.find((o) => o.id === 'sale')!;
      expect(sale.cost! / sale.amount).toBeCloseTo(0.62, 2);
    }
  });

  it('el apunte de una sola partida descuadra; el resto de errores cuadran pero tocan la partida equivocada', () => {
    const s = setupBalance(1);
    const loan = s.ops.find((o) => o.id === 'loan')!;
    const unbalanced = loan.options.filter((o) => !balances(o));
    expect(unbalanced).toHaveLength(1);
    expect(Object.keys(unbalanced[0]!)).toEqual(['caja']);
  });

  it('jugando bien: el balance sigue cuadrando y las cifras finales salen de las operaciones', () => {
    const s = playAll(3, (id) => SIDE_OF[id]);
    expect(classified(s) && finished(s)).toBe(true);
    expect(totals(s.balance).diff).toBe(0);
    const r = balanceResult(s);
    expect(r.classifyHits).toBe(8);
    expect(r.postHits).toBe(5);
    expect(r.score).toBe(1);
    expect(r.cashEnd).toBe(OPENING.caja + r.loan - r.machine - r.suppliers - r.dividend);
    expect(r.debtEnd).toBe(OPENING.deuda + r.loan);
    expect(r.result).toBe(r.margin);
    expect(r.equityEnd).toBe(r.equityStart + r.margin - r.dividend);
    expect(r.totalEnd).toBe(r.totalStart + r.loan + r.sale - r.cost - r.suppliers - r.dividend);
  });

  it('jugando mal: la nota baja, pero el balance avanza con el apunte correcto (las cifras no cambian)', () => {
    const good = balanceResult(playAll(3, (id) => SIDE_OF[id]));
    const bad = balanceResult(playAll(3, () => 'activo', false));
    expect(bad.classifyHits).toBe(4);
    expect(bad.postHits).toBe(0);
    expect(bad.score).toBeCloseTo(0.2, 3);
    expect(balanceValues(bad).cash_end).toBe(balanceValues(good).cash_end);
  });

  it('no se puede clasificar ni apuntar de más', () => {
    const s = playAll(5, (id) => SIDE_OF[id]);
    expect(classify(s, 'activo')).toBe(s);
    expect(post(s, 0)).toBe(s);
    const fresh = startBalance(setupBalance(5));
    expect(post(fresh, 0)).toBe(fresh);
  });

  it('applyEntry no muta el balance', () => {
    const b = { ...OPENING };
    applyEntry(b, { caja: 5 });
    expect(b).toEqual(OPENING);
  });
});
