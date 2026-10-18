import { mulberry32 } from '../prng';

/*
 * «Cuadra el balance» (lección-juego de la planta 1, unidad «Los tres estados financieros»): primero colocas cada
 * partida del balance de Naranjas del Turia a 31/12/2024 en activo, pasivo o patrimonio neto (cifras de
 * companies.json, en miles de euros); después llegan cinco operaciones de enero de 2025 y eliges el apunte que las
 * recoge. Enseña que activo = pasivo + patrimonio neto siempre, que toda operación toca al menos dos partidas y que el
 * beneficio de una venta aumenta el patrimonio neto. Lógica pura y determinista por semilla.
 */

export type Side = 'activo' | 'pasivo' | 'patrimonio';

export type ItemId =
  | 'caja'
  | 'clientes'
  | 'existencias'
  | 'inmovilizado'
  | 'proveedores'
  | 'deuda'
  | 'capital'
  | 'reservas'
  | 'resultado';

export const SIDE_OF: Record<ItemId, Side> = {
  caja: 'activo',
  clientes: 'activo',
  existencias: 'activo',
  inmovilizado: 'activo',
  proveedores: 'pasivo',
  deuda: 'pasivo',
  capital: 'patrimonio',
  reservas: 'patrimonio',
  resultado: 'patrimonio',
};

/** Orden en el que se muestran en el balance. */
export const ITEMS: readonly ItemId[] = [
  'inmovilizado',
  'existencias',
  'clientes',
  'caja',
  'capital',
  'reservas',
  'resultado',
  'deuda',
  'proveedores',
];

export type Balance = Record<ItemId, number>;

/** Balance de Naranjas del Turia a 31/12/2024 (companies.json, miles de €; un test lo comprueba). */
export const OPENING: Balance = {
  caja: 11989,
  clientes: 9046,
  existencias: 6543,
  inmovilizado: 21030,
  proveedores: 4674,
  deuda: 10000,
  capital: 6000,
  reservas: 27934,
  // simplificación: el resultado de 2024 ya está sumado a reservas (en companies.json no va aparte); 2025 empieza en cero
  resultado: 0,
};

/** Partidas que se clasifican en la primera fase (el resultado del ejercicio aparece después, con la venta). */
export const TO_CLASSIFY: readonly ItemId[] = ITEMS.filter((i) => i !== 'resultado');

export type OpId = 'loan' | 'machine' | 'sale' | 'suppliers' | 'dividend';
export const OPS: readonly OpId[] = ['loan', 'machine', 'sale', 'suppliers', 'dividend'];

/** Un apunte: cuánto cambia cada partida (miles de €). */
export type Entry = Partial<Record<ItemId, number>>;

export interface Operation {
  id: OpId;
  /** Importe principal de la operación (miles de €). */
  amount: number;
  /** Coste de la mercancía vendida (solo en la venta). */
  cost?: number;
  /** Tres apuntes posibles, barajados; `right` es el índice del correcto. */
  options: Entry[];
  right: number;
}

export interface BalanceSetup {
  seed: number;
  /** Orden en el que llegan las partidas para clasificar. */
  order: ItemId[];
  ops: Operation[];
}

const pick = (rnd: () => number, min: number, max: number, step: number) =>
  min + Math.floor(rnd() * (Math.round((max - min) / step) + 1)) * step;

function shuffle<T>(rnd: () => number, xs: readonly T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/**
 * El apunte correcto y dos errores típicos de cada operación: tocar una sola partida (descuadra), el signo al revés o
 * una partida equivocada que cuadra igual (por eso cuadrar no basta: hay que acertar qué cambia).
 */
function entries(id: OpId, amount: number, cost: number): [Entry, Entry, Entry] {
  switch (id) {
    case 'loan':
      return [
        { caja: amount, deuda: amount },
        { caja: amount, resultado: amount },
        { caja: amount },
      ];
    case 'machine':
      return [
        { inmovilizado: amount, caja: -amount },
        { inmovilizado: amount, deuda: amount },
        { inmovilizado: amount, resultado: -amount },
      ];
    case 'sale':
      return [
        { clientes: amount, existencias: -cost, resultado: amount - cost },
        { caja: amount, existencias: -cost, resultado: amount - cost },
        { clientes: amount, resultado: amount },
      ];
    case 'suppliers':
      return [
        { caja: -amount, proveedores: -amount },
        { caja: -amount, resultado: -amount },
        { caja: -amount, proveedores: amount },
      ];
    case 'dividend':
      return [
        { caja: -amount, reservas: -amount },
        { caja: -amount, resultado: -amount },
        { caja: -amount, capital: -amount },
      ];
  }
}

export function setupBalance(seed: number): BalanceSetup {
  const rnd = mulberry32(seed);
  const order = shuffle(rnd, TO_CLASSIFY);
  const amounts: Record<OpId, number> = {
    loan: pick(rnd, 1000, 3000, 500),
    machine: pick(rnd, 1500, 3500, 250),
    sale: pick(rnd, 2000, 4000, 100),
    suppliers: pick(rnd, 1000, 2500, 100),
    dividend: pick(rnd, 2500, 3500, 100),
  };
  // la mercancía vendida costó en torno al 62 % del precio de venta (coste de ventas / ingresos de Naranjas en 2024)
  const cost = Math.round(amounts.sale * 0.62);
  const ops = OPS.map((id) => {
    const all = entries(id, amounts[id], cost);
    const options = shuffle(rnd, all);
    return {
      id,
      amount: amounts[id],
      ...(id === 'sale' ? { cost } : {}),
      options,
      right: options.indexOf(all[0]),
    };
  });
  return { seed, order, ops };
}

export const applyEntry = (b: Balance, e: Entry): Balance => {
  const next = { ...b };
  for (const [k, v] of Object.entries(e) as [ItemId, number][]) next[k] += v;
  return next;
};

export const totals = (b: Balance) => {
  let activo = 0;
  let pasivo = 0;
  let patrimonio = 0;
  for (const i of ITEMS) {
    if (SIDE_OF[i] === 'activo') activo += b[i];
    else if (SIDE_OF[i] === 'pasivo') pasivo += b[i];
    else patrimonio += b[i];
  }
  return { activo, pasivo, patrimonio, diff: activo - pasivo - patrimonio };
};

/** El apunte deja el balance cuadrado (aunque pueda ser el equivocado). */
export const balances = (e: Entry): boolean => totals(applyEntry(OPENING, e)).diff === 0;

export interface BalanceState {
  setup: BalanceSetup;
  /** Clasificación que has hecho de cada partida (en el orden de `setup.order`). */
  sides: Side[];
  /** Apunte que elegiste en cada operación. */
  picks: number[];
  /** El balance tras las operaciones ya hechas (siempre con el apunte correcto). */
  balance: Balance;
}

export const startBalance = (setup: BalanceSetup): BalanceState => ({
  setup,
  sides: [],
  picks: [],
  balance: { ...OPENING },
});

/** Colocas la siguiente partida en un lado (si te equivocas, se coloca en el suyo y se explica). */
export function classify(s: BalanceState, side: Side): BalanceState {
  if (s.sides.length >= s.setup.order.length) return s;
  return { ...s, sides: [...s.sides, side] };
}

export const classified = (s: BalanceState) => s.sides.length >= s.setup.order.length;

/** Eliges el apunte de la operación en curso: el balance siempre avanza con el correcto. */
export function post(s: BalanceState, option: number): BalanceState {
  if (!classified(s) || s.picks.length >= s.setup.ops.length) return s;
  const op = s.setup.ops[s.picks.length]!;
  return {
    ...s,
    picks: [...s.picks, option],
    balance: applyEntry(s.balance, op.options[op.right]!),
  };
}

export const finished = (s: BalanceState) => s.picks.length >= s.setup.ops.length;

export interface BalanceResult {
  classifyHits: number;
  postHits: number;
  totalStart: number;
  equityStart: number;
  loan: number;
  machine: number;
  sale: number;
  cost: number;
  margin: number;
  suppliers: number;
  dividend: number;
  cashEnd: number;
  debtEnd: number;
  equityEnd: number;
  totalEnd: number;
  result: number;
  score: number;
}

export function balanceResult(s: BalanceState): BalanceResult {
  const { setup } = s;
  const classifyHits = setup.order.filter((id, i) => s.sides[i] === SIDE_OF[id]).length;
  const postHits = setup.ops.filter((op, i) => s.picks[i] === op.right).length;
  const amount = (id: OpId) => setup.ops.find((o) => o.id === id)!.amount;
  const sale = setup.ops.find((o) => o.id === 'sale')!;
  const t0 = totals(OPENING);
  const t1 = totals(s.balance);
  const score = 0.4 * (classifyHits / setup.order.length) + 0.6 * (postHits / setup.ops.length);
  return {
    classifyHits,
    postHits,
    totalStart: t0.activo,
    equityStart: t0.patrimonio,
    loan: amount('loan'),
    machine: amount('machine'),
    sale: sale.amount,
    cost: sale.cost!,
    margin: sale.amount - sale.cost!,
    suppliers: amount('suppliers'),
    dividend: amount('dividend'),
    cashEnd: s.balance.caja,
    debtEnd: s.balance.deuda,
    equityEnd: t1.patrimonio,
    totalEnd: t1.activo,
    result: s.balance.resultado,
    score: Math.round(score * 1000) / 1000,
  };
}

/** Cifras de la partida para la explicación y los ejercicios de la lección (marcadores {nombre}, en snake_case). */
export function balanceValues(r: BalanceResult): Record<string, number> {
  return {
    total_start: r.totalStart,
    equity_start: r.equityStart,
    loan: r.loan,
    machine: r.machine,
    sale: r.sale,
    cost: r.cost,
    margin: r.margin,
    suppliers: r.suppliers,
    dividend: r.dividend,
    cash_end: r.cashEnd,
    debt_end: r.debtEnd,
    equity_end: r.equityEnd,
    total_end: r.totalEnd,
    result: r.result,
    classify_hits: r.classifyHits,
    post_hits: r.postHits,
  };
}
