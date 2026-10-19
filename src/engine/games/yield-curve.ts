import { price } from './bond-issue';

/*
 * «Curva de tipos» (JUEGOS.md ficha 13; lección-juego de la planta 2, unidad «Duración y curva de tipos»): cinco bonos
 * del Estado ficticios (1, 2, 5, 10 y 30 años), emitidos a la par con la curva de hoy. Mueves la curva con dos
 * palancas, el nivel (todos los plazos a la vez) y la pendiente (gira alrededor del plazo de 5 años: empinar sube los
 * largos y baja los cortos), y ves al instante cómo cambian sus precios. Tres retos:
 *   1. Haz que el bono a 30 años caiga más de un 10 %.
 *   2. Haz que el bono a 2 años baje y el de 30 suba a la vez.
 *   3. Si todos los tipos suben un punto, ¿cuánto cae el bono a 10 años? (la duración).
 * Cupones anuales; cada bono paga un cupón igual a su rentabilidad de hoy, así que todos empiezan valiendo 100.
 */

export const MATURITIES = [1, 2, 5, 10, 30] as const;
export type Maturity = (typeof MATURITIES)[number];

/** Rejillas de las palancas (puntos porcentuales). */
export const LEVEL_GRID = { min: -2, max: 2, step: 0.25 } as const;
export const SLOPE_GRID = { min: -1.5, max: 1.5, step: 0.25 } as const;

export interface CurveSetup {
  seed: number;
  /** Rentabilidad de hoy de cada plazo (%), en el orden de MATURITIES. */
  base: number[];
}

/** Curvas de partida: normal (semilla 0), plana o invertida. */
const CURVES = [
  [2.2, 2.4, 2.8, 3.2, 3.6],
  [2.9, 2.9, 3, 3, 3.1],
  [3.4, 3.2, 2.9, 2.8, 2.9],
] as const;

export function setupCurve(seed: number): CurveSetup {
  return { seed, base: [...CURVES[Math.abs(seed) % CURVES.length]!] };
}

/** Peso de la pendiente en cada plazo: −1 o así en el corto, 0 a 5 años, 1 a 30 años (escala logarítmica). */
export const slopeWeight = (m: number) => Math.log(m / 5) / Math.log(30 / 5);

export interface Levers {
  level: number;
  slope: number;
}

const r2 = (x: number) => Math.round(x * 100) / 100;

/** Rentabilidad de cada plazo con las palancas movidas (%). */
export const yieldsAt = (s: CurveSetup, l: Levers) =>
  MATURITIES.map((m, i) => s.base[i]! + l.level + l.slope * slopeWeight(m));

/** Precio de cada bono (por 100) con la curva movida. */
export const pricesAt = (s: CurveSetup, l: Levers) => {
  const ys = yieldsAt(s, l);
  return MATURITIES.map((m, i) => price(s.base[i]!, ys[i]!, m));
};

/** Duración modificada de cada bono hoy: cuánto % cae su precio por cada punto que sube su rentabilidad. */
export function modifiedDuration(c: number, y: number, n: number): number {
  const r = y / 100;
  let pv = 0;
  let weighted = 0;
  for (let t = 1; t <= n; t++) {
    const cf = c + (t === n ? 100 : 0);
    const v = cf / (1 + r) ** t;
    pv += v;
    weighted += t * v;
  }
  return weighted / pv / (1 + r);
}

export const durations = (s: CurveSetup) =>
  MATURITIES.map((m, i) => modifiedDuration(s.base[i]!, s.base[i]!, m));

/** Reto 1: el bono a 30 años cae más de un 10 %. */
export const longFalls = (s: CurveSetup, l: Levers) => pricesAt(s, l)[4]! < 90;
/** Reto 2: el bono a 2 años baja y el de 30 sube. */
export const twist = (s: CurveSetup, l: Levers) => {
  const p = pricesAt(s, l);
  return p[1]! < 100 && p[4]! > 100;
};
const r1 = (x: number) => Math.round(x * 10) / 10;

/** Caída (%) de cada bono si todos los tipos suben un punto. */
export const fallsUp1 = (s: CurveSetup) =>
  pricesAt(s, { level: 1, slope: 0 }).map((p) => r1(100 - p));

/** Reto 3: opciones de caída del bono a 10 años (las de los bonos a 2, 10 y 30 años) y la buena. */
export const fallOptions = (s: CurveSetup) => {
  const f = fallsUp1(s);
  return [f[1]!, f[3]!, f[4]!].sort((a, b) => a - b);
};
export const fall10 = (s: CurveSetup) => fallsUp1(s)[3]!;

export interface CurveAnswer {
  first: Levers;
  second: Levers;
  /** Caída del bono a 10 años elegida en el reto 3 (%). */
  pick: number;
}

export interface CurveResult {
  longHit: boolean;
  twistHit: boolean;
  pickHit: boolean;
  score: number;
}

/** Nota: 35 % el reto 1, 35 % el reto 2 y 30 % el 3. */
export function curveResult(s: CurveSetup, a: CurveAnswer): CurveResult {
  const longHit = longFalls(s, a.first);
  const twistHit = twist(s, a.second);
  const pickHit = a.pick === fall10(s);
  return {
    longHit,
    twistHit,
    pickHit,
    score: Math.round((0.35 * +longHit + 0.35 * +twistHit + 0.3 * +pickHit) * 1000) / 1000,
  };
}

/** Cifras de la partida para la explicación y los ejercicios (marcadores {nombre}, en snake_case). */
export function curveValues(s: CurveSetup, a: CurveAnswer): Record<string, number> {
  const up = pricesAt(s, { level: 1, slope: 0 });
  const d = durations(s);
  const first = pricesAt(s, a.first);
  const second = pricesAt(s, a.second);
  return {
    y1: s.base[0]!,
    y2: s.base[1]!,
    y5: s.base[2]!,
    y10: s.base[3]!,
    y30: s.base[4]!,
    up_1: r2(up[0]!),
    up_2: r2(up[1]!),
    up_5: r2(up[2]!),
    up_10: r2(up[3]!),
    up_30: r2(up[4]!),
    dur_1: r2(d[0]!),
    dur_2: r2(d[1]!),
    dur_5: r2(d[2]!),
    dur_10: r2(d[3]!),
    dur_30: r2(d[4]!),
    first_level: a.first.level,
    first_slope: a.first.slope,
    first_30: r2(first[4]!),
    second_level: a.second.level,
    second_slope: a.second.slope,
    second_2: r2(second[1]!),
    second_30: r2(second[4]!),
    pick: a.pick,
    fall_10: fall10(s),
    fall_30: fallsUp1(s)[4]!,
    fall_2: fallsUp1(s)[1]!,
  };
}
