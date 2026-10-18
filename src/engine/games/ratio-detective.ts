import companiesJson from '../../../content/shared/companies.json' with { type: 'json' };
import { mulberry32 } from '../prng';

/*
 * «¿Quién es quién?» (lección-juego de la planta 1, unidad «Ratios y calidad del beneficio»): la mentora te da los
 * ratios de cinco empresas del universo sin nombre (A–E) y tienes que decir quién es cada una: una productora de
 * zumos, una eléctrica renovable, una naviera, una boutique de banca de inversión y una cadena de tiendas. Empiezas con
 * tres ratios y puedes pedir más, a costa de nota. Es el clásico ejercicio de analista «identifica el sector por sus
 * ratios». Cifras de companies.json; la semilla elige el año y el orden de las tarjetas.
 */

export const COMPANIES = [
  'naranjas-del-turia',
  'pirineo-energia',
  'mediterranea-de-navieras',
  'albufera-partners',
  'tramuntana-retail',
] as const;
export type CompanyId = (typeof COMPANIES)[number];

/** Ratios en el orden en que se enseñan: los tres primeros, de salida; el resto, a petición. */
export const RATIOS = [
  'ebitMargin',
  'assetTurnover',
  'stockDays',
  'collectionDays',
  'debtToEquity',
  'fixedShare',
  'cashConversion',
  'roe',
] as const;
export type RatioId = (typeof RATIOS)[number];
export const START_RATIOS = 3;
/** Cada ratio que pides de más resta esto de la nota. */
export const REVEAL_COST = 0.04;

interface YearAccounts {
  year: number;
  pyg: Record<string, number>;
  balance: Record<string, number>;
  flujos: Record<string, number>;
}
const ACCOUNTS = companiesJson as unknown as { id: string; years: YearAccounts[] }[];
export const YEARS = [2021, 2022, 2023, 2024, 2025] as const;

const r2 = (x: number) => Math.round(x * 100) / 100;

export type Ratios = Record<RatioId, number>;

/** Ratios de una empresa en un año: márgenes y rentabilidad en %, rotación en veces, días en días. */
export function ratiosOf(id: CompanyId, year: number): Ratios {
  const y = ACCOUNTS.find((c) => c.id === id)!.years.find((v) => v.year === year)!;
  const { pyg, balance: b, flujos: f } = y;
  return {
    ebitMargin: r2((pyg.ebit! / pyg.ingresos!) * 100),
    assetTurnover: r2(pyg.ingresos! / b.total_activo!),
    stockDays: pyg.coste_ventas ? Math.round((b.existencias! / pyg.coste_ventas) * 365) : 0,
    collectionDays: Math.round((b.clientes! / pyg.ingresos!) * 365),
    debtToEquity: r2(b.deuda! / b.total_patrimonio!),
    fixedShare: Math.round((b.inmovilizado! / b.total_activo!) * 100),
    cashConversion: r2(f.operativo! / pyg.resultado_neto!),
    roe: r2((pyg.resultado_neto! / b.total_patrimonio!) * 100),
  };
}

/** Cifras para el árbol DuPont: margen neto (%), rotación del activo y apalancamiento (activo / patrimonio neto). */
export function dupontOf(id: CompanyId, year: number) {
  const y = ACCOUNTS.find((c) => c.id === id)!.years.find((v) => v.year === year)!;
  const { pyg, balance: b } = y;
  return {
    sales: pyg.ingresos!,
    net: pyg.resultado_neto!,
    assets: b.total_activo!,
    equity: b.total_patrimonio!,
    margin: r2((pyg.resultado_neto! / pyg.ingresos!) * 100),
    turnover: r2(pyg.ingresos! / b.total_activo!),
    leverage: r2(b.total_activo! / b.total_patrimonio!),
    roe: r2((pyg.resultado_neto! / b.total_patrimonio!) * 100),
  };
}

export interface DetectiveSetup {
  seed: number;
  year: number;
  /** Qué empresa hay detrás de cada tarjeta (A, B, C…). */
  cards: CompanyId[];
}

export function setupDetective(seed: number): DetectiveSetup {
  const rnd = mulberry32(seed);
  const year = YEARS[Math.floor(rnd() * YEARS.length)]!;
  const cards = [...COMPANIES];
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [cards[i], cards[j]] = [cards[j]!, cards[i]!];
  }
  return { seed, year, cards };
}

export interface DetectiveResult {
  hits: number;
  reveals: number;
  /** Por tarjeta: si acertaste. */
  right: boolean[];
  score: number;
}

/**
 * `guesses[i]` es la empresa que dices que hay tras la tarjeta i; `reveals`, cuántos ratios pediste de más.
 * Nota: aciertos / 5 menos 0,04 por ratio pedido, sin bajar de 0.
 */
export function detectiveResult(
  s: DetectiveSetup,
  guesses: readonly (CompanyId | null)[],
  reveals: number,
): DetectiveResult {
  const right = s.cards.map((c, i) => guesses[i] === c);
  const hits = right.filter(Boolean).length;
  const score = Math.max(0, hits / s.cards.length - REVEAL_COST * reveals);
  return { hits, reveals, right, score: Math.round(score * 1000) / 1000 };
}

/** Cifras de la partida para la explicación y los ejercicios (marcadores {nombre}, en snake_case). */
export function detectiveValues(s: DetectiveSetup, r: DetectiveResult): Record<string, number> {
  const nar = dupontOf('naranjas-del-turia', s.year);
  const tra = dupontOf('tramuntana-retail', s.year);
  const narR = ratiosOf('naranjas-del-turia', s.year);
  return {
    year: s.year,
    hits: r.hits,
    reveals: r.reveals,
    nar_sales: nar.sales,
    nar_net: nar.net,
    nar_assets: nar.assets,
    nar_equity: nar.equity,
    nar_margin: nar.margin,
    nar_turnover: nar.turnover,
    nar_leverage: nar.leverage,
    nar_roe: nar.roe,
    nar_conversion: narR.cashConversion,
    tra_sales: tra.sales,
    tra_net: tra.net,
    tra_assets: tra.assets,
    tra_equity: tra.equity,
    tra_margin: tra.margin,
    tra_turnover: tra.turnover,
    tra_leverage: tra.leverage,
    tra_roe: tra.roe,
  };
}
