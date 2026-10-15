import { describe, expect, it } from 'vitest';
import { ev, xpAt } from '../../tests/helpers';
import { addDays, dayKey, daysBetween } from './days';
import { parseEvent } from './events';
import {
  projectAll,
  projectProgress,
  projectRank,
  projectSettings,
  projectStreak,
  projectXp,
} from './projections';

const streakAt = (events: ReturnType<typeof xpAt>[], today: string) =>
  projectStreak(projectXp(events), today);

describe('días en Europe/Madrid', () => {
  it('cambio de día a medianoche de Madrid (invierno, UTC+1)', () => {
    expect(dayKey('2026-01-15T22:59:59Z')).toBe('2026-01-15');
    expect(dayKey('2026-01-15T23:00:00Z')).toBe('2026-01-16');
  });
  it('cambio de día a medianoche de Madrid (verano, UTC+2)', () => {
    expect(dayKey('2026-07-15T21:59:59Z')).toBe('2026-07-15');
    expect(dayKey('2026-07-15T22:00:00Z')).toBe('2026-07-16');
  });
  it('cambio de hora de marzo (23 h): 28→29→30 son tres días consecutivos', () => {
    // 29/03/2026 a las 02:00 los relojes saltan a las 03:00 (día de 23 h)
    expect(dayKey('2026-03-28T23:30:00Z')).toBe('2026-03-29'); // 00:30 CET
    expect(dayKey('2026-03-29T21:59:00Z')).toBe('2026-03-29'); // 23:59 CEST
    expect(dayKey('2026-03-29T22:00:00Z')).toBe('2026-03-30'); // 00:00 CEST
    const s = streakAt(
      [xpAt('2026-03-28T12:00:00Z'), xpAt('2026-03-29T12:00:00Z'), xpAt('2026-03-30T12:00:00Z')],
      '2026-03-30',
    );
    expect(s.current).toBe(3);
  });
  it('cambio de hora de octubre (25 h): el 25 es un solo día', () => {
    expect(dayKey('2026-10-24T22:00:00Z')).toBe('2026-10-25'); // 00:00 CEST
    expect(dayKey('2026-10-25T22:59:00Z')).toBe('2026-10-25'); // 23:59 CET
    expect(dayKey('2026-10-25T23:00:00Z')).toBe('2026-10-26'); // 00:00 CET
    // dos eventos con 24 h de diferencia caen en el MISMO día del 25 (día de 25 h): racha 1, no 2
    expect(
      streakAt([xpAt('2026-10-24T22:30:00Z'), xpAt('2026-10-25T22:30:00Z')], '2026-10-25').current,
    ).toBe(1);
    expect(
      streakAt([xpAt('2026-10-24T22:30:00Z'), xpAt('2026-10-25T23:30:00Z')], '2026-10-26').current,
    ).toBe(2);
  });
  it('aritmética de días inmune al cambio de hora', () => {
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26');
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('un evento de otra zona cuenta en el día de SU zona', () => {
    // 01:00 UTC del 2 de enero = 20:00 del 1 de enero en Nueva York
    expect(projectXp([xpAt('2026-01-02T01:00:00Z', 10, 'America/New_York')]).byDay).toEqual({
      '2026-01-01': 10,
    });
  });
});

describe('racha', () => {
  const days = (...d: string[]) => d.map((x) => xpAt(`${x}T12:00:00Z`));

  it('sin eventos: 0 y sin riesgo', () => {
    expect(streakAt([], '2026-01-10')).toMatchObject({ current: 0, longest: 0, atRisk: false });
  });
  it('días consecutivos suman; hoy sin actividad la mantiene en riesgo', () => {
    const s = streakAt(days('2026-01-08', '2026-01-09'), '2026-01-10');
    expect(s).toMatchObject({ current: 2, atRisk: true, lastActiveDay: '2026-01-09' });
  });
  it('un día perdido sin congelador la rompe', () => {
    const s = streakAt(days('2026-01-05', '2026-01-06', '2026-01-08'), '2026-01-08');
    expect(s.current).toBe(1);
    expect(s.longest).toBe(2);
  });
  it('hoy sin actividad no rompe la racha todavía', () => {
    expect(streakAt(days('2026-01-05', '2026-01-06'), '2026-01-07').current).toBe(2);
    // pero al terminar mañana sin jugar, sí
    expect(streakAt(days('2026-01-05', '2026-01-06'), '2026-01-08').current).toBe(0);
  });
  it('7 días ganan un congelador, que salva un día perdido', () => {
    const week = ['01', '02', '03', '04', '05', '06', '07'].map((d) => `2026-02-${d}`);
    const s = streakAt([...days(...week), ...days('2026-02-09')], '2026-02-09');
    expect(s.frozenDays).toEqual(['2026-02-08']);
    expect(s.current).toBe(8); // el día congelado no suma, pero no rompe
    expect(s.freezes).toBe(0);
  });
  it('máximo 2 congeladores acumulados', () => {
    const many = Array.from({ length: 21 }, (_, i) => addDays('2026-03-01', i));
    expect(streakAt(days(...many), '2026-03-21').freezes).toBe(2);
  });
  it('dos días perdidos con un solo congelador rompen la racha', () => {
    const week = Array.from({ length: 7 }, (_, i) => addDays('2026-04-01', i));
    const s = streakAt([...days(...week), ...days('2026-04-10')], '2026-04-10');
    expect(s.current).toBe(1);
    expect(s.frozenDays).toEqual(['2026-04-08']);
  });
  it('sin XP (respuestas fallidas) no hay día activo', () => {
    const e = [xpAt('2026-01-05T12:00:00Z', 0)];
    expect(streakAt(e, '2026-01-05').current).toBe(0);
  });
});

describe('idempotencia y orden', () => {
  const a = xpAt('2026-01-05T10:00:00Z', 10);
  const b = xpAt('2026-01-05T11:00:00Z', 20);
  const c = xpAt('2026-01-06T09:00:00Z', 5);

  it('eventos duplicados no cuentan dos veces', () => {
    expect(projectXp([a, a, b, b, a]).total).toBe(30);
    expect(projectAll([a, b, a], '2026-01-05')).toEqual(projectAll([a, b], '2026-01-05'));
  });
  it('el orden de llegada no cambia el resultado', () => {
    const forward = projectAll([a, b, c], '2026-01-06');
    expect(projectAll([c, b, a], '2026-01-06')).toEqual(forward);
    expect(projectAll([b, c, a], '2026-01-06')).toEqual(forward);
  });
  it('ajustes: gana el más reciente aunque llegue antes en el array', () => {
    const old = ev('settings_changed', { key: 'dailyGoalXp', value: 40 }, '2026-01-01T10:00:00Z');
    const recent = ev(
      'settings_changed',
      { key: 'dailyGoalXp', value: 80 },
      '2026-01-02T10:00:00Z',
    );
    expect(projectSettings([recent, old])).toEqual({ dailyGoalXp: 80 });
  });
});

describe('progreso, rango y objetivo diario', () => {
  const lesson = (iso: string, accuracy: number) =>
    ev(
      'lesson_completed',
      { lessonId: 'n1-u1-l1', unitId: 'n1-u1', level: 1, xp: 30, accuracy },
      iso,
    );

  it('progreso por lección: intentos, mejor precisión y estado', () => {
    const p = projectProgress([
      ev(
        'lesson_started',
        { lessonId: 'n1-u1-l1', unitId: 'n1-u1', level: 1 },
        '2026-01-05T10:00:00Z',
      ),
      xpAt('2026-01-05T10:01:00Z'),
      ev('lesson_started', { lessonId: 'n1-u1-l1' }, '2026-01-05T12:00:00Z'),
      lesson('2026-01-05T12:05:00Z', 0.7),
      lesson('2026-01-06T12:05:00Z', 0.9),
      ev('unit_skipped', { unitId: 'n0-u3', scorePct: 92 }, '2026-01-07T10:00:00Z'),
    ]);
    expect(p.lessons['n1-u1-l1']).toMatchObject({
      status: 'completed',
      attempts: 2,
      completions: 2,
      bestAccuracy: 0.9,
      level: 1,
    });
    expect(p.skippedUnits).toEqual(['n0-u3']);
  });
  it('rango por XP y planta por nivel completado', () => {
    const progress = projectProgress([lesson('2026-01-05T12:00:00Z', 1)]);
    expect(projectRank(0, progress)).toMatchObject({
      rank: 'Becario',
      nextRank: 'Analista Junior',
      xpToNext: 500,
      floor: 1,
    });
    expect(projectRank(500, progress).rank).toBe('Analista Junior');
    expect(projectRank(499, progress).rank).toBe('Becario');
    expect(projectRank(99999, progress)).toMatchObject({
      rank: 'Leyenda',
      nextRank: null,
      xpToNext: null,
    });
  });
  it('objetivo diario: usa el ajuste o 60 XP por defecto y mide solo hoy', () => {
    const events = [xpAt('2026-01-05T10:00:00Z', 50), xpAt('2026-01-06T10:00:00Z', 30)];
    expect(projectAll(events, '2026-01-06').dailyGoal).toEqual({
      day: '2026-01-06',
      xp: 30,
      goal: 60,
      reached: false,
    });
    const withGoal = [
      ...events,
      ev('settings_changed', { key: 'dailyGoalXp', value: 30 }, '2026-01-06T09:00:00Z'),
    ];
    expect(projectAll(withGoal, '2026-01-06').dailyGoal.reached).toBe(true);
  });
});

describe('validación de eventos (Zod)', () => {
  const ok = xpAt('2026-01-05T10:00:00Z');
  it('acepta un evento válido y rechaza tipos desconocidos', () => {
    expect(parseEvent(ok)).toEqual(ok);
    expect(() => parseEvent({ ...ok, type: 'otro' })).toThrow();
  });
  it('rechaza cargas útiles inválidas, fechas y zonas incorrectas', () => {
    expect(() => parseEvent({ ...ok, payload: { ...ok.payload, xp: -5 } })).toThrow();
    expect(() => parseEvent({ ...ok, createdAt: 'ayer' })).toThrow();
    expect(() => parseEvent({ ...ok, tz: 'Marte/Olympus' })).toThrow();
    expect(() => parseEvent({ ...ok, id: 'no-uuid' })).toThrow();
    expect(() => parseEvent({ ...ok, schemaVersion: 2 })).toThrow();
  });
});
