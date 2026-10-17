import { mulberry32 } from '../prng';
import { gamesData } from '../../content/games-data';
import { addTally, emptyTally, makeResult, type GameResult } from './common';

/* Cuadra tu presupuesto (juego 2 en el Nivel 0): ingresos, gastos y ahorro; la balanza se inclina según cuadre. */

export type BudgetCategory = 'ingreso' | 'gasto' | 'ahorro';
export const BUDGET_CATEGORIES: readonly BudgetCategory[] = ['ingreso', 'gasto', 'ahorro'];

export interface BudgetItem {
  id: string;
  label: string;
  amount: number;
  category: BudgetCategory;
}

export const BUDGET_ROUNDS = 3;
/** Partidas por ronda (dificultad creciente). */
export const BUDGET_ITEMS_PER_ROUND = [5, 7, 9] as const;

type Template = (typeof gamesData.presupuesto.items)[number];

/**
 * Partidas de una ronda: siempre cuadran (ingresos = gastos + ahorro) si se colocan bien.
 * Se eligen primero gastos y ahorros; los ingresos se ajustan para igualar la suma (o aparece «Lo que sobra» como ahorro).
 */
export function budgetRound(
  seed: number,
  round: number,
  pool: readonly Template[] = gamesData.presupuesto.items,
): BudgetItem[] {
  const rnd = mulberry32(seed + round * 7919);
  const n = BUDGET_ITEMS_PER_ROUND[Math.min(round, BUDGET_ITEMS_PER_ROUND.length - 1)]!;
  const pick = (cat: BudgetCategory, k: number): Template[] => {
    const c = pool.filter((p) => p.category === cat);
    const order = c.map((_, i) => i).sort(() => rnd() - 0.5);
    return order.slice(0, k).map((i) => c[i]!);
  };
  const nIncome = Math.max(1, Math.round(n * 0.3));
  const nSaving = Math.max(1, Math.round(n * 0.25));
  const nExpense = n - nIncome - nSaving;
  const amount = (t: Template) => {
    const step = t.max > 200 ? 10 : 5;
    return Math.round((t.min + rnd() * (t.max - t.min)) / step) * step;
  };
  const items: BudgetItem[] = [
    ...pick('ingreso', nIncome),
    ...pick('gasto', nExpense),
    ...pick('ahorro', nSaving),
  ].map((t) => ({ id: t.id, label: t.label, amount: amount(t), category: t.category }));
  const income = items.filter((i) => i.category === 'ingreso').reduce((s, i) => s + i.amount, 0);
  const out = items.filter((i) => i.category !== 'ingreso').reduce((s, i) => s + i.amount, 0);
  const diff = out - income;
  if (diff > 0) {
    // faltan ingresos: se suma al mayor
    const big = items
      .filter((i) => i.category === 'ingreso')
      .sort((a, b) => b.amount - a.amount)[0]!;
    big.amount += diff;
  } else if (diff < 0) {
    items.push({
      id: 'sobrante',
      label: 'Lo que sobra a final de mes',
      amount: -diff,
      category: 'ahorro',
    });
  }
  // orden de llegada barajado y estable
  return items
    .map((it) => ({ it, k: rnd() }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.it);
}

export interface BalanceState {
  ingresos: number;
  gastos: number;
  ahorro: number;
  /** ingresos − (gastos + ahorro): 0 = cuadra. */
  diff: number;
}

/** La balanza con lo que la persona ha colocado hasta ahora (por categoría elegida). */
export function balanceOf(
  items: readonly BudgetItem[],
  placed: readonly (BudgetCategory | null)[],
): BalanceState {
  const sum = (cat: BudgetCategory) =>
    items.reduce((s, it, i) => s + (placed[i] === cat ? it.amount : 0), 0);
  const ingresos = sum('ingreso');
  const gastos = sum('gasto');
  const ahorro = sum('ahorro');
  return { ingresos, gastos, ahorro, diff: ingresos - (gastos + ahorro) };
}

export function playBudget(
  seed: number,
  rounds: readonly (readonly (BudgetCategory | null)[])[],
): GameResult {
  let tally = emptyTally();
  const missed = new Set<string>();
  let exact = 0;
  for (let r = 0; r < BUDGET_ROUNDS; r++) {
    const items = budgetRound(seed, r);
    const placed = rounds[r] ?? [];
    let allOk = true;
    items.forEach((it, i) => {
      const ok = placed[i] === it.category;
      tally = addTally(tally, ok ? 1 : 0, 1 / 3);
      if (!ok) {
        allOk = false;
        missed.add('presupuesto');
      }
    });
    if (allOk) exact++;
  }
  return makeResult(
    'presupuesto',
    seed,
    tally,
    missed,
    gamesData.presupuesto.learned,
    `${exact} de ${BUDGET_ROUNDS} presupuestos cuadraron a la primera.`,
  );
}
