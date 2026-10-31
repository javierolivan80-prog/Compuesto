import { mulberry32 } from '../prng';

/*
 * «El informe del gestor» (lección-juego de la planta 5, unidad «Medir rentabilidad y riesgo de una cartera»). Las
 * fichas de N6 de JUEGOS.md («Gestor por un año» y «Máquina del tiempo») van a las unidades de asset allocation y de
 * riesgo extremo, así que esta es un juego sencillo de cuatro pasos sobre el año de un fondo ficticio:
 *   1. Rentabilidad compuesta del año (TWR): (1 + primer semestre) × (1 + segundo semestre) − 1. Distractores: la suma
 *      y la media de los dos semestres.
 *   2. Rentabilidad ponderada por el dinero (MWR, la TIR del cliente que aportó dinero a mitad de año). Distractores:
 *      la TWR del paso 1 y la ganancia sobre lo aportado.
 *   3. Máxima caída (drawdown) del valor liquidativo: la mayor caída desde un máximo. Distractores: la caída desde el
 *      máximo hasta el final y el peor mes.
 *   4. Ratio de Sharpe: (TWR − tipo sin riesgo) / volatilidad anual. Distractores: sin restar el tipo sin riesgo y
 *      dividiendo por la volatilidad mensual.
 * Cifras ficticias; las rentabilidades mensuales son enteras (en %).
 */

export interface ReportSetup {
  seed: number;
  /** Doce rentabilidades mensuales (%), aportación inicial y de mitad de año (€) y tipo sin riesgo (%). */
  months: number[];
  start: number;
  added: number;
  rf: number;
}

const pick = <T>(rnd: () => number, xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)]!;
const r2 = (x: number) => Math.round(x * 100) / 100;

export function setupReport(seed: number): ReportSetup {
  if (seed === 0)
    return {
      seed,
      months: [3, 2, -1, 4, 2, 3, -5, -3, 2, -2, 3, 2],
      start: 10_000,
      added: 10_000,
      rf: 2,
    };
  const rnd = mulberry32(seed);
  for (;;) {
    const s: ReportSetup = {
      seed,
      months: Array.from({ length: 12 }, () => Math.round(rnd() * 12 - 5)),
      start: pick(rnd, [10_000, 20_000, 50_000]),
      added: pick(rnd, [5000, 10_000, 20_000]),
      rf: pick(rnd, [1, 2, 3]),
    };
    // primer semestre positivo y segundo peor: el cliente aporta tras el buen tramo y su MWR queda por debajo de la TWR
    if (
      h1(s) > 0 &&
      h2(s) < h1(s) &&
      new Set(twrOptions(s)).size === 3 &&
      new Set(mwrOptions(s)).size === 3 &&
      new Set(ddOptions(s)).size === 3 &&
      new Set(sharpeOptions(s)).size === 3 &&
      vol(s) > 0
    )
      return s;
  }
}

const growth = (ms: readonly number[]) => ms.reduce((g, m) => g * (1 + m / 100), 1);
/** Rentabilidad de cada semestre (%, 2 decimales). */
export const h1 = (s: ReportSetup) => r2((growth(s.months.slice(0, 6)) - 1) * 100);
export const h2 = (s: ReportSetup) => r2((growth(s.months.slice(6)) - 1) * 100);

/** Paso 1: TWR del año (%, 2 decimales), con los semestres ya redondeados como se muestran. */
export const twr = (s: ReportSetup) => r2(((1 + h1(s) / 100) * (1 + h2(s) / 100) - 1) * 100);
export function twrOptions(s: ReportSetup): number[] {
  return [twr(s), r2(h1(s) + h2(s)), r2((h1(s) + h2(s)) / 2)].sort((a, b) => a - b);
}

/** Paso 2: valor final del cliente (€) y su TIR anual (MWR, %), con la aportación a mitad de año. */
export const endValue = (s: ReportSetup) =>
  r2((s.start * (1 + h1(s) / 100) + s.added) * (1 + h2(s) / 100));
export function mwr(s: ReportSetup): number {
  const v = endValue(s);
  const f = (r: number) => s.start * (1 + r) + s.added * Math.sqrt(1 + r) - v;
  let lo = -0.99;
  let hi = 2;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) > 0) hi = mid;
    else lo = mid;
  }
  return r2(((lo + hi) / 2) * 100);
}
export const roi = (s: ReportSetup) =>
  r2(((endValue(s) - s.start - s.added) / (s.start + s.added)) * 100);
export function mwrOptions(s: ReportSetup): number[] {
  return [mwr(s), twr(s), roi(s)].sort((a, b) => a - b);
}

/** Paso 3: valor liquidativo (desde 100) a fin de cada mes, máxima caída, caída desde el máximo al final y peor mes. */
export const nav = (s: ReportSetup) => {
  const out = [100];
  for (const m of s.months) out.push(out.at(-1)! * (1 + m / 100));
  return out;
};
export function maxDrawdown(s: ReportSetup): number {
  let peak = 100;
  let worst = 0;
  for (const v of nav(s)) {
    peak = Math.max(peak, v);
    worst = Math.max(worst, (peak - v) / peak);
  }
  return r2(worst * 100);
}
export const fromPeakToEnd = (s: ReportSetup) => {
  const n = nav(s);
  return r2(((Math.max(...n) - n.at(-1)!) / Math.max(...n)) * 100);
};
export const worstMonth = (s: ReportSetup) => -Math.min(...s.months);
export function ddOptions(s: ReportSetup): number[] {
  return [maxDrawdown(s), fromPeakToEnd(s), worstMonth(s)].sort((a, b) => a - b);
}

/** Paso 4: volatilidad anual (desviación típica mensual con n − 1, × √12; %, 2 decimales) y Sharpe. */
export const volMonthly = (s: ReportSetup) => {
  const m = s.months.reduce((a, b) => a + b, 0) / 12;
  return r2(Math.sqrt(s.months.reduce((a, x) => a + (x - m) ** 2, 0) / 11));
};
export const vol = (s: ReportSetup) => r2(volMonthly(s) * Math.sqrt(12));
export const sharpe = (s: ReportSetup) => r2((twr(s) - s.rf) / vol(s));
export function sharpeOptions(s: ReportSetup): number[] {
  return [sharpe(s), r2(twr(s) / vol(s)), r2((twr(s) - s.rf) / volMonthly(s))].sort(
    (a, b) => a - b,
  );
}

export interface ReportAnswer {
  twr: number;
  mwr: number;
  dd: number;
  sharpe: number;
}

export interface ReportResult {
  twrHit: boolean;
  mwrHit: boolean;
  ddHit: boolean;
  sharpeHit: boolean;
  score: number;
}

/** Nota: un cuarto por paso. */
export function reportResult(s: ReportSetup, a: ReportAnswer): ReportResult {
  const twrHit = a.twr === twr(s);
  const mwrHit = a.mwr === mwr(s);
  const ddHit = a.dd === maxDrawdown(s);
  const sharpeHit = a.sharpe === sharpe(s);
  return { twrHit, mwrHit, ddHit, sharpeHit, score: (+twrHit + +mwrHit + +ddHit + +sharpeHit) / 4 };
}

/** Cifras de la partida para la explicación y los ejercicios (marcadores {nombre}, en snake_case). */
export function reportValues(s: ReportSetup, a: ReportAnswer): Record<string, number> {
  const r = reportResult(s, a);
  return {
    h1: h1(s),
    h2: h2(s),
    twr: twr(s),
    start: s.start,
    added: s.added,
    end_value: endValue(s),
    mwr: mwr(s),
    roi: roi(s),
    max_dd: maxDrawdown(s),
    worst_month: worstMonth(s),
    vol_m: volMonthly(s),
    vol: vol(s),
    rf: s.rf,
    sharpe: sharpe(s),
    hits: +r.twrHit + +r.mwrHit + +r.ddHit + +r.sharpeHit,
  };
}
