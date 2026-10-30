import { mulberry32 } from '../prng';

/*
 * «¿Ventaja real?» (lección-juego de la planta 4, unidad «Probabilidad, valor esperado y contraste de hipótesis»).
 * Ninguna ficha de JUEGOS.md encaja (la 18, «La trampa del backtest», es de la rama Pro de Fintech), así que es un
 * juego sencillo de cuatro pasos sobre la estrategia ficticia que un becario lleva al comité:
 *   1. Valor esperado por operación: acierto × ganancia media − fallo × pérdida media. Distractores: solo las
 *      ganancias (acierto × ganancia) y la diferencia media sin probabilidades ((ganancia − pérdida) / 2).
 *   2. Estadístico t de la estrategia ≈ Sharpe anual × √años. Distractores: Sharpe × años y Sharpe / √años.
 *   3. Multiple testing: de N estrategias sin ninguna ventaja, al 5 % salen «significativas» de media N × 0,05.
 *      Distractores: N × 0,5 y N × 0,01.
 *   4. Bayes: probabilidad de que la estrategia tenga ventaja si la señal del backtest dice que sí:
 *      s·b / (s·b + f·(1 − b)). Distractores: la sensibilidad s y s·b.
 * Cifras ficticias.
 */

export interface EdgeSetup {
  seed: number;
  /** Paso 1: porcentaje de acierto, ganancia y pérdida medias por operación (€). */
  winPct: number;
  avgWin: number;
  avgLoss: number;
  /** Paso 2: Sharpe anual (en centésimas) y años del backtest. */
  sharpeC: number;
  years: number;
  /** Paso 3: estrategias probadas. */
  tests: number;
  /** Paso 4: probabilidad previa de ventaja, sensibilidad y falsos positivos (%). */
  prior: number;
  sens: number;
  fpr: number;
}

const pick = <T>(rnd: () => number, xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)]!;
const r1 = (x: number) => Math.round(x * 10) / 10;
const r2 = (x: number) => Math.round(x * 100) / 100;

export function setupEdge(seed: number): EdgeSetup {
  if (seed === 0)
    return {
      seed,
      winPct: 55,
      avgWin: 120,
      avgLoss: 100,
      sharpeC: 80,
      years: 4,
      tests: 40,
      prior: 10,
      sens: 80,
      fpr: 20,
    };
  const rnd = mulberry32(seed);
  for (;;) {
    const s: EdgeSetup = {
      seed,
      winPct: pick(rnd, [40, 45, 50, 55, 60]),
      avgWin: pick(rnd, [80, 100, 120, 150]),
      avgLoss: pick(rnd, [80, 100, 120]),
      sharpeC: pick(rnd, [40, 60, 80, 100, 120]),
      years: pick(rnd, [4, 9, 16]),
      tests: pick(rnd, [20, 40, 60, 100]),
      prior: pick(rnd, [5, 10, 20]),
      sens: pick(rnd, [70, 80, 90]),
      fpr: pick(rnd, [10, 20, 30]),
    };
    // nunca un valor esperado nulo ni un t justo en 2, y opciones distintas en cada paso
    if (
      ev(s) !== 0 &&
      tStat(s) !== 2 &&
      new Set(evOptions(s)).size === 3 &&
      new Set(posteriorOptions(s)).size === 3
    )
      return s;
  }
}

/** Paso 1: valor esperado por operación (€). */
export const ev = (s: EdgeSetup) => r2((s.winPct * s.avgWin - (100 - s.winPct) * s.avgLoss) / 100);
export function evOptions(s: EdgeSetup): number[] {
  return [ev(s), r2((s.winPct * s.avgWin) / 100), r2((s.avgWin - s.avgLoss) / 2)].sort(
    (a, b) => a - b,
  );
}

/** Paso 2: Sharpe anual y estadístico t ≈ Sharpe × √años (2 decimales). */
export const sharpe = (s: EdgeSetup) => s.sharpeC / 100;
export const tStat = (s: EdgeSetup) => r2(sharpe(s) * Math.sqrt(s.years));
export function tOptions(s: EdgeSetup): number[] {
  return [tStat(s), r2(sharpe(s) * s.years), r2(sharpe(s) / Math.sqrt(s.years))].sort(
    (a, b) => a - b,
  );
}
/** ¿Supera el umbral habitual de 2 (5 % a dos colas, aproximadamente)? */
export const significant = (s: EdgeSetup) => tStat(s) > 2;

/** Paso 3: falsos positivos esperados al 5 % entre N estrategias sin ventaja. */
export const falsePositives = (s: EdgeSetup) => r1(s.tests * 0.05);
export function fpOptions(s: EdgeSetup): number[] {
  return [falsePositives(s), r1(s.tests * 0.5), r1(s.tests * 0.01)].sort((a, b) => a - b);
}

/** Paso 4: probabilidad de ventaja real si el backtest da señal (%, 1 decimal). */
export const posterior = (s: EdgeSetup) =>
  r1((100 * s.sens * s.prior) / (s.sens * s.prior + s.fpr * (100 - s.prior)));
export function posteriorOptions(s: EdgeSetup): number[] {
  return [posterior(s), s.sens, r1((s.sens * s.prior) / 100)].sort((a, b) => a - b);
}

export interface EdgeAnswer {
  ev: number;
  t: number;
  fp: number;
  post: number;
}

export interface EdgeResult {
  evHit: boolean;
  tHit: boolean;
  fpHit: boolean;
  postHit: boolean;
  score: number;
}

/** Nota: un cuarto por paso. */
export function edgeResult(s: EdgeSetup, a: EdgeAnswer): EdgeResult {
  const evHit = a.ev === ev(s);
  const tHit = a.t === tStat(s);
  const fpHit = a.fp === falsePositives(s);
  const postHit = a.post === posterior(s);
  return { evHit, tHit, fpHit, postHit, score: (+evHit + +tHit + +fpHit + +postHit) / 4 };
}

/** Cifras de la partida para la explicación y los ejercicios (marcadores {nombre}, en snake_case). */
export function edgeValues(s: EdgeSetup, a: EdgeAnswer): Record<string, number> {
  const r = edgeResult(s, a);
  return {
    win_pct: s.winPct,
    avg_win: s.avgWin,
    avg_loss: s.avgLoss,
    ev: ev(s),
    sharpe: sharpe(s),
    years: s.years,
    t_stat: tStat(s),
    significant: significant(s) ? 1 : 0,
    n_tests: s.tests,
    false_pos: falsePositives(s),
    prior: s.prior,
    sens: s.sens,
    fpr: s.fpr,
    posterior: posterior(s),
    hits: +r.evHit + +r.tHit + +r.fpHit + +r.postHit,
  };
}
