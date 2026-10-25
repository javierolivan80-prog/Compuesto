import { mulberry32 } from '../prng';

/*
 * «¿Qué banco compras?» (lección-juego de la planta 3, unidad «Valorar bancos»): el equipo de research de Albufera
 * Partners compara dos bancos ficticios, Banca Malvarrosa y Banco Russafa. Cuatro pasos:
 *   1. ROTE de Banca Malvarrosa = beneficio neto / (patrimonio − intangibles).
 *   2. Su P/VTC = capitalización / patrimonio tangible.
 *   3. Su P/VTC justificado = (ROTE − g) / (Ke − g).
 *   4. ¿Qué banco está más barato frente a su P/VTC justificado? Banco Russafa da su ROTE y su P/VTC; gana el que
 *      tenga más recorrido (justificado / cotizado − 1).
 * Cifras ficticias, en millones de €.
 */

export type Pick = 'malvarrosa' | 'russafa' | 'same';

export interface BankSetup {
  seed: number;
  /** Banca Malvarrosa: beneficio neto, patrimonio neto, intangibles y capitalización (M€). */
  ni: number;
  equity: number;
  intangibles: number;
  cap: number;
  /** Coste del capital y crecimiento a largo plazo (%), iguales para los dos bancos. */
  ke: number;
  g: number;
  /** Banco Russafa: ROTE (%) y P/VTC. */
  roteR: number;
  pvtcR: number;
}

const pick = <T>(rnd: () => number, xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)]!;
const r1 = (x: number) => Math.round(x * 10) / 10;
const r2 = (x: number) => Math.round(x * 100) / 100;

const justify = (rote: number, ke: number, g: number) => r2((rote - g) / (ke - g));

export function setupBank(seed: number): BankSetup {
  if (seed === 0)
    return {
      seed,
      ni: 168,
      equity: 1_600,
      intangibles: 200,
      cap: 1_540,
      ke: 10,
      g: 2,
      roteR: 15,
      pvtcR: 1.7,
    };
  const rnd = mulberry32(seed);
  const tangible = pick(rnd, [1_200, 1_400, 1_600]);
  const intangibles = pick(rnd, [150, 200, 300]);
  const ke = pick(rnd, [9, 10, 11]);
  const g = pick(rnd, [1, 1.5, 2]);
  // el ROTE nunca iguala al Ke: con los dos iguales, el justificado (1) coincidiría con ROTE / Ke
  const rote = pick(
    rnd,
    [8, 12, 13, 14].map((x) => (x === ke ? x + 1 : x)),
  );
  // cotiza cerca de su justificado (entre un 20 % por debajo y un 20 % por encima), como un banco real
  const pvtc = r1(justify(rote, ke, g) * pick(rnd, [0.8, 0.9, 1.1, 1.2]));
  const upM = justify(rote, ke, g) / pvtc - 1;
  const roteR = pick(rnd, [7, 14, 15]);
  // Russafa queda claramente por encima o por debajo del recorrido de Malvarrosa
  const delta = pick(rnd, [0.15, 0.2]);
  const priceR = (sign: number) => r2(justify(roteR, ke, g) / (1 + upM + sign * delta));
  // si el sentido sorteado deja un P/VTC poco realista (fuera de 0,4–2,8), se usa el otro
  const first = rnd() < 0.5 ? 1 : -1;
  const pvtcR = priceR(first) >= 0.4 && priceR(first) <= 2.8 ? priceR(first) : priceR(-first);
  return {
    seed,
    ni: (tangible * rote) / 100,
    equity: tangible + intangibles,
    intangibles,
    cap: Math.round(tangible * pvtc),
    ke,
    g,
    roteR,
    pvtcR,
  };
}

/** Patrimonio tangible (M€). */
export const tangible = (s: BankSetup) => s.equity - s.intangibles;
/** ROTE y ROE (%, 1 decimal). */
export const rote = (s: BankSetup) => r1((s.ni / tangible(s)) * 100);
export const roe = (s: BankSetup) => r1((s.ni / s.equity) * 100);

/** Opciones del ROTE: el bueno, el ROE y sumando los intangibles en lugar de restarlos. */
export function roteOptions(s: BankSetup): number[] {
  return [rote(s), roe(s), r1((s.ni / (s.equity + s.intangibles)) * 100)].sort((a, b) => a - b);
}

/** P/VTC y P/VC (2 decimales). */
export const pvtc = (s: BankSetup) => r2(s.cap / tangible(s));
export const pvc = (s: BankSetup) => r2(s.cap / s.equity);

/** Opciones del P/VTC: el bueno, el P/VC y sumando los intangibles en lugar de restarlos. */
export function pvtcOptions(s: BankSetup): number[] {
  return [pvtc(s), pvc(s), r2(s.cap / (s.equity + s.intangibles))].sort((a, b) => a - b);
}

/** P/VTC justificado de Banca Malvarrosa (2 decimales). */
export const justified = (s: BankSetup) => justify(rote(s), s.ke, s.g);

/** Opciones del justificado: el bueno, ROTE / Ke (sin g) y (ROTE − g) / Ke. */
export function justifiedOptions(s: BankSetup): number[] {
  return [justified(s), r2(rote(s) / s.ke), r2((rote(s) - s.g) / s.ke)].sort((a, b) => a - b);
}

/** Justificado de Banco Russafa y recorrido de cada banco (justificado / cotizado − 1). */
export const justifiedR = (s: BankSetup) => justify(s.roteR, s.ke, s.g);
export const upside = (s: BankSetup) => justified(s) / pvtc(s) - 1;
export const upsideR = (s: BankSetup) => justifiedR(s) / s.pvtcR - 1;

/** El banco más barato frente a su justificado. */
export const rightPick = (s: BankSetup): Pick =>
  upside(s) > upsideR(s) ? 'malvarrosa' : 'russafa';

export interface BankAnswer {
  rote: number;
  pvtc: number;
  justified: number;
  pick: Pick;
}

export interface BankResult {
  roteHit: boolean;
  pvtcHit: boolean;
  justifiedHit: boolean;
  pickHit: boolean;
  score: number;
}

/** Nota: un cuarto por paso. */
export function bankResult(s: BankSetup, a: BankAnswer): BankResult {
  const roteHit = a.rote === rote(s);
  const pvtcHit = a.pvtc === pvtc(s);
  const justifiedHit = a.justified === justified(s);
  const pickHit = a.pick === rightPick(s);
  return {
    roteHit,
    pvtcHit,
    justifiedHit,
    pickHit,
    score: (+roteHit + +pvtcHit + +justifiedHit + +pickHit) / 4,
  };
}

/** Cifras de la partida para la explicación y los ejercicios (marcadores {nombre}, en snake_case). */
export function bankValues(s: BankSetup, a: BankAnswer): Record<string, number> {
  const r = bankResult(s, a);
  return {
    ni: s.ni,
    equity: s.equity,
    intangibles: s.intangibles,
    tangible: tangible(s),
    rote: rote(s),
    roe: roe(s),
    cap: s.cap,
    pvtc: pvtc(s),
    pvc: pvc(s),
    ke: s.ke,
    g: s.g,
    justified: justified(s),
    rote_r: s.roteR,
    pvtc_r: s.pvtcR,
    justified_r: justifiedR(s),
    hits: +r.roteHit + +r.pvtcHit + +r.justifiedHit + +r.pickHit,
  };
}
