import { mulberry32 } from '../prng';

/*
 * «La cartera de dos activos» (lección-juego de la planta 5, unidad «Diversificación, Markowitz y CAPM con
 * regresión»). Juego nuevo de cuatro pasos sobre un fondo ficticio de acciones (A) y bonos (B):
 *   1. Volatilidad de la cartera con correlación ρ: √(w²σA² + (1 − w)²σB² + 2w(1 − w)ρσAσB). Distractores: la media
 *      ponderada de las volatilidades (ρ = 1) y la fórmula sin el término de covarianza (ρ = 0).
 *   2. Peso en A de la cartera de mínima varianza: (σB² − ρσAσB) / (σA² + σB² − 2ρσAσB). Distractores: 50 % y el
 *      peso por volatilidad inversa, σB / (σA + σB).
 *   3. Línea del mercado de capitales: rentabilidad esperada para una volatilidad σ* combinando la cartera tangente
 *      con el activo sin riesgo: rf + (Rt − rf) / σt × σ*. Distractores: sin el tipo sin riesgo y con el cociente al revés.
 *   4. Alfa de Jensen: β = ρ × σi / σm (la pendiente de la regresión) y α = R − [rf + β(Rm − rf)]. Distractores: usar
 *      ρ como si fuera la beta y comparar sin más con el mercado (R − Rm).
 * Cifras ficticias, en % con números enteros salvo la correlación.
 */

export interface TwoSetup {
  seed: number;
  /** Paso 1 y 2: volatilidades (%), correlación (décimas) y peso en A (%). */
  sA: number;
  sB: number;
  rho10: number;
  wA: number;
  /** Paso 3: tipo sin riesgo, rentabilidad y volatilidad de la cartera tangente y volatilidad objetivo (%). */
  rf: number;
  rt: number;
  st: number;
  target: number;
  /** Paso 4: rentabilidad de la acción, correlación con el mercado (décimas), volatilidades y rentabilidad del mercado. */
  ri: number;
  rhoM10: number;
  si: number;
  sm: number;
  rm: number;
}

const pick = <T>(rnd: () => number, xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)]!;
const r1 = (x: number) => Math.round(x * 10) / 10;
const r2 = (x: number) => Math.round(x * 100) / 100;

export function setupTwo(seed: number): TwoSetup {
  if (seed === 0)
    return {
      seed,
      sA: 20,
      sB: 8,
      rho10: 2,
      wA: 60,
      rf: 2,
      rt: 7,
      st: 12,
      target: 9,
      ri: 12,
      rhoM10: 6,
      si: 30,
      sm: 15,
      rm: 8,
    };
  const rnd = mulberry32(seed);
  for (;;) {
    const s: TwoSetup = {
      seed,
      sA: pick(rnd, [15, 18, 20, 25]),
      sB: pick(rnd, [5, 6, 8, 10]),
      rho10: pick(rnd, [-3, -1, 0, 2, 4]),
      wA: pick(rnd, [40, 50, 60, 70]),
      rf: pick(rnd, [1, 2, 3]),
      rt: pick(rnd, [6, 7, 8, 9]),
      st: pick(rnd, [10, 12, 15]),
      target: pick(rnd, [6, 8, 9, 20]),
      ri: pick(rnd, [8, 10, 12, 14]),
      rhoM10: pick(rnd, [4, 5, 6, 7, 8]),
      si: pick(rnd, [20, 25, 30, 35]),
      sm: pick(rnd, [12, 15, 18]),
      rm: pick(rnd, [6, 7, 8, 9]),
    };
    if (
      [volOptions(s), minVarOptions(s), cmlOptions(s), alphaOptions(s)].every(
        (o) => new Set(o).size === 3,
      ) &&
      alpha(s) !== 0 &&
      minVarWeight(s) > 0 &&
      minVarWeight(s) < 100
    )
      return s;
  }
}

export const rho = (s: TwoSetup) => s.rho10 / 10;
/** Paso 1: volatilidad de la cartera (%, 2 decimales). */
export function portVol(s: TwoSetup, w = s.wA / 100, r = rho(s)): number {
  const v = w * w * s.sA ** 2 + (1 - w) ** 2 * s.sB ** 2 + 2 * w * (1 - w) * r * s.sA * s.sB;
  return r2(Math.sqrt(v));
}
export function volOptions(s: TwoSetup): number[] {
  const w = s.wA / 100;
  return [portVol(s), r2(w * s.sA + (1 - w) * s.sB), portVol(s, w, 0)].sort((a, b) => a - b);
}

/** Paso 2: peso en A de la cartera de mínima varianza (%, 1 decimal). */
export const minVarWeight = (s: TwoSetup) => {
  const c = rho(s) * s.sA * s.sB;
  return r1(((s.sB ** 2 - c) / (s.sA ** 2 + s.sB ** 2 - 2 * c)) * 100);
};
export function minVarOptions(s: TwoSetup): number[] {
  return [minVarWeight(s), 50, r1((s.sB / (s.sA + s.sB)) * 100)].sort((a, b) => a - b);
}

/** Paso 3: rentabilidad en la línea del mercado de capitales (%, 2 decimales). */
export const cml = (s: TwoSetup) => r2(s.rf + ((s.rt - s.rf) / s.st) * s.target);
export function cmlOptions(s: TwoSetup): number[] {
  return [cml(s), r2((s.rt * s.target) / s.st), r2(s.rf + ((s.rt - s.rf) * s.st) / s.target)].sort(
    (a, b) => a - b,
  );
}

/** Paso 4: beta como pendiente de la regresión y alfa de Jensen (%, 2 decimales). */
export const beta = (s: TwoSetup) => r2(((s.rhoM10 / 10) * s.si) / s.sm);
export const alpha = (s: TwoSetup) => r2(s.ri - (s.rf + beta(s) * (s.rm - s.rf)));
export function alphaOptions(s: TwoSetup): number[] {
  return [alpha(s), r2(s.ri - (s.rf + (s.rhoM10 / 10) * (s.rm - s.rf))), r2(s.ri - s.rm)].sort(
    (a, b) => a - b,
  );
}

export interface TwoAnswer {
  vol: number;
  minVar: number;
  cml: number;
  alpha: number;
}

export interface TwoResult {
  volHit: boolean;
  minVarHit: boolean;
  cmlHit: boolean;
  alphaHit: boolean;
  score: number;
}

/** Nota: un cuarto por paso. */
export function twoResult(s: TwoSetup, a: TwoAnswer): TwoResult {
  const volHit = a.vol === portVol(s);
  const minVarHit = a.minVar === minVarWeight(s);
  const cmlHit = a.cml === cml(s);
  const alphaHit = a.alpha === alpha(s);
  return {
    volHit,
    minVarHit,
    cmlHit,
    alphaHit,
    score: (+volHit + +minVarHit + +cmlHit + +alphaHit) / 4,
  };
}

/** Cifras de la partida para la explicación y los ejercicios (marcadores {nombre}, en snake_case). */
export function twoValues(s: TwoSetup, a: TwoAnswer): Record<string, number> {
  const r = twoResult(s, a);
  return {
    s_a: s.sA,
    s_b: s.sB,
    rho: rho(s),
    w_a: s.wA,
    port_vol: portVol(s),
    avg_vol: r2((s.wA / 100) * s.sA + (1 - s.wA / 100) * s.sB),
    min_var_w: minVarWeight(s),
    rf: s.rf,
    rt: s.rt,
    st: s.st,
    target: s.target,
    cml: cml(s),
    ri: s.ri,
    rho_m: s.rhoM10 / 10,
    si: s.si,
    sm: s.sm,
    rm: s.rm,
    beta: beta(s),
    alpha: alpha(s),
    hits: +r.volHit + +r.minVarHit + +r.cmlHit + +r.alphaHit,
  };
}
