import { makeEvent, type AppEvent, type EventType } from '../src/engine/events';
import type { z } from 'zod';
import type { payloads } from '../src/engine/events';

let n = 0;
/** Ids deterministas para los tests. */
export function uuid(i: number): string {
  return `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`;
}

export function ev<T extends EventType>(
  type: T,
  payload: z.input<(typeof payloads)[T]>,
  iso: string,
  opts: { tz?: string; id?: string; deviceId?: string } = {},
): AppEvent {
  return makeEvent(type, payload, {
    deviceId: opts.deviceId ?? 'dev-A',
    now: new Date(iso),
    tz: opts.tz,
    id: opts.id ?? uuid(++n),
  });
}

/** Evento que da XP en un instante concreto. */
export const xpAt = (iso: string, xp = 10, tz?: string) =>
  ev(
    'exercise_answered',
    { exerciseId: 'ex1', lessonId: 'l1', conceptIds: [], correct: true, timeMs: 1000, xp },
    iso,
    { tz },
  );
