import { mulberry32 } from '../prng';

/*
 * «Mesa de órdenes» (lección-juego de la planta 4, unidad «Libro de órdenes, market makers y dark pools»; ficha 3
 * de JUEGOS.md en su versión de N5). Parte de lo que enseñó n1-u4 (horquilla, impacto, trocear) y va un paso más
 * allá. Cuatro pasos sobre una acción ficticia:
 *   1. Horquilla efectiva de tu ejecución: 2 × (precio ejecutado − punto medio) / punto medio, en pb.
 *   2. Horquilla realizada del market maker que te vendió: 2 × (precio − punto medio 5 minutos después), en pb del
 *      punto medio inicial; la diferencia con la efectiva es el impacto en el precio (selección adversa).
 *   3. Dark pool: cruzar el bloque al punto medio en lugar de barrer el libro visible ahorra
 *      cantidad × (precio medio en el libro − punto medio).
 *   4. El market maker ante el flujo: si llega flujo informado (todo en un sentido tras una noticia), ensancha la
 *      horquilla; si es flujo equilibrado de muchos minoristas, la mantiene.
 * Precios en céntimos dentro del motor para evitar errores de coma flotante; cifras ficticias.
 */

export type MakerMove = 'widen' | 'keep' | 'narrow';

export interface DeskSetup {
  seed: number;
  /** Punto medio (céntimos) y media horquilla cotizada (céntimos). */
  midC: number;
  halfC: number;
  /** Paso 1: céntimos por encima del ask a los que se ejecutó tu compra (barriste el libro). */
  walkC: number;
  /** Paso 2: subida del punto medio 5 minutos después (medios céntimos). */
  driftHalfC: number;
  /** Paso 3: bloque (acciones) y céntimos por encima del ask del precio medio barriendo el libro visible. */
  qty: number;
  sweepC: number;
  /** Paso 4: ¿llega flujo informado? */
  informed: boolean;
}

const pick = <T>(rnd: () => number, xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)]!;
const r1 = (x: number) => Math.round(x * 10) / 10;
const eur = (c: number) => Math.round(c) / 100;

export function setupDesk(seed: number): DeskSetup {
  if (seed === 0)
    return {
      seed,
      midC: 1000,
      halfC: 2,
      walkC: 1,
      driftHalfC: 3,
      qty: 20_000,
      sweepC: 4,
      informed: true,
    };
  const rnd = mulberry32(seed);
  const halfC = pick(rnd, [1, 2, 3]);
  // ninguna elección hace coincidir dos opciones: walk ≠ half, deriva ≠ half y barrido ≠ half
  const walkC = pick(
    rnd,
    [1, 2, 3].filter((k) => k !== halfC),
  );
  const driftHalfC = pick(
    rnd,
    [1, 3, 5].filter((d) => d !== halfC),
  );
  const sweepC = pick(
    rnd,
    [2, 3, 4, 5].filter((w) => w !== halfC),
  );
  return {
    seed,
    midC: pick(rnd, [800, 1000, 1200, 1500, 2000]),
    halfC,
    walkC,
    driftHalfC,
    qty: pick(rnd, [10_000, 20_000, 50_000]),
    sweepC,
    informed: rnd() < 0.5,
  };
}

/** Precios en euros. */
export const mid = (s: DeskSetup) => eur(s.midC);
export const bid = (s: DeskSetup) => eur(s.midC - s.halfC);
export const ask = (s: DeskSetup) => eur(s.midC + s.halfC);
export const fill = (s: DeskSetup) => eur(s.midC + s.halfC + s.walkC);
/** Punto medio 5 minutos después (puede acabar en medio céntimo). */
export const mid5 = (s: DeskSetup) => Math.round(s.midC * 2 + s.driftHalfC) / 200;
export const litAvg = (s: DeskSetup) => eur(s.midC + s.halfC + s.sweepC);

/** Puntos básicos sobre el punto medio inicial (1 decimal). */
const bp = (s: DeskSetup, cents: number) => r1((cents / s.midC) * 10_000);

/** Paso 1: horquilla efectiva, cotizada y la mitad de la efectiva (pb). */
export const effectiveBp = (s: DeskSetup) => bp(s, 2 * (s.halfC + s.walkC));
export const quotedBp = (s: DeskSetup) => bp(s, 2 * s.halfC);
export function effectiveOptions(s: DeskSetup): number[] {
  return [effectiveBp(s), quotedBp(s), bp(s, s.halfC + s.walkC)].sort((a, b) => a - b);
}

/** Paso 2: el market maker vendió al ask; horquilla realizada, efectiva e impacto en el precio (pb). */
export const realizedBp = (s: DeskSetup) => bp(s, 2 * s.halfC - s.driftHalfC);
export const impactBp = (s: DeskSetup) => bp(s, s.driftHalfC);
export function realizedOptions(s: DeskSetup): number[] {
  return [realizedBp(s), quotedBp(s), impactBp(s)].sort((a, b) => a - b);
}

/** Paso 3: ahorro de cruzar el bloque al punto medio en un dark pool (€). */
export const darkSaving = (s: DeskSetup) => Math.round(s.qty * (s.halfC + s.sweepC)) / 100;
export function savingOptions(s: DeskSetup): number[] {
  return [
    darkSaving(s),
    Math.round(s.qty * s.sweepC) / 100,
    Math.round(s.qty * s.halfC) / 100,
  ].sort((a, b) => a - b);
}

/** Paso 4: con flujo informado, ensancha; con flujo equilibrado, mantiene. */
export const rightMove = (s: DeskSetup): MakerMove => (s.informed ? 'widen' : 'keep');

export interface DeskAnswer {
  effective: number;
  realized: number;
  saving: number;
  move: MakerMove;
}

export interface DeskResult {
  effectiveHit: boolean;
  realizedHit: boolean;
  savingHit: boolean;
  moveHit: boolean;
  score: number;
}

/** Nota: un cuarto por paso. */
export function deskResult(s: DeskSetup, a: DeskAnswer): DeskResult {
  const effectiveHit = a.effective === effectiveBp(s);
  const realizedHit = a.realized === realizedBp(s);
  const savingHit = a.saving === darkSaving(s);
  const moveHit = a.move === rightMove(s);
  return {
    effectiveHit,
    realizedHit,
    savingHit,
    moveHit,
    score: (+effectiveHit + +realizedHit + +savingHit + +moveHit) / 4,
  };
}

/** Cifras de la partida para la explicación y los ejercicios (marcadores {nombre}, en snake_case). */
export function deskValues(s: DeskSetup, a: DeskAnswer): Record<string, number> {
  const r = deskResult(s, a);
  return {
    mid: mid(s),
    half_c: s.halfC,
    bid: bid(s),
    ask: ask(s),
    fill: fill(s),
    quoted_bp: quotedBp(s),
    effective_bp: effectiveBp(s),
    mid5: mid5(s),
    realized_bp: realizedBp(s),
    impact_bp: impactBp(s),
    qty: s.qty,
    lit_avg: litAvg(s),
    saving: darkSaving(s),
    informed: s.informed ? 1 : 0,
    hits: +r.effectiveHit + +r.realizedHit + +r.savingHit + +r.moveHit,
  };
}
