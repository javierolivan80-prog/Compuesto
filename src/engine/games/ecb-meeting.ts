import { mulberry32 } from '../prng';

/*
 * «La reunión del BCE» (lección-juego de la planta 3, unidad «Bancos centrales: BCE, Fed y QE»): el día de la
 * reunión de política monetaria en la mesa de Albufera Partners. Cuatro pasos:
 *   1. Regla de Taylor simplificada: tipo = neutral real + inflación + 0,5 × (inflación − objetivo).
 *   2. Decisión frente a lo descontado: el euro reacciona a la sorpresa (decisión − lo que descontaba el mercado).
 *   3. Transmisión: una hipoteca variable al Euríbor + 1 %; si el Euríbor sube, ¿cuánto sube el interés del año?
 *   4. QE: el banco central compra bonos → su precio sube y su rentabilidad baja.
 * Cifras ficticias de una economía inventada.
 */

/** Objetivo de inflación del banco central (%). */
export const TARGET = 2;
/** Diferencial de la hipoteca sobre el Euríbor (puntos). */
export const SPREAD = 1;

export interface EcbSetup {
  seed: number;
  /** Tipo neutral real (%). */
  neutral: number;
  /** Inflación (%), nunca igual al objetivo. */
  inflation: number;
  /** Lo que descontaba el mercado y lo que decide el banco central (puntos básicos). */
  pricedBp: number;
  moveBp: number;
  /** Hipoteca variable: principal (€) y Euríbor antes y después (%). */
  principal: number;
  euribor0: number;
  euribor1: number;
}

const pick = <T>(rnd: () => number, xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)]!;
const r2 = (x: number) => Math.round(x * 100) / 100;

export function setupEcb(seed: number): EcbSetup {
  if (seed === 0)
    return {
      seed,
      neutral: 1,
      inflation: 3,
      pricedBp: 25,
      moveBp: 50,
      principal: 150_000,
      euribor0: 3,
      euribor1: 3.5,
    };
  const rnd = mulberry32(seed);
  const neutral = pick(rnd, [0.5, 1, 1.5]);
  // el objetivo (2 %) no entra en el sorteo: con la brecha nula, la regla y «sin brecha» coincidirían
  const inflation = pick(rnd, [1.5, 2.5, 3, 4]);
  const pricedBp = pick(rnd, [0, 25, 50]);
  const moveBp = pricedBp + pick(rnd, [-25, 0, 25]);
  const principal = pick(rnd, [100_000, 150_000, 200_000]);
  const rise = pick(rnd, [0.25, 0.5, 0.75]);
  return {
    seed,
    neutral,
    inflation,
    pricedBp,
    moveBp,
    principal,
    euribor0: 3,
    euribor1: r2(3 + rise),
  };
}

/** Tipo que sugiere la regla de Taylor simplificada (%). */
export const taylor = (s: EcbSetup) => r2(s.neutral + s.inflation + 0.5 * (s.inflation - TARGET));

/** Opciones de la regla: la buena, sin el término de la brecha y con la brecha entera (sin el 0,5). */
export function taylorOptions(s: EcbSetup): number[] {
  const noGap = r2(s.neutral + s.inflation);
  const fullGap = r2(s.neutral + s.inflation + (s.inflation - TARGET));
  return [taylor(s), noGap, fullGap].sort((a, b) => a - b);
}

/** Sorpresa: decisión menos lo descontado (puntos básicos). */
export const surpriseBp = (s: EcbSetup) => s.moveBp - s.pricedBp;

export type FxMove = 'up' | 'down' | 'flat';
/**
 * Más subida de la esperada → el euro se aprecia (a igualdad de lo demás); menos → se deprecia; lo esperado ya
 * estaba en el precio → apenas se mueve.
 */
export const rightFx = (s: EcbSetup): FxMove =>
  surpriseBp(s) > 0 ? 'up' : surpriseBp(s) < 0 ? 'down' : 'flat';

/** Subida aproximada del interés del primer año (€): principal × subida del Euríbor. */
export const extraInterest = (s: EcbSetup) =>
  Math.round(s.principal * (s.euribor1 - s.euribor0)) / 100;

/** Opciones de la hipoteca: la buena, con un cero de menos y el interés total al Euríbor nuevo. */
export function mortgageOptions(s: EcbSetup): number[] {
  const tenth = Math.round(extraInterest(s)) / 10;
  const total = Math.round(s.principal * s.euribor1) / 100;
  return [extraInterest(s), tenth, total].sort((a, b) => a - b);
}

export type QeEffect = 'priceUp' | 'priceDown' | 'none';
/** Compras del banco central: más demanda de bonos → precio arriba, rentabilidad abajo. */
export const RIGHT_QE: QeEffect = 'priceUp';

export interface EcbAnswer {
  taylor: number;
  fx: FxMove;
  extra: number;
  qe: QeEffect;
}

export interface EcbResult {
  taylorHit: boolean;
  fxHit: boolean;
  extraHit: boolean;
  qeHit: boolean;
  score: number;
}

/** Nota: un cuarto por paso. */
export function ecbResult(s: EcbSetup, a: EcbAnswer): EcbResult {
  const taylorHit = a.taylor === taylor(s);
  const fxHit = a.fx === rightFx(s);
  const extraHit = a.extra === extraInterest(s);
  const qeHit = a.qe === RIGHT_QE;
  return {
    taylorHit,
    fxHit,
    extraHit,
    qeHit,
    score: (+taylorHit + +fxHit + +extraHit + +qeHit) / 4,
  };
}

/** Cifras de la partida para la explicación y los ejercicios (marcadores {nombre}, en snake_case). */
export function ecbValues(s: EcbSetup, a: EcbAnswer): Record<string, number> {
  const r = ecbResult(s, a);
  return {
    neutral: s.neutral,
    inflation: s.inflation,
    target: TARGET,
    taylor: taylor(s),
    priced_bp: s.pricedBp,
    move_bp: s.moveBp,
    surprise_bp: surpriseBp(s),
    principal: s.principal,
    euribor0: s.euribor0,
    euribor1: s.euribor1,
    extra_interest: extraInterest(s),
    hits: +r.taylorHit + +r.fxHit + +r.extraHit + +r.qeHit,
  };
}
