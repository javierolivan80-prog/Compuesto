import { mulberry32 } from '../prng';

/*
 * «Ciclo de caja» (lección-juego de la planta 1, unidad «De la cuenta de resultados a la caja»): preparas el plan de
 * circulante de Naranjas del Turia para 2026. Eliges el plazo de cobro a la cadena de supermercados, los días de
 * existencias y el plazo medio de pago a los proveedores; de ahí salen las necesidades operativas de fondos
 * (NOF = clientes + existencias − proveedores). Lo que no cubre la caja disponible se financia con una póliza de
 * crédito (barata, con límite) o con factoring (más caro, sin más límite que las facturas). Si te pasas del límite de
 * la póliza, te quedas sin caja aunque el plan gane dinero. Plazos dentro de los 60 días de la Ley 3/2004 y
 * la Ley 12/2013.
 * Cifras en miles de euros. Lógica pura y determinista por semilla.
 */

export const DSO_OPTIONS = [30, 45, 60] as const;
export const DIO_OPTIONS = [45, 60, 75] as const;
export const DPO_OPTIONS = [30, 40, 50] as const;
export type Dso = (typeof DSO_OPTIONS)[number];
export type Dio = (typeof DIO_OPTIONS)[number];
export type Dpo = (typeof DPO_OPTIONS)[number];
export type Funding = 'poliza' | 'factoring';

/** Coste de ventas sobre ventas (como Naranjas en 2024–2025). */
export const COST_RATIO = 0.62;

/** Cobrar antes ahuyenta a parte de la cadena: ventas que se pierden. */
const SALES_BY_DSO: Record<Dso, number> = { 30: 0.97, 45: 0.99, 60: 1 };
/** Pocas existencias: roturas de stock que hacen perder ventas. Muchas: compras en campaña, algo más baratas. */
const SALES_BY_DIO: Record<Dio, number> = { 45: 0.97, 60: 1, 75: 1 };
const COST_BY_DIO: Record<Dio, number> = { 45: 1, 60: 1, 75: 0.99 };
/**
 * Días de pago medios: la fruta fresca se paga como mucho a 30 días (Ley 12/2013) y los envases y demás compras hasta
 * a 60 (Ley 3/2004), así que la media máxima es de unos 50. Pagar todo antes da descuento por pronto pago.
 */
const COST_BY_DPO: Record<Dpo, number> = { 30: 0.98, 40: 0.99, 50: 1 };

export interface CashSetup {
  seed: number;
  /** Ventas de 2026 si cobras a 60 días y tienes 60 días de existencias. */
  baseSales: number;
  /** Caja que Naranjas puede dedicar al circulante. */
  available: number;
  /** Límite de la póliza de crédito. */
  limit: number;
  /** Tipo de interés anual de la póliza, en %. */
  rate: number;
  /** Comisión del factoring por cada factura adelantada, en %. */
  fee: number;
}

const pick = (rnd: () => number, min: number, max: number, step: number) =>
  Math.round((min + Math.floor(rnd() * (Math.round((max - min) / step) + 1)) * step) * 100) / 100;

export function setupCash(seed: number): CashSetup {
  const rnd = mulberry32(seed);
  return {
    seed,
    baseSales: pick(rnd, 60000, 64000, 500),
    available: pick(rnd, 5000, 11000, 1000),
    limit: pick(rnd, 2000, 5000, 1000),
    rate: pick(rnd, 5, 9, 1),
    fee: pick(rnd, 1.5, 2, 0.25),
  };
}

export interface CashPlan {
  dso: Dso;
  dio: Dio;
  dpo: Dpo;
  funding: Funding;
}

export interface CashResult extends CashPlan {
  sales: number;
  cost: number;
  /** Saldo medio de clientes, existencias y proveedores (miles de €). */
  clients: number;
  stock: number;
  payables: number;
  /** Necesidades operativas de fondos. */
  nof: number;
  /** Ciclo de caja en días: cobro + existencias − pago. */
  ccc: number;
  /** Lo que la caja disponible no cubre. */
  shortfall: number;
  /** Coste anual de financiar el hueco. */
  fundingCost: number;
  /** Margen del plan: ventas − coste de ventas − coste de la financiación. */
  margin: number;
  /** Con la póliza, el hueco cabe en su límite; el factoring cubre lo que haga falta. */
  feasible: boolean;
}

export function planResult(s: CashSetup, p: CashPlan): CashResult {
  const sales = Math.round(s.baseSales * SALES_BY_DSO[p.dso] * SALES_BY_DIO[p.dio]);
  const cost = Math.round(sales * COST_RATIO * COST_BY_DPO[p.dpo] * COST_BY_DIO[p.dio]);
  const clients = Math.round((sales * p.dso) / 365);
  const stock = Math.round((cost * p.dio) / 365);
  const payables = Math.round((cost * p.dpo) / 365);
  const nof = clients + stock - payables;
  const shortfall = Math.max(0, nof - s.available);
  // el factoring se paga por cada factura adelantada: al año se adelantan 365 / días de cobro veces el saldo
  const fundingCost = Math.round(
    p.funding === 'factoring'
      ? (shortfall * (s.fee / 100) * 365) / p.dso
      : (shortfall * s.rate) / 100,
  );
  const feasible = p.funding === 'factoring' ? shortfall <= clients : shortfall <= s.limit;
  return {
    ...p,
    sales,
    cost,
    clients,
    stock,
    payables,
    nof,
    ccc: p.dso + p.dio - p.dpo,
    shortfall,
    fundingCost,
    margin: sales - cost - fundingCost,
    feasible,
  };
}

export const ALL_PLANS: readonly CashPlan[] = DSO_OPTIONS.flatMap((dso) =>
  DIO_OPTIONS.flatMap((dio) =>
    DPO_OPTIONS.flatMap((dpo) =>
      (['poliza', 'factoring'] as const).map((funding) => ({ dso, dio, dpo, funding })),
    ),
  ),
);

/** El mejor plan posible: el de más margen entre los que no dejan a Naranjas sin caja. */
export function bestPlan(s: CashSetup): CashResult {
  return ALL_PLANS.map((p) => planResult(s, p))
    .filter((r) => r.feasible)
    .reduce((a, b) => (b.margin > a.margin ? b : a));
}

/** Nota: 0 si te quedas sin caja; si no, baja con lo que te alejas del mejor margen (1 punto por cada 1.000). */
export function cashScore(s: CashSetup, r: CashResult): number {
  if (!r.feasible) return 0;
  const gap = bestPlan(s).margin - r.margin;
  return Math.round(Math.max(0.3, Math.min(1, 1 - gap / 1000)) * 1000) / 1000;
}

/** Cifras de la partida para la explicación y los ejercicios de la lección (marcadores {nombre}, en snake_case). */
export function cashValues(s: CashSetup, r: CashResult): Record<string, number> {
  const best = bestPlan(s);
  return {
    sales: r.sales,
    cost: r.cost,
    dso: r.dso,
    dio: r.dio,
    dpo: r.dpo,
    ccc: r.ccc,
    clients: r.clients,
    stock: r.stock,
    payables: r.payables,
    nof: r.nof,
    available: s.available,
    limit: s.limit,
    rate: s.rate,
    fee: s.fee,
    shortfall: r.shortfall,
    funding_cost: r.fundingCost,
    margin: r.margin,
    best_margin: best.margin,
    factoring: r.funding === 'factoring' ? 1 : 0,
  };
}
