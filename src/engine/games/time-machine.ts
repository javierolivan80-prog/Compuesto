import { mulberry32 } from '../prng';

/*
 * «Máquina del tiempo» (ficha 6 de JUEGOS.md, en su versión de N6, para la unidad «VaR, CVaR, Monte Carlo y
 * backtest»). La mesa de riesgos de Albufera Partners rebobina hasta dos crisis históricas. Las cifras son
 * aproximadas e ilustrativas, y la pantalla lo dice:
 *   1. Antes de 2008, con la volatilidad diaria de los años tranquilos: VaR paramétrico a un día = z × σ × valor
 *      (media diaria ≈ 0). Distractores: con el z del otro nivel de confianza y sin z.
 *   2. Los cinco peores días de 2008, el peor 2 % de 250 sesiones: su media es el CVaR histórico al 98 %.
 *      Distractores: la peor pérdida y el propio VaR.
 *   3. Backtesting del VaR en 2008: excepciones esperadas en 250 días = 250 × (1 − confianza). Distractores: las
 *      observadas y una al año.
 *   4. Un punto de decisión en otra crisis (2000, 2012 o 2020) con la cartera muy por debajo: mantener el plan
 *      (bien), venderlo todo o apalancarse para «recuperar».
 */

export type Crisis = '2000' | '2012' | '2020';
export type Move = 'hold' | 'sell' | 'lever';

export interface MachineSetup {
  seed: number;
  /** Valor de la cartera (€), volatilidad diaria antes de la crisis (décimas de punto) y confianza (95 o 99). */
  value: number;
  sigma10: number;
  conf: 95 | 99;
  /** Cinco peores pérdidas diarias de 2008 (décimas de punto, en positivo), por encima del VaR. */
  worst10: [number, number, number, number, number];
  /** Excepciones observadas en los 250 días de 2008 (siempre más que las esperadas). */
  observed: number;
  crisis: Crisis;
}

/** z de la normal a una cola. */
export const Z = { 95: 1.645, 99: 2.33 } as const;
export const DAYS = 250;

const pick = <T>(rnd: () => number, xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)]!;
const r2 = (x: number) => Math.round(x * 100) / 100;

export function setupMachine(seed: number): MachineSetup {
  if (seed === 0)
    return {
      seed,
      value: 1_000_000,
      sigma10: 10,
      conf: 99,
      worst10: [90, 76, 69, 61, 54],
      observed: 12,
      crisis: '2020',
    };
  const rnd = mulberry32(seed);
  for (;;) {
    const top = pick(rnd, [80, 90, 95, 105]);
    const s: MachineSetup = {
      seed,
      value: pick(rnd, [1_000_000, 2_000_000, 5_000_000]),
      sigma10: pick(rnd, [8, 10, 12]),
      conf: pick(rnd, [95, 99] as const),
      worst10: [
        top,
        top - pick(rnd, [8, 12, 14]),
        top - 20,
        top - 27,
        top - pick(rnd, [33, 36]),
      ] as [number, number, number, number, number],
      observed: 0,
      crisis: pick(rnd, ['2000', '2012', '2020'] as const),
    };
    s.observed = s.conf === 99 ? pick(rnd, [8, 10, 12, 14, 18]) : pick(rnd, [18, 22, 26, 30]);
    if (
      new Set(varOptions(s)).size === 3 &&
      new Set(cvarOptions(s)).size === 3 &&
      new Set(expectedOptions(s)).size === 3 &&
      worstLosses(s).every((w) => w > varPct(s))
    )
      return s;
  }
}

export const sigma = (s: MachineSetup) => s.sigma10 / 10;
/** Paso 1: VaR a un día en % y en € (media diaria ≈ 0). */
export const varPct = (s: MachineSetup) => r2(Z[s.conf] * sigma(s));
export const varEur = (s: MachineSetup) => Math.round((varPct(s) / 100) * s.value);
export function varOptions(s: MachineSetup): number[] {
  const other = s.conf === 99 ? Z[95] : Z[99];
  return [
    varEur(s),
    Math.round((r2(other * sigma(s)) / 100) * s.value),
    Math.round((sigma(s) / 100) * s.value),
  ].sort((a, b) => a - b);
}

/** Paso 2: CVaR histórico al 98 %, la media de los cinco peores días de 250 (%, 2 decimales). */
export const worstLosses = (s: MachineSetup) => s.worst10.map((w) => w / 10);
export const cvarPct = (s: MachineSetup) => r2(worstLosses(s).reduce((a, b) => a + b, 0) / 5);
export function cvarOptions(s: MachineSetup): number[] {
  return [cvarPct(s), worstLosses(s)[0]!, varPct(s)].sort((a, b) => a - b);
}

/** Paso 3: excepciones esperadas en 250 días. */
export const expected = (s: MachineSetup) => r2((DAYS * (100 - s.conf)) / 100);
export function expectedOptions(s: MachineSetup): number[] {
  return [expected(s), s.observed, 1].sort((a, b) => a - b);
}
/** Zona del semáforo de Basilea (solo para el VaR al 99 % en 250 días): 0–4 verde, 5–9 amarilla, 10 o más roja. */
export const zone = (s: MachineSetup) =>
  s.conf !== 99 ? 'na' : s.observed >= 10 ? 'red' : s.observed >= 5 ? 'yellow' : 'green';

export interface MachineAnswer {
  var: number;
  cvar: number;
  expected: number;
  move: Move;
}

export interface MachineResult {
  varHit: boolean;
  cvarHit: boolean;
  expectedHit: boolean;
  moveHit: boolean;
  score: number;
}

/** Nota: un cuarto por paso. */
export function machineResult(s: MachineSetup, a: MachineAnswer): MachineResult {
  const varHit = a.var === varEur(s);
  const cvarHit = a.cvar === cvarPct(s);
  const expectedHit = a.expected === expected(s);
  const moveHit = a.move === 'hold';
  return {
    varHit,
    cvarHit,
    expectedHit,
    moveHit,
    score: (+varHit + +cvarHit + +expectedHit + +moveHit) / 4,
  };
}

/** Cifras de la partida para la explicación y los ejercicios (marcadores {nombre}, en snake_case). */
export function machineValues(s: MachineSetup, a: MachineAnswer): Record<string, number> {
  const r = machineResult(s, a);
  return {
    value: s.value,
    sigma: sigma(s),
    conf: s.conf,
    tail: 100 - s.conf,
    z: Z[s.conf],
    var_pct: varPct(s),
    var_eur: varEur(s),
    worst: worstLosses(s)[0]!,
    cvar_pct: cvarPct(s),
    cvar_eur: Math.round((cvarPct(s) / 100) * s.value),
    days: DAYS,
    expected: expected(s),
    observed: s.observed,
    hits: +r.varHit + +r.cvarHit + +r.expectedHit + +r.moveHit,
  };
}
