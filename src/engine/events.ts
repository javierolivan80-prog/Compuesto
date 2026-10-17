import { z } from 'zod';

export const SCHEMA_VERSION = 1;
export const DEFAULT_TZ = 'Europe/Madrid';

const isoDate = z.string().refine((s) => !Number.isNaN(Date.parse(s)) && s.includes('T'), {
  message: 'createdAt debe ser una fecha ISO 8601 con hora',
});

const timeZone = z.string().refine(
  (tz) => {
    try {
      new Intl.DateTimeFormat('en', { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  },
  { message: 'tz debe ser una zona horaria IANA válida' },
);

const id = z.string().min(1);
const xp = z.number().int().min(0).max(10_000);

/** Bloques de una sesión "Abrir mercado" (CLAUDE.md §7, §8b). El minijuego se sustituye por `review` hasta que haya juegos (2.5). */
export const blockSpec = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('briefing') }),
  z.object({ kind: z.literal('due'), cards: z.number().int().min(1).max(15) }),
  z.object({ kind: z.literal('lesson'), lessonId: id }),
  z.object({
    kind: z.literal('game'),
    gameId: z.enum([
      'campana',
      'presupuesto',
      'mesa-ordenes',
      'sube-o-baja',
      'magia-compuesto',
      'impulsivo',
    ]),
  }),
  z.object({ kind: z.literal('review'), exercises: z.number().int().min(1).max(15) }),
  z.object({
    kind: z.literal('reto'),
    exercises: z.number().int().min(1).max(15),
    /** Encargo del jefe: una vez por semana. */
    weekly: z.boolean(),
  }),
  z.object({ kind: z.literal('cierre') }),
]);
export type BlockSpec = z.infer<typeof blockSpec>;

/** Carga útil de cada tipo de evento (CLAUDE.md §3b). */
export const payloads = {
  lesson_started: z.object({
    lessonId: id,
    unitId: id.optional(),
    level: z.number().int().min(0).max(10).optional(),
  }),
  exercise_answered: z.object({
    exerciseId: id,
    lessonId: id,
    conceptIds: z.array(id).default([]),
    correct: z.boolean(),
    timeMs: z.number().int().min(0).max(3_600_000),
    xp,
    /** 'review' = repaso, práctica o examen: siempre cuenta como un intento nuevo para el repaso espaciado. */
    source: z.enum(['lesson', 'review']).default('lesson'),
    /** Ejercicios paramétricos (tarea 2.9): cifras de la variante contestada. Ausente en los demás. */
    params: z.record(z.string(), z.number()).optional(),
  }),
  lesson_completed: z.object({
    lessonId: id,
    unitId: id.optional(),
    level: z.number().int().min(0).max(10).optional(),
    xp,
    /** 0–1 */
    accuracy: z.number().min(0).max(1),
  }),
  unit_skipped: z.object({
    unitId: id,
    level: z.number().int().min(0).max(10).optional(),
    scorePct: z.number().min(0).max(100),
  }),
  /** Estadística personal: la persona manipuló un explicador (ANIMACIONES §2). */
  explainer_interacted: z.object({ explainerId: id, lessonId: id.optional() }),
  settings_changed: z.object({
    key: id,
    value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  }),
  session_started: z.object({
    sessionId: id,
    /** Día (clave en la zona del dispositivo) en que se abre la sesión. */
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    minutes: z.number().int().min(1).max(60),
    blocks: z.array(blockSpec).min(1).max(12),
  }),
  session_block_completed: z.object({ sessionId: id, index: z.number().int().min(0).max(11) }),
  session_completed: z.object({ sessionId: id }),
  /** Una partida de un minijuego terminada (JUEGOS.md): puntuación 0–1 corregida por azar y nota AAA–B. */
  game_played: z.object({
    gameId: z.enum([
      'campana',
      'presupuesto',
      'mesa-ordenes',
      'sube-o-baja',
      'magia-compuesto',
      'impulsivo',
    ]),
    seed: z.number().int().min(0),
    /** ¿Era la partida del día (semilla diaria, para comparar récords)? */
    daily: z.boolean(),
    score: z.number().min(0).max(1),
    rating: z.enum(['AAA', 'AA', 'A', 'BBB', 'BB', 'B']),
    missedConcepts: z.array(id).default([]),
    xp,
  }),
  /** La Mesa (docs/specs/la-mesa.md): orden a mercado en el día abierto. */
  mesa_order: z.object({
    day: z.number().int().min(0),
    stockId: id,
    side: z.enum(['buy', 'sell']),
    qty: z.number().int().min(1),
    price: z.number().positive(),
    fee: z.number().min(0),
  }),
  /** La Mesa: cierre de un día de mercado. */
  mesa_day_closed: z.object({
    day: z.number().int().min(0),
    xp,
  }),
} as const;

export type EventType = keyof typeof payloads;
export const EVENT_TYPES = Object.keys(payloads) as EventType[];

const base = {
  id: z.string().uuid(),
  createdAt: isoDate,
  deviceId: id,
  schemaVersion: z.literal(SCHEMA_VERSION),
  /** Zona horaria del dispositivo al registrar el evento: los días se cuentan en ella. */
  tz: timeZone.default(DEFAULT_TZ),
};

const ev = <T extends EventType>(type: T) =>
  z.object({ ...base, type: z.literal(type), payload: payloads[type] });

export const eventSchema = z.discriminatedUnion('type', [
  ev('lesson_started'),
  ev('exercise_answered'),
  ev('lesson_completed'),
  ev('unit_skipped'),
  ev('explainer_interacted'),
  ev('settings_changed'),
  ev('session_started'),
  ev('session_block_completed'),
  ev('session_completed'),
  ev('game_played'),
  ev('mesa_order'),
  ev('mesa_day_closed'),
]);

type Base = { id: string; createdAt: string; deviceId: string; schemaVersion: 1; tz: string };
export type AppEvent = {
  [T in EventType]: Base & { type: T; payload: z.infer<(typeof payloads)[T]> };
}[EventType];

export function parseEvent(input: unknown): AppEvent {
  return eventSchema.parse(input) as AppEvent;
}

/** Crea un evento válido (id, fecha y zona rellenados si no se dan). */
export function makeEvent<T extends EventType>(
  type: T,
  payload: z.input<(typeof payloads)[T]>,
  ctx: { deviceId: string; now?: Date; tz?: string; id?: string },
): AppEvent {
  return parseEvent({
    id: ctx.id ?? crypto.randomUUID(),
    type,
    payload,
    createdAt: (ctx.now ?? new Date()).toISOString(),
    deviceId: ctx.deviceId,
    schemaVersion: SCHEMA_VERSION,
    tz: ctx.tz ?? DEFAULT_TZ,
  });
}
