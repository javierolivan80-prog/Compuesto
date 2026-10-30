import { mulberry32 } from '../prng';

/*
 * «¿Patrón o ruido?» (lección-juego de la planta 4, unidad «Análisis técnico, eficiencia de mercado y por qué pierde el
 * minorista»). Ninguna ficha de JUEGOS.md encaja (la 11, «El trader impulsivo», es la de n5-u6), así que es un juego
 * sencillo de cuatro pasos:
 *   1. Dos gráficos: uno es una acción ficticia y el otro sale de lanzar una moneda. Los dos son paseos aleatorios con
 *      semillas distintas, así que la respuesta honesta es que no se distinguen a simple vista.
 *   2. Un cruce de medias móviles ganó un G % bruto con N operaciones que cuestan c % cada una (ida y vuelta):
 *      neto = G − N × c. Distractores: el bruto y G − c.
 *   3. Momentum: entre cuatro acciones ficticias, la estrategia compra la que más subió en los últimos 12 meses y vende
 *      en corto la que más cayó. Distractores: la estrategia al revés y «el pasado no dice nada».
 *   4. CFD apalancado: con una garantía D y un apalancamiento L, una caída del m % hace perder D × L × m %.
 *      Distractores: D × m % (sin apalancamiento) y D × L (la exposición).
 * Cifras ficticias.
 */

export type MomentumPick = 'momentum' | 'reversal' | 'none';

export interface PatternSetup {
  seed: number;
  /** Paso 1: semillas de los dos paseos aleatorios. */
  seedA: number;
  seedB: number;
  /** Paso 2: rentabilidad bruta (%), operaciones y coste por operación (centésimas de punto). */
  gross: number;
  trades: number;
  costC: number;
  /** Paso 3: rentabilidad a 12 meses de cuatro acciones (%), en el orden de STOCKS. */
  past: [number, number, number, number];
  /** Paso 4: garantía (€), apalancamiento y caída (%, en décimas). */
  deposit: number;
  lev: number;
  moveD: number;
}

/** Acciones ficticias del universo Compuesto. */
export const STOCKS = [
  'Naranjas del Turia',
  'Pirineo Energía',
  'Mediterránea de Navieras',
  'Tramuntana Retail',
] as const;

const pick = <T>(rnd: () => number, xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)]!;
const r2 = (x: number) => Math.round(x * 100) / 100;

export function setupPattern(seed: number): PatternSetup {
  if (seed === 0)
    return {
      seed,
      seedA: 101,
      seedB: 202,
      gross: 18,
      trades: 60,
      costC: 25,
      past: [24, -12, 8, 3],
      deposit: 2000,
      lev: 20,
      moveD: 20,
    };
  const rnd = mulberry32(seed);
  // cuatro rentabilidades distintas a 12 meses (Fisher-Yates sobre la bolsa)
  const pool = [-30, -18, -12, -6, 3, 8, 15, 24, 35];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  const past = pool.slice(0, 4) as [number, number, number, number];
  // apalancamientos de 5:1 a 20:1 (el límite de la ESMA para índices principales es 20:1)
  const lev = pick(rnd, [5, 10, 20]);
  // la caída nunca llega al cierre del 50 % de la garantía (normas de la ESMA para CFD)
  const moveD = pick(
    rnd,
    [10, 15, 20, 30].filter((m) => (lev * m) / 10 < 50),
  );
  const seedA = Math.floor(rnd() * 1e6);
  const seedB = Math.floor(rnd() * 1e6);
  // nunca un neto exactamente nulo: se repite el sorteo de la regla
  let gross: number, trades: number, costC: number;
  do {
    gross = pick(rnd, [12, 15, 18, 22, 25]);
    trades = pick(rnd, [40, 60, 80, 120]);
    costC = pick(rnd, [10, 20, 25, 30]);
  } while (gross * 100 === trades * costC);
  return {
    seed,
    seedA,
    seedB,
    gross,
    trades,
    costC,
    past,
    deposit: pick(rnd, [1000, 2000, 5000]),
    lev,
    moveD,
  };
}

/** Paseo aleatorio de 60 sesiones desde 100: cada día sube o baja un 1 % a cara o cruz. */
export function randomWalk(seed: number, n = 60): number[] {
  const rnd = mulberry32(seed);
  const out = [100];
  for (let i = 1; i < n; i++) out.push(r2(out[i - 1]! * (rnd() < 0.5 ? 1.01 : 0.99)));
  return out;
}

/** Paso 2: rentabilidad neta tras costes (%). */
export const cost = (s: PatternSetup) => s.costC / 100;
export const net = (s: PatternSetup) => r2(s.gross - s.trades * cost(s));
export function netOptions(s: PatternSetup): number[] {
  return [net(s), s.gross, r2(s.gross - cost(s))].sort((a, b) => a - b);
}

/** Paso 3: índices de la ganadora y la perdedora a 12 meses. */
export const winner = (s: PatternSetup) => s.past.indexOf(Math.max(...s.past));
export const loser = (s: PatternSetup) => s.past.indexOf(Math.min(...s.past));

/** Paso 4: caída (%), exposición, pérdida (€) y pérdida en % de la garantía. */
export const move = (s: PatternSetup) => s.moveD / 10;
export const exposure = (s: PatternSetup) => s.deposit * s.lev;
export const loss = (s: PatternSetup) => r2((exposure(s) * move(s)) / 100);
export const lossPct = (s: PatternSetup) => r2(s.lev * move(s));
export function lossOptions(s: PatternSetup): number[] {
  return [loss(s), r2((s.deposit * move(s)) / 100), exposure(s)].sort((a, b) => a - b);
}

export interface PatternAnswer {
  chart: 'a' | 'b' | 'unknown';
  net: number;
  pick: MomentumPick;
  loss: number;
}

export interface PatternResult {
  chartHit: boolean;
  netHit: boolean;
  pickHit: boolean;
  lossHit: boolean;
  score: number;
}

/** Nota: un cuarto por paso. */
export function patternResult(s: PatternSetup, a: PatternAnswer): PatternResult {
  const chartHit = a.chart === 'unknown';
  const netHit = a.net === net(s);
  const pickHit = a.pick === 'momentum';
  const lossHit = a.loss === loss(s);
  return {
    chartHit,
    netHit,
    pickHit,
    lossHit,
    score: (+chartHit + +netHit + +pickHit + +lossHit) / 4,
  };
}

/** Cifras de la partida para la explicación y los ejercicios (marcadores {nombre}, en snake_case). */
export function patternValues(s: PatternSetup, a: PatternAnswer): Record<string, number> {
  const r = patternResult(s, a);
  return {
    gross: s.gross,
    trades: s.trades,
    cost: cost(s),
    net: net(s),
    best: s.past[winner(s)]!,
    worst: s.past[loser(s)]!,
    deposit: s.deposit,
    lev: s.lev,
    move: move(s),
    exposure: exposure(s),
    loss: loss(s),
    loss_pct: lossPct(s),
    hits: +r.chartHit + +r.netHit + +r.pickHit + +r.lossHit,
  };
}
