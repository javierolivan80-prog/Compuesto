import { afterEach, describe, expect, it } from 'vitest';
import { ev } from '../../tests/helpers';
import { projectAll } from '../engine/projections';
import { personalStats, statsToCsv } from '../engine/stats';
import { ERROR_LOG_KEY, MAX_ENTRIES, clearErrors, getErrors, logError } from './error-log';
import { buildIcs, escapeText, isValidTime } from './ics';

afterEach(() => localStorage.clear());

describe('recordatorio .ics', () => {
  const base = {
    time: '19:30',
    minutes: 20,
    startDay: '2026-10-16',
    uid: 'abc',
    now: new Date('2026-10-15T08:00:00Z'),
  };
  it('genera un evento diario recurrente con hora flotante, duración y alarma', () => {
    const ics = buildIcs(base);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('DTSTART:20261016T193000'); // sin Z: hora local del dispositivo
    expect(ics).toContain('DURATION:PT20M');
    expect(ics).toContain('RRULE:FREQ=DAILY');
    expect(ics).toContain('DTSTAMP:20261015T080000Z');
    expect(ics).toContain('BEGIN:VALARM');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.split('\r\n').every((l) => l.length <= 75)).toBe(true); // RFC 5545: líneas ≤ 75 octetos
  });
  it('escapa texto y valida entradas', () => {
    // RFC 5545: ; , \ y saltos de línea se escapan en los valores de texto
    expect(escapeText('a;b,c\\d\ne')).toBe('a\\;b\\,c\\\\d\\ne');

    expect(buildIcs(base)).toContain('SUMMARY:Abrir mercado · Compuesto');
    expect(isValidTime('07:05')).toBe(true);
    for (const t of ['7:05', '24:00', '19:60', '', 'ab']) expect(isValidTime(t)).toBe(false);
    expect(() => buildIcs({ ...base, time: '25:00' })).toThrow(RangeError);
    expect(() => buildIcs({ ...base, startDay: '16/10/2026' })).toThrow(RangeError);
    expect(() => buildIcs({ ...base, minutes: 0 })).toThrow(RangeError);
  });
});

describe('registro de errores', () => {
  it('guarda mensaje y pila, y lo borra', () => {
    logError('error', new Error('algo falló'), new Date('2026-10-15T10:00:00Z'));
    const [e] = getErrors();
    expect(e).toMatchObject({
      source: 'error',
      message: 'algo falló',
      at: '2026-10-15T10:00:00.000Z',
    });
    expect(e!.stack).toContain('Error');
    clearErrors();
    expect(getErrors()).toEqual([]);
  });
  it('mantiene solo los últimos 200', () => {
    for (let i = 0; i < MAX_ENTRIES + 25; i++) logError('console', `e${i}`);
    const all = getErrors();
    expect(all).toHaveLength(MAX_ENTRIES);
    expect(all[0]!.message).toBe('e25');
    expect(all.at(-1)!.message).toBe(`e${MAX_ENTRIES + 24}`);
  });
  it('tolera un almacenamiento corrupto', () => {
    localStorage.setItem(ERROR_LOG_KEY, '{no json');
    expect(getErrors()).toEqual([]);
    logError('promesa', 'x');
    expect(getErrors()).toHaveLength(1);
  });
});

describe('estadísticas personales', () => {
  const answered = (iso: string, id: string, correct: boolean, xp = 10) =>
    ev(
      'exercise_answered',
      {
        exerciseId: id,
        lessonId: 'l1',
        conceptIds: [],
        correct,
        timeMs: 1000,
        xp: correct ? xp : 0,
      },
      iso,
    );
  const events = [
    ev('lesson_started', { lessonId: 'l1' }, '2026-10-10T09:00:00Z'),
    answered('2026-10-10T09:01:00Z', 'e1', true),
    answered('2026-10-10T09:02:00Z', 'e2', false),
    answered('2026-10-12T09:01:00Z', 'e2', false),
    answered('2026-10-12T09:02:00Z', 'e1', true),
    ev('lesson_completed', { lessonId: 'l1', xp: 20, accuracy: 0.5 }, '2026-10-12T09:03:00Z'),
    ev('lesson_started', { lessonId: 'l2' }, '2026-10-14T09:00:00Z'),
  ];
  const today = '2026-10-15';
  const stats = personalStats(events, projectAll(events, today), today);

  it('calcula racha, días activos, precisión y lecciones', () => {
    expect(stats).toMatchObject({
      totalXp: 40,
      activeDays: 2,
      activeDaysLast7: 2,
      lessonsCompleted: 1,
      abandonedLessons: 1,
      exercisesAnswered: 4,
    });
    expect(stats.accuracy).toBe(0.5);
    expect(stats.streak).toBe(0); // 10 y 12 con hueco el 11, sin congelador y hoy y el 13-14 sin actividad
  });
  it('lista los ejercicios más fallados para revisar el contenido', () => {
    expect(stats.mostFailed).toEqual([{ exerciseId: 'e2', fails: 2, attempts: 2 }]);
  });
  it('sin datos no inventa nada', () => {
    const s = personalStats([], projectAll([], today), today);
    expect(s).toMatchObject({ accuracy: null, activeDays: 0, mostFailed: [] });
  });
  it('exporta CSV con resumen y días', () => {
    const csv = statsToCsv(stats, projectAll(events, today).xp.byDay);
    expect(csv).toContain('xp_total,40');
    expect(csv).toContain('precision,0.5000');
    expect(csv).toContain('2026-10-10,10');
    expect(csv.endsWith('\n')).toBe(true);
  });
});
