import { mulberry32 } from '../prng';

/*
 * «Comité de riesgos» (lección-juego de la planta 3, unidad «Riesgo de crédito y supervisión»; ficha 15 de
 * JUEGOS.md, en versión troncal): el comité de riesgos de Banca Malvarrosa, banco comercial ficticio, con el equipo
 * de Albufera Partners de observador. Cuatro pasos:
 *   1. Pérdida esperada de una solicitud: EL = PD × LGD × EAD.
 *   2. Decisión: si el margen anual del préstamo cubre la pérdida esperada, se concede; si solo la cubre con una
 *      garantía que baja la LGD, se pide la garantía; si ni así, se deniega.
 *   3. NIIF 9: fase de otro préstamo de la cartera con la regla de la mesa (más de 90 días de retraso → fase 3; más
 *      de 30 días o una caída del rating de 3 escalones o más → fase 2; si no, fase 1).
 *   4. Provisión de ese préstamo: fase 1, PD a 12 meses × LGD × EAD; fase 2, PD de toda la vida × LGD × EAD;
 *      fase 3, LGD × EAD (impago ya ocurrido).
 * Cifras ficticias, en miles de €.
 */

export type Decision = 'approve' | 'collateral' | 'reject';
export const DECISIONS: readonly Decision[] = ['approve', 'collateral', 'reject'];
export type Stage = 1 | 2 | 3;

export interface CommitteeSetup {
  seed: number;
  /** Solicitud: exposición (miles de €), PD (%), LGD sin y con garantía (%) y margen anual (% de la EAD). */
  ead: number;
  pd: number;
  lgd: number;
  lgdCollateral: number;
  margin: number;
  /** Préstamo de la cartera: exposición, PD a 12 meses y de toda la vida, LGD (%), días de retraso y escalones que
   * ha caído su rating desde la concesión. */
  ead2: number;
  pd12: number;
  pdLife: number;
  lgd2: number;
  days: number;
  notches: number;
}

const pick = <T>(rnd: () => number, xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)]!;
const r1 = (x: number) => Math.round(x * 10) / 10;
const r2 = (x: number) => Math.round(x * 100) / 100;

export function setupCommittee(seed: number): CommitteeSetup {
  if (seed === 0)
    return {
      seed,
      ead: 1_000,
      pd: 2,
      lgd: 45,
      lgdCollateral: 25,
      margin: 0.8,
      ead2: 600,
      pd12: 1.5,
      pdLife: 8,
      lgd2: 40,
      days: 45,
      notches: 1,
    };
  const rnd = mulberry32(seed);
  const pd = pick(rnd, [2, 3, 4]);
  const lgd = pick(rnd, [40, 45, 60]);
  const lgdCollateral = pick(rnd, [20, 25]);
  const elPct = (pd * lgd) / 100;
  const elcPct = (pd * lgdCollateral) / 100;
  const decision = pick(rnd, DECISIONS);
  // el margen se elige a una distancia clara de los umbrales: nunca coincide con la pérdida esperada
  const margin =
    decision === 'approve'
      ? r1(elPct + pick(rnd, [0.3, 0.6]))
      : decision === 'collateral'
        ? r1((elPct + elcPct) / 2)
        : r1(elcPct - pick(rnd, [0.1, 0.2]));
  const stage = pick(rnd, [1, 2, 3] as const);
  const [days, notches] =
    stage === 1
      ? [pick(rnd, [0, 10, 20]), pick(rnd, [0, 1])]
      : stage === 2
        ? pick(rnd, [
            [35, 1],
            [45, 0],
            [60, 2],
            [0, 3],
          ] as const)
        : [pick(rnd, [95, 120, 150]), pick(rnd, [2, 4])];
  return {
    seed,
    ead: pick(rnd, [500, 800, 1_000, 1_500, 2_000]),
    pd,
    lgd,
    lgdCollateral,
    margin,
    ead2: pick(rnd, [400, 600, 1_200]),
    pd12: pick(rnd, [1, 1.5, 2]),
    pdLife: pick(rnd, [5, 8, 12]),
    lgd2: pick(rnd, [35, 40, 50]),
    days,
    notches,
  };
}

/** Pérdida esperada de la solicitud (miles de €). */
export const expectedLoss = (s: CommitteeSetup) => r2((s.pd * s.lgd * s.ead) / 10_000);

/** Opciones: la buena, sin la LGD y sin la PD. */
export function elOptions(s: CommitteeSetup): number[] {
  return [expectedLoss(s), r2((s.pd * s.ead) / 100), r2((s.lgd * s.ead) / 100)].sort(
    (a, b) => a - b,
  );
}

/** Margen anual del préstamo y pérdida esperada con garantía (miles de €). */
export const marginIncome = (s: CommitteeSetup) => r2((s.margin * s.ead) / 100);
export const elCollateral = (s: CommitteeSetup) => r2((s.pd * s.lgdCollateral * s.ead) / 10_000);

/** Decisión del comité: concede si el margen cubre la pérdida esperada; si solo con garantía, la pide. */
export function rightDecision(s: CommitteeSetup): Decision {
  if (marginIncome(s) > expectedLoss(s)) return 'approve';
  if (marginIncome(s) > elCollateral(s)) return 'collateral';
  return 'reject';
}

/** Fase NIIF 9 con la regla de la mesa. */
export function stageOf(s: CommitteeSetup): Stage {
  if (s.days > 90) return 3;
  if (s.days > 30 || s.notches >= 3) return 2;
  return 1;
}

/** Provisión de cada fase (miles de €). */
export function provisionFor(s: CommitteeSetup, stage: Stage): number {
  const pd = stage === 1 ? s.pd12 : stage === 2 ? s.pdLife : 100;
  return r2((pd * s.lgd2 * s.ead2) / 10_000);
}
export const provision = (s: CommitteeSetup) => provisionFor(s, stageOf(s));

/** Opciones: la provisión de cada una de las tres fases. */
export const provisionOptions = (s: CommitteeSetup): number[] =>
  ([1, 2, 3] as const).map((k) => provisionFor(s, k));

export interface CommitteeAnswer {
  el: number;
  decision: Decision;
  stage: Stage;
  provision: number;
}

export interface CommitteeResult {
  elHit: boolean;
  decisionHit: boolean;
  stageHit: boolean;
  provisionHit: boolean;
  score: number;
}

/** Nota: un cuarto por paso. La provisión se corrige con la fase real, no con la elegida. */
export function committeeResult(s: CommitteeSetup, a: CommitteeAnswer): CommitteeResult {
  const elHit = a.el === expectedLoss(s);
  const decisionHit = a.decision === rightDecision(s);
  const stageHit = a.stage === stageOf(s);
  const provisionHit = a.provision === provision(s);
  return {
    elHit,
    decisionHit,
    stageHit,
    provisionHit,
    score: (+elHit + +decisionHit + +stageHit + +provisionHit) / 4,
  };
}

/** Cifras de la partida para la explicación y los ejercicios (marcadores {nombre}, en snake_case). */
export function committeeValues(s: CommitteeSetup, a: CommitteeAnswer): Record<string, number> {
  const r = committeeResult(s, a);
  return {
    ead: s.ead,
    pd: s.pd,
    lgd: s.lgd,
    el: expectedLoss(s),
    margin: s.margin,
    margin_income: marginIncome(s),
    lgd_collateral: s.lgdCollateral,
    el_collateral: elCollateral(s),
    ead2: s.ead2,
    pd12: s.pd12,
    pd_life: s.pdLife,
    lgd2: s.lgd2,
    days: s.days,
    notches: s.notches,
    stage: stageOf(s),
    provision: provision(s),
    hits: +r.elHit + +r.decisionHit + +r.stageHit + +r.provisionHit,
  };
}
