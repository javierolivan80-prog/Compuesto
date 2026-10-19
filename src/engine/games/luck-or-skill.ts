import { mulberry32 } from '../prng';

/*
 * «¿Suerte o habilidad?» (lección-juego de la planta 2, unidad «Riesgo y estadística»; el 🧠 de la planta es la
 * ilusión de control). Tres pasos:
 *   1. Media y volatilidad: doce rentabilidades mensuales de dos fondos con la misma media; eliges la media y cuál es
 *      más volátil (desviación típica).
 *   2. Colas: con la normal, una caída de más de dos desviaciones típicas pasa unos 2–3 meses de cada 100; en los
 *      datos de mercado (simulados con colas gordas) pasa más a menudo.
 *   3. Ilusión de control: 32 becarios lanzan una moneda cinco meses seguidos para «predecir» el mercado; casi
 *      siempre alguno acierta los cinco. ¿Es un genio?
 */

export const MONTHS = 12;
export const TRADERS = 32;
export const CALLS = 5;

export interface LuckSetup {
  seed: number;
  /** Rentabilidades mensuales (%) de los fondos A (tranquilo) y B (volátil), con la misma media. */
  a: number[];
  b: number[];
  /** Meses de 100 con caída de más de 2 desviaciones típicas en los «datos» simulados con colas gordas. */
  fatTailMonths: number;
  /** Becarios (de 32) que aciertan los cinco meses a cara o cruz en esta partida. */
  perfect: number;
}

const r1 = (x: number) => Math.round(x * 10) / 10;
const r2 = (x: number) => Math.round(x * 100) / 100;

export const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
/** Desviación típica muestral (n − 1). */
export const stdev = (xs: number[]) => {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
};

/** Doce meses que suman exactamente `target × 12` y con una dispersión de tamaño `spread`. */
function series(rnd: () => number, target: number, spread: number): number[] {
  const raw = Array.from({ length: MONTHS }, () => r1((rnd() * 2 - 1) * spread));
  const shift = target - mean(raw);
  const xs = raw.map((x) => r1(x + shift));
  // el redondeo puede mover la media una décima: se corrige en el último mes
  xs[MONTHS - 1] = r1(xs[MONTHS - 1]! + (target * MONTHS - xs.reduce((s, x) => s + x, 0)));
  return xs;
}

export function setupLuck(seed: number): LuckSetup {
  const rnd = mulberry32(seed + 7);
  const target = [0.5, 0.6, 0.8][Math.abs(seed) % 3]!;
  const a = series(rnd, target, 1.5);
  const b = series(rnd, target, 6);
  // colas gordas: entre 4 y 6 meses de cada 100, frente a los ~2,3 de la normal (una sola cola)
  const fatTailMonths = 4 + Math.floor(rnd() * 3);
  let perfect = 0;
  for (let t = 0; t < TRADERS; t++) {
    let hits = 0;
    for (let c = 0; c < CALLS; c++) if (rnd() < 0.5) hits++;
    if (hits === CALLS) perfect++;
  }
  // la partida necesita al menos un «genio»: si la moneda no lo da, hay uno (pasa ~64 % de las veces)
  return { seed, a, b, fatTailMonths, perfect: Math.max(1, perfect) };
}

/** Meses de cada 100 con una caída de más de 2 desviaciones típicas si los rendimientos fueran normales. */
export const NORMAL_TAIL = 2.3;
/** Becarios que, de media, aciertan cinco de cinco por puro azar: 32 × (1/2)^5. */
export const EXPECTED_PERFECT = TRADERS * 0.5 ** CALLS;

/** Opciones de media del fondo A: la buena y dos errores típicos (la mediana y la suma). */
export function meanOptions(s: LuckSetup): number[] {
  const sorted = [...s.a].sort((x, y) => x - y);
  const median = r2((sorted[5]! + sorted[6]!) / 2);
  const good = r2(mean(s.a));
  const sum = r2(s.a.reduce((acc, x) => acc + x, 0));
  const opts = [...new Set([good, median, sum])];
  if (opts.length < 3) opts.push(r2(good * 2));
  return opts.slice(0, 3).sort((x, y) => x - y);
}

export interface LuckAnswer {
  mean: number;
  volatile: 'a' | 'b';
  tails: 'normal' | 'more';
  genius: boolean;
}

export interface LuckResult {
  meanHit: boolean;
  volatileHit: boolean;
  tailsHit: boolean;
  geniusHit: boolean;
  score: number;
}

/** Nota: 25 % por acierto (media, volatilidad, colas y no creerse el genio). */
export function luckResult(s: LuckSetup, a: LuckAnswer): LuckResult {
  const meanHit = a.mean === r2(mean(s.a));
  const volatileHit = a.volatile === (stdev(s.b) > stdev(s.a) ? 'b' : 'a');
  const tailsHit = a.tails === 'more';
  const geniusHit = !a.genius;
  return {
    meanHit,
    volatileHit,
    tailsHit,
    geniusHit,
    score: (+meanHit + +volatileHit + +tailsHit + +geniusHit) / 4,
  };
}

/** Cifras de la partida para la explicación y los ejercicios (marcadores {nombre}, en snake_case). */
export function luckValues(s: LuckSetup, a: LuckAnswer): Record<string, number> {
  return {
    mean_a: r2(mean(s.a)),
    mean_b: r2(mean(s.b)),
    sd_a: r2(stdev(s.a)),
    sd_b: r2(stdev(s.b)),
    min_a: Math.min(...s.a),
    min_b: Math.min(...s.b),
    max_b: Math.max(...s.b),
    normal_tail: NORMAL_TAIL,
    fat_tail: s.fatTailMonths,
    traders: TRADERS,
    calls: CALLS,
    perfect: s.perfect,
    expected_perfect: EXPECTED_PERFECT,
    hits:
      +luckResult(s, a).meanHit +
      +luckResult(s, a).volatileHit +
      +luckResult(s, a).tailsHit +
      +luckResult(s, a).geniusHit,
  };
}
