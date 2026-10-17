import { gamesData } from '../../content/games-data';
import { marketPath } from '../market';
import { mulberry32 } from '../prng';
import { makeResult, type GameResult } from './common';

/* El trader impulsivo (juego 11): noticias tentadoras, un botón de operar y un «gemelo paciente» que no tocó nada.
   Cada operación cuesta; las noticias son ruido. La nota mide lo que tu impulsividad te costó. */

export const IMPULSIVE_STEPS = 30;
export const START_VALUE = 10_000;
/** Comisión + horquilla por operación, en % del valor que se mueve. */
export const COST_RATE = 0.01;
/** Con este coste acumulado (en % del capital inicial) la puntuación llega a 0. */
export const COST_FOR_ZERO = 0.1;

export interface ImpulsiveNews {
  kind: 'hype' | 'panic';
  text: string;
}

export interface ImpulsiveMarket {
  /** IMPULSIVE_STEPS + 1 precios. */
  prices: number[];
  news: ImpulsiveNews[];
}

export function impulsiveMarket(seed: number): ImpulsiveMarket {
  const path = marketPath({ seed, steps: IMPULSIVE_STEPS, switchProb: 0.1, jumpProb: 0.04 });
  const rnd = mulberry32(seed ^ 0x9e3779b9);
  const { hype, panic, companies } = gamesData.impulsivo;
  const co = companies[Math.floor(rnd() * companies.length)]!;
  const news = Array.from({ length: IMPULSIVE_STEPS }, (_, i): ImpulsiveNews => {
    // la noticia sigue al último movimiento (tienta a perseguir el precio), con algo de aleatoriedad
    const prev = i === 0 ? 0 : path.prices[i]! - path.prices[i - 1]!;
    const hyped = rnd() < (prev >= 0 ? 0.75 : 0.25);
    const pool = hyped ? hype : panic;
    return {
      kind: hyped ? 'hype' : 'panic',
      text: pool[Math.floor(rnd() * pool.length)]!.replace('{co}', co),
    };
  });
  return { prices: path.prices, news };
}

export interface Simulation {
  /** Valor de tu cartera tras cada paso (IMPULSIVE_STEPS + 1). */
  mine: number[];
  /** Valor del gemelo paciente, que compró y no tocó nada. */
  twin: number[];
  /** Posición tras cada paso (true = invertido). */
  invested: boolean[];
  operations: number;
  /** Costes acumulados en euros virtuales. */
  costs: number;
  finalMine: number;
  finalTwin: number;
}

/**
 * `decisions[i]` = operar justo antes del paso i (cambia de invertido a efectivo o al revés, pagando el coste).
 * Se empieza invertido, igual que el gemelo. En efectivo el valor no cambia.
 */
export function simulate(m: ImpulsiveMarket, decisions: readonly boolean[]): Simulation {
  let value = START_VALUE;
  let invested = true;
  let operations = 0;
  let costs = 0;
  const mine = [value];
  const twin = [START_VALUE];
  const pos = [true];
  for (let i = 0; i < IMPULSIVE_STEPS; i++) {
    if (decisions[i]) {
      const c = value * COST_RATE;
      value -= c;
      costs += c;
      operations++;
      invested = !invested;
    }
    const r = m.prices[i + 1]! / m.prices[i]!;
    if (invested) value *= r;
    mine.push(value);
    twin.push(twin[i]! * r);
    pos.push(invested);
  }
  return {
    mine,
    twin,
    invested: pos,
    operations,
    costs,
    finalMine: value,
    finalTwin: twin.at(-1)!,
  };
}

/** Puntuación 0–1: 1 sin operar; baja con el coste acumulado respecto al capital inicial. */
export const impulsiveScore = (costs: number): number =>
  Math.min(1, Math.max(0, 1 - costs / START_VALUE / COST_FOR_ZERO));

export function playImpulsive(seed: number, decisions: readonly boolean[]): GameResult {
  const sim = simulate(impulsiveMarket(seed), decisions);
  const score = impulsiveScore(sim.costs);
  const gap = sim.finalTwin - sim.finalMine;
  const missed = sim.operations > 3 ? ['comisiones', 'fomo-manada'] : [];
  return makeResult(
    'impulsivo',
    seed,
    { got: score, chance: 0, max: 1 },
    missed,
    gamesData.impulsivo.learned,
    sim.operations === 0
      ? 'No operaste ni una vez: igual que tu gemelo paciente.'
      : `${sim.operations} operaciones te costaron ${Math.round(sim.costs).toLocaleString('es-ES')} € virtuales; tu gemelo paciente acabó ${gap >= 0 ? `${Math.round(gap).toLocaleString('es-ES')} € por encima` : `${Math.round(-gap).toLocaleString('es-ES')} € por debajo`} de ti.`,
  );
}
