import { describe, expect, it } from 'vitest';
import { makeEvent, type AppEvent, type EventType } from '../events';
import {
  availability,
  availableGames,
  dailyBest,
  gameRecords,
  isNewRecord,
  pickDailyGame,
  seenConcepts,
} from './catalog';
import { dailySeed, type GameId } from './common';

const ev = (type: EventType, payload: object, at: string): AppEvent =>
  makeEvent(type, payload as never, { deviceId: 'test', now: new Date(at) });

const played = (
  game: GameId,
  score: number,
  rating: 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B',
  at: string,
  extra: Partial<{ daily: boolean; seed: number }> = {},
): AppEvent =>
  makeEvent(
    'game_played',
    {
      gameId: game,
      seed: extra.seed ?? 1,
      daily: extra.daily ?? false,
      score,
      rating,
      missedConcepts: [],
      xp: 0,
    },
    { deviceId: 'test', now: new Date(at) },
  );

describe('conceptos vistos y disponibilidad', () => {
  it('suma conceptos de lecciones completadas y de unidades saltadas', () => {
    const log: AppEvent[] = [
      ev('lesson_completed', { lessonId: 'l1', xp: 10, accuracy: 1 }, '2026-10-15T10:00:00Z'),
      ev('unit_skipped', { unitId: 'n1-u4', scorePct: 90 }, '2026-10-15T10:01:00Z'),
      ev('lesson_started', { lessonId: 'l9' }, '2026-10-15T10:02:00Z'),
    ];
    const seen = seenConcepts(
      log,
      { l1: ['presupuesto'], l9: ['x'] },
      { 'n1-u4': ['orden-mercado', 'orden-limitada'] },
    );
    expect([...seen].sort()).toEqual(['orden-limitada', 'orden-mercado', 'presupuesto']);
  });
  it('cada juego se desbloquea con sus conceptos', () => {
    const none = { seen: new Set<string>(), tfCount: 0 };
    expect(availableGames(none)).toEqual([]);
    expect(availability('presupuesto', none).missing).toEqual(['presupuesto']);
    const some = { seen: new Set(['presupuesto', 'interes-compuesto', 'inflacion']), tfCount: 9 };
    expect(availableGames(some).sort()).toEqual(['campana', 'magia-compuesto', 'presupuesto']);
    const all = {
      seen: new Set([
        'presupuesto',
        'interes-compuesto',
        'inflacion',
        'orden-mercado',
        'orden-limitada',
        'formacion-precios',
        'liquidez',
      ]),
      tfCount: 20,
    };
    expect(availableGames(all)).toHaveLength(5); // el trader impulsivo necesita además «comisiones» y «FOMO»
    expect(
      availableGames({ ...all, seen: new Set([...all.seen, 'comisiones', 'fomo-manada']) }),
    ).toHaveLength(6);
  });
  it('la Campana necesita un mínimo de afirmaciones', () => {
    expect(availability('campana', { seen: new Set(), tfCount: 7 }).available).toBe(false);
    expect(availability('campana', { seen: new Set(), tfCount: 8 }).available).toBe(true);
  });
});

describe('récords y partida del día', () => {
  const log = [
    played('campana', 0.5, 'BB', '2026-10-15T10:00:00Z'),
    played('campana', 0.9, 'AA', '2026-10-16T10:00:00Z'),
    played('campana', 0.7, 'A', '2026-10-17T10:00:00Z'),
    played('presupuesto', 0.3, 'B', '2026-10-17T11:00:00Z'),
  ];
  it('guarda la mejor nota, la mejor puntuación y las partidas', () => {
    const r = gameRecords(log).get('campana')!;
    expect(r).toMatchObject({ plays: 3, bestRating: 'AA', bestScore: 0.9 });
    expect(gameRecords(log).get('presupuesto')!.bestRating).toBe('B');
    expect(gameRecords(log).get('mesa-ordenes')).toBeUndefined();
  });
  it('detecta un nuevo récord y la primera partida', () => {
    expect(isNewRecord(log, 'campana', 0.95)).toBe(true);
    expect(isNewRecord(log, 'campana', 0.9)).toBe(false);
    expect(isNewRecord(log, 'mesa-ordenes', 0)).toBe(true);
  });
  it('la partida del día se identifica por la semilla diaria y no mezcla otras partidas', () => {
    const day = '2026-10-17';
    const seed = dailySeed('campana', day);
    const events = [
      played('campana', 0.4, 'B', '2026-10-17T08:00:00Z', { daily: true, seed }),
      played('campana', 0.8, 'A', '2026-10-17T09:00:00Z', { daily: true, seed }),
      played('campana', 1, 'AAA', '2026-10-17T10:00:00Z', { daily: false, seed }),
      played('campana', 1, 'AAA', '2026-10-17T10:30:00Z', { daily: true, seed: seed + 1 }),
    ];
    expect(dailyBest(events, 'campana', day)).toEqual({ score: 0.8, rating: 'A' });
    expect(dailyBest(events, 'presupuesto', day)).toBeNull();
  });
  it('el juego de hoy rota, es estable en el día y evita repetir el último', () => {
    const avail = ['campana', 'presupuesto', 'magia-compuesto'] as const;
    const a = pickDailyGame([], '2026-10-17', avail);
    expect(pickDailyGame([], '2026-10-17', avail)).toBe(a);
    const days = Array.from({ length: 20 }, (_, i) =>
      pickDailyGame([], `2026-10-${String(i + 1).padStart(2, '0')}`, avail),
    );
    expect(new Set(days).size).toBeGreaterThan(1);
    const afterA = pickDailyGame(
      [played(a!, 0.5, 'BB', '2026-10-16T10:00:00Z')],
      '2026-10-17',
      avail,
    );
    expect(afterA).not.toBe(a);
    expect(pickDailyGame([], '2026-10-17', [])).toBeNull();
    expect(
      pickDailyGame([played('campana', 0.5, 'BB', '2026-10-16T10:00:00Z')], '2026-10-17', [
        'campana',
      ]),
    ).toBe('campana');
  });
});
