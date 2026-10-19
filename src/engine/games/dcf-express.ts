import model from '../../../content/shared/models/naranjas-del-turia-dcf.json' with { type: 'json' };
import threeStatements from '../../../content/shared/models/naranjas-del-turia-3-estados.json' with { type: 'json' };
import { mulberry32 } from '../prng';

/*
 * «DCF Express» (lección-juego de la planta 1, unidad «DCF»; JUEGOS.md ficha 8): el DCF de Naranjas del modelo de
 * referencia (FCFF 2026–2030, convención de mitad de año, valor terminal por Gordon) con tres palancas: WACC,
 * crecimiento a perpetuidad (g) y margen EBIT. Tres retos ante el comité:
 *   1. ¿Qué descuenta el mercado? Solo el WACC: encuentra el que hace que el DCF valga lo que cotiza.
 *   2. El jefe quiere un precio alto. Solo g: encuentra el que lo consigue y decide si lo defenderías.
 *   3. Tu caso base: las tres palancas dentro de las reglas del comité y el valor dentro de su rango.
 * Semilla 0: la cotización sin rumores del modelo (7,50 €) y un objetivo del jefe de 12 €.
 */

const TAX = model.assumptions.wacc.taxRate;
const FCFF = model.fcff.map((y) => y.fcff);
const REVENUE = threeStatements.projection.map((y) => y.pyg.ingresos);
const EBIT = model.fcff.map((y) => y.ebit);
const NET_DEBT = model.assumptions.netDebt;
/** Acciones en miles (las cifras del modelo van en miles de €). */
const SHARES = model.assumptions.sharesOutstanding / 1000;

export const MODEL_WACC = Math.round(model.wacc.wacc * 10000) / 100;
export const MODEL_G = model.assumptions.terminalGrowth * 100;
/** Margen EBIT del primer año proyectado (%). */
export const BASE_MARGIN = Math.round((EBIT[0]! / REVENUE[0]!) * 1000) / 10;

/** Rejillas de las palancas (en %; el margen, en puntos sobre el plan). */
export const WACC_GRID = { min: 6, max: 12, step: 0.1 } as const;
export const G_GRID = { min: 0, max: 4, step: 0.1 } as const;
export const MARGIN_GRID = { min: -3, max: 3, step: 0.5 } as const;

/** Reglas del comité para el reto 3 y su rango de valor (€ por acción). */
export const RULES = { wacc: [7.5, 9.5], g: [0, 2.5], margin: [-2, 2] } as const;
export const COMMITTEE = [8.8, 9.9] as const;
/** Tolerancia para dar por cumplido un objetivo de precio: ±2 %. */
export const TOLERANCE = 0.02;

export interface Levers {
  /** WACC y g en %; margen en puntos sobre el plan. */
  wacc: number;
  g: number;
  margin: number;
}

export interface DcfSetup {
  seed: number;
  /** Cotización de hoy (€). */
  price: number;
  /** Precio que quiere el jefe (€). */
  target: number;
}

const pick = <T>(rnd: () => number, xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)]!;

export function setupDcf(seed: number): DcfSetup {
  if (seed === 0) return { seed, price: model.assumptions.unaffectedPrice, target: 12 };
  const rnd = mulberry32(seed);
  return { seed, price: pick(rnd, [7, 7.5, 8]), target: pick(rnd, [11, 11.5, 12]) };
}

export const BASE: Levers = { wacc: MODEL_WACC, g: MODEL_G, margin: 0 };
/** Punto de partida del reto 3: fuera de las reglas, para que haya que defender cada palanca. */
export const START_3: Levers = { wacc: 7, g: 3, margin: 2 };

export interface Dcf {
  fcff: number[];
  pvFcff: number;
  terminal: number;
  pvTerminal: number;
  ev: number;
  equity: number;
  perShare: number;
  /** Peso del valor terminal en el valor de empresa (0–1). */
  tvShare: number;
}

/** DCF con mitad de año: cada flujo se descuenta a t − 0,5, y el valor terminal con el factor del último. */
export function dcf({ wacc, g, margin }: Levers): Dcf {
  const w = wacc / 100;
  const gg = g / 100;
  const fcff = FCFF.map((f, i) => f + (margin / 100) * REVENUE[i]! * (1 - TAX));
  const pvFcff = fcff.reduce((a, f, i) => a + f / (1 + w) ** (i + 0.5), 0);
  const terminal = (fcff[fcff.length - 1]! * (1 + gg)) / (w - gg);
  const pvTerminal = terminal / (1 + w) ** (fcff.length - 0.5);
  const ev = pvFcff + pvTerminal;
  const equity = ev - NET_DEBT;
  return {
    fcff,
    pvFcff,
    terminal,
    pvTerminal,
    ev,
    equity,
    perShare: equity / SHARES,
    tvShare: pvTerminal / ev,
  };
}

const grid = ({ min, max, step }: { min: number; max: number; step: number }) =>
  Array.from(
    { length: Math.round((max - min) / step) + 1 },
    (_, i) => Math.round((min + i * step) * 10) / 10,
  );

const near = (v: number, target: number) => Math.abs(v / target - 1) <= TOLERANCE;

/** El WACC de la rejilla que mejor iguala el DCF a la cotización (con g y margen del plan). */
export const impliedWacc = (s: DcfSetup) =>
  grid(WACC_GRID).reduce((a, b) =>
    Math.abs(dcf({ ...BASE, wacc: b }).perShare - s.price) <
    Math.abs(dcf({ ...BASE, wacc: a }).perShare - s.price)
      ? b
      : a,
  );

/** La g de la rejilla que mejor da el precio del jefe (con el WACC y el margen del plan). */
export const bossGrowth = (s: DcfSetup) =>
  grid(G_GRID).reduce((a, b) =>
    Math.abs(dcf({ ...BASE, g: b }).perShare - s.target) <
    Math.abs(dcf({ ...BASE, g: a }).perShare - s.target)
      ? b
      : a,
  );

export const hitsPrice = (wacc: number, s: DcfSetup) =>
  near(dcf({ ...BASE, wacc }).perShare, s.price);
export const hitsTarget = (g: number, s: DcfSetup) => near(dcf({ ...BASE, g }).perShare, s.target);
/** g defendible ante el comité: no más que la regla (el crecimiento nominal a largo plazo). */
export const defensible = (g: number) => g <= RULES.g[1];

export function withinRules(l: Levers) {
  return {
    wacc: l.wacc >= RULES.wacc[0] && l.wacc <= RULES.wacc[1],
    g: l.g >= RULES.g[0] && l.g <= RULES.g[1],
    margin: l.margin >= RULES.margin[0] && l.margin <= RULES.margin[1],
  };
}

export function approved(l: Levers) {
  const r = withinRules(l);
  const v = Math.round(dcf(l).perShare * 100) / 100;
  return r.wacc && r.g && r.margin && v >= COMMITTEE[0] && v <= COMMITTEE[1];
}

export interface DcfAnswer {
  wacc: number;
  g: number;
  /** ¿Defenderías ante el comité la g que pide el jefe? */
  defend: boolean;
  final: Levers;
}

export interface DcfResult {
  marketHit: boolean;
  bossHit: boolean;
  /** Acierta quien no defiende una g por encima de la regla. */
  judgement: boolean;
  approved: boolean;
  score: number;
}

/** Nota: 30 % el WACC implícito, 20 % la g del jefe, 20 % no defenderla si no es defendible y 30 % la aprobación. */
export function dcfResult(s: DcfSetup, a: DcfAnswer): DcfResult {
  const marketHit = hitsPrice(a.wacc, s);
  const bossHit = hitsTarget(a.g, s);
  const judgement = a.defend === defensible(a.g);
  const ok = approved(a.final);
  return {
    marketHit,
    bossHit,
    judgement,
    approved: ok,
    score:
      Math.round((0.3 * +marketHit + 0.2 * +bossHit + 0.2 * +judgement + 0.3 * +ok) * 1000) / 1000,
  };
}

const r2 = (x: number) => Math.round(x * 100) / 100;
const r0 = (x: number) => Math.round(x);

/** Cifras de la partida para la explicación y los ejercicios (marcadores {nombre}, en snake_case). */
export function dcfValues(s: DcfSetup, a: DcfAnswer): Record<string, number> {
  const base = dcf(BASE);
  const fin = dcf(a.final);
  return {
    price: s.price,
    target: s.target,
    wacc_model: MODEL_WACC,
    g_model: MODEL_G,
    fcff_5: r2(base.fcff[4]!),
    pv_fcff: r0(base.pvFcff),
    tv: r0(base.terminal),
    pv_tv: r0(base.pvTerminal),
    ev: r0(base.ev),
    net_debt: NET_DEBT,
    equity: r0(base.equity),
    value: r2(base.perShare),
    tv_share: Math.round(base.tvShare * 1000) / 10,
    wacc_implied: impliedWacc(s),
    wacc_pick: a.wacc,
    g_boss: bossGrowth(s),
    g_pick: a.g,
    tv_share_boss: Math.round(dcf({ ...BASE, g: bossGrowth(s) }).tvShare * 1000) / 10,
    final_wacc: a.final.wacc,
    final_g: a.final.g,
    final_margin: a.final.margin,
    final_value: r2(fin.perShare),
  };
}
