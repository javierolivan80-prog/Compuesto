import { gamesData } from '../../content/games-data';
import { dayKey } from '../days';
import type { AppEvent } from '../events';
import { RATINGS, ratingAtLeast, type Rating } from '../game-kit';
import { normalizeEvents } from '../projections';
import { BELL_MIN_DECK } from './bell';
import { dailySeed, hashSeed, type GameId } from './common';
import { availableHeadlines, NEWS_MIN_POOL } from './news';

/* Catálogo de juegos disponibles, récords y partida del día (JUEGOS.md §6). Proyección pura de los eventos. */

export interface GameInfo {
  id: GameId;
  title: string;
  /** Una línea para la tarjeta del juego. */
  blurb: string;
  levels: string;
}

export const GAME_INFO: readonly GameInfo[] = [
  {
    id: 'campana',
    title: 'Campana de apertura',
    blurb:
      'Tarjetas que caen: verdadero a la derecha, falso a la izquierda, antes de que toquen el suelo.',
    levels: 'Niveles 0–9',
  },
  {
    id: 'presupuesto',
    title: 'Cuadra tu presupuesto',
    blurb: 'Reparte ingresos, gastos y ahorro hasta que la balanza cuadre.',
    levels: 'Nivel 0',
  },
  {
    id: 'mesa-ordenes',
    title: 'Mesa de órdenes',
    blurb: 'Atiende a los clientes eligiendo la orden adecuada para cada petición.',
    levels: 'Nivel 1',
  },
  {
    id: 'sube-o-baja',
    title: '¿Sube o baja?',
    blurb: 'Lee el titular, predice la dirección, elige el motivo y mira la vela formarse.',
    levels: 'Niveles 1–4',
  },
  {
    id: 'impulsivo',
    title: 'El trader impulsivo',
    blurb:
      'Noticias tentadoras y un botón de operar: ¿cuánto te cuesta no aguantarte? Compara con tu gemelo paciente.',
    levels: 'Niveles 1 y 5',
  },
  {
    id: 'magia-compuesto',
    title: 'La magia del compuesto',
    blurb: 'Elige aportación y años: comisiones e inflación se comen el resultado.',
    levels: 'Nivel 0',
  },
];

export const gameInfo = (id: GameId): GameInfo => GAME_INFO.find((g) => g.id === id)!;

/** Conceptos vistos: los de las lecciones completadas y los de las unidades saltadas con el test de salto. */
export function seenConcepts(
  events: readonly AppEvent[],
  lessonConcepts: Readonly<Record<string, readonly string[]>>,
  unitConcepts: Readonly<Record<string, readonly string[]>>,
): Set<string> {
  const seen = new Set<string>();
  for (const e of events) {
    if (e.type === 'lesson_completed')
      for (const c of lessonConcepts[e.payload.lessonId] ?? []) seen.add(c);
    else if (e.type === 'unit_skipped')
      for (const c of unitConcepts[e.payload.unitId] ?? []) seen.add(c);
  }
  return seen;
}

export interface GameContext {
  seen: ReadonlySet<string>;
  /** Afirmaciones verdadero/falso de lecciones ya vistas (para la Campana). */
  tfCount: number;
}

export interface Availability {
  available: boolean;
  /** Conceptos que faltan por ver (para explicar por qué está bloqueado). */
  missing: string[];
}

export function availability(id: GameId, ctx: GameContext): Availability {
  const need = (cs: readonly string[]) => cs.filter((c) => !ctx.seen.has(c));
  switch (id) {
    case 'campana': {
      const ok = ctx.tfCount >= BELL_MIN_DECK;
      return { available: ok, missing: ok ? [] : ['__tf'] };
    }
    case 'presupuesto': {
      const m = need(gamesData.presupuesto.concepts);
      return { available: m.length === 0, missing: m };
    }
    case 'mesa-ordenes': {
      const m = need(gamesData.ordenes.concepts);
      return { available: m.length === 0, missing: m };
    }
    case 'sube-o-baja': {
      const ok = availableHeadlines(ctx.seen).length >= NEWS_MIN_POOL;
      return {
        available: ok,
        missing: ok ? [] : ['formacion-precios', 'liquidez'].filter((c) => !ctx.seen.has(c)),
      };
    }
    case 'impulsivo': {
      const m = need(gamesData.impulsivo.concepts);
      return { available: m.length === 0, missing: m };
    }
    case 'magia-compuesto': {
      const m = need(['interes-compuesto', 'inflacion']);
      return { available: m.length === 0, missing: m };
    }
  }
}

export const availableGames = (ctx: GameContext): GameId[] =>
  GAME_INFO.map((g) => g.id).filter((id) => availability(id, ctx).available);

export interface GameRecord {
  plays: number;
  bestRating: Rating;
  bestScore: number;
  lastPlayedAt: string;
}

const betterRating = (a: Rating, b: Rating) => (ratingAtLeast(a, b) ? a : b);

/** Récord de cada juego (mejor nota y puntuación) y nº de partidas. */
export function gameRecords(events: readonly AppEvent[]): Map<GameId, GameRecord> {
  const out = new Map<GameId, GameRecord>();
  for (const e of normalizeEvents(events)) {
    if (e.type !== 'game_played') continue;
    const p = e.payload;
    const r = out.get(p.gameId);
    out.set(p.gameId, {
      plays: (r?.plays ?? 0) + 1,
      bestRating: r ? betterRating(r.bestRating, p.rating) : p.rating,
      bestScore: Math.max(r?.bestScore ?? 0, p.score),
      lastPlayedAt: e.createdAt,
    });
  }
  return out;
}

/** ¿Esta puntuación supera el récord anterior (o es la primera partida)? */
export function isNewRecord(events: readonly AppEvent[], game: GameId, score: number): boolean {
  const r = gameRecords(events).get(game);
  return !r || score > r.bestScore;
}

/** Mejor resultado de la partida del día (misma semilla) de un juego, si ya se jugó. */
export function dailyBest(
  events: readonly AppEvent[],
  game: GameId,
  day: string,
): { score: number; rating: Rating } | null {
  let best: { score: number; rating: Rating } | null = null;
  const seed = dailySeed(game, day);
  for (const e of events) {
    if (
      e.type !== 'game_played' ||
      e.payload.gameId !== game ||
      !e.payload.daily ||
      e.payload.seed !== seed
    )
      continue;
    if (!best || e.payload.score > best.score)
      best = { score: e.payload.score, rating: e.payload.rating };
  }
  return best;
}

export const gamesPlayedOn = (events: readonly AppEvent[], day: string): number =>
  events.filter((e) => e.type === 'game_played' && dayKey(e.createdAt, e.tz) === day).length;

/** Juego de la sesión de hoy: rota entre los disponibles según el día, saltando el último que se jugó si hay alternativa. */
export function pickDailyGame(
  events: readonly AppEvent[],
  day: string,
  available: readonly GameId[],
): GameId | null {
  if (available.length === 0) return null;
  const last = [...events].reverse().find((e) => e.type === 'game_played');
  const lastId = last && last.type === 'game_played' ? last.payload.gameId : null;
  const pool =
    available.length > 1 && lastId ? available.filter((g) => g !== lastId) : [...available];
  return pool[hashSeed(day) % pool.length]!;
}

export { RATINGS };
