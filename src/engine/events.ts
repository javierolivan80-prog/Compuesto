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
