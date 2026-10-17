import { describe, expect, it } from 'vitest';
import {
  closeWeek,
  DIVISIONS,
  leagueFromEvents,
  PROMOTE,
  RIVALS,
  rivalWeek,
  standingsFor,
  weeklyAverage,
  xpByWeek,
} from './rivals';
import type { AppEvent } from './events';

const ev = (day: string, xp: number, i = 0): AppEvent =>
  ({
    id: `e${day}${i}`,
    type: 'lesson_completed',
    createdAt: `${day}T10:00:00.000Z`,
    deviceId: 'd',
    schemaVersion: 1,
    tz: 'Europe/Madrid',
    payload: { lessonId: 'l', unitId: 'n0-u1', level: 0, xp, accuracy: 1 },
  }) as AppEvent;

describe('rivales simulados: determinismo', () => {
  it('misma semilla → mismo reparto; otra semana → otro', () => {
    const a = rivalWeek(RIVALS[0]!, '2026-10-12', 0, 300);
    expect(rivalWeek(RIVALS[0]!, '2026-10-12', 0, 300)).toEqual(a);
    expect(rivalWeek(RIVALS[0]!, '2026-10-19', 0, 300)).not.toEqual(a);
    expect(a).toHaveLength(7);
    expect(a.every((x) => Number.isInteger(x) && x >= 0)).toBe(true);
  });

  it('valores fijados (misma liga en cualquier dispositivo)', () => {
    const w = RIVALS.map((r) => rivalWeek(r, '2026-10-12', 0, 300).reduce((x, y) => x + y, 0));
    expect(w).toMatchInlineSnapshot(`
      [
        276,
        361,
        321,
        420,
        235,
        237,
        308,
        173,
      ]
    `);
  });

  it('el ritmo sigue a tu media y sube con la división', () => {
    const tot = (avg: number, d: number) =>
      rivalWeek(RIVALS[2]!, '2026-10-12', d, avg).reduce((x, y) => x + y, 0);
    expect(tot(600, 0)).toBeGreaterThan(tot(300, 0) * 1.8);
    expect(tot(300, 4)).toBeGreaterThan(tot(300, 0));
  });
});

describe('media semanal', () => {
  it('sin historial usa el valor por defecto; con él, la media con suelo', () => {
    expect(weeklyAverage({}, '2026-10-12', null)).toBe(300);
    expect(
      weeklyAverage({ '2026-10-05': 500, '2026-09-28': 300 }, '2026-10-12', '2026-09-28'),
    ).toBe(400);
    expect(weeklyAverage({ '2026-10-05': 10 }, '2026-10-12', '2026-10-05')).toBe(150);
  });
});

describe('clasificación y zonas', () => {
  it('ordena, marca ascenso/descenso y respeta los extremos', () => {
    const r = RIVALS.map((rival, i) => ({ rival, xp: 100 + i * 10 }));
    const mid = standingsFor(500, r, 2);
    expect(mid[0]!.me).toBe(true);
    expect(mid.slice(0, PROMOTE).every((x) => x.zone === 'promote')).toBe(true);
    expect(mid.slice(-3).every((x) => x.zone === 'relegate')).toBe(true);
    const bronze = standingsFor(0, r, 0);
    expect(bronze.some((x) => x.zone === 'relegate')).toBe(false);
    const top = standingsFor(500, r, DIVISIONS.length - 1);
    expect(top.some((x) => x.zone === 'promote')).toBe(false);
  });

  it('sin XP nunca se asciende', () => {
    const r = RIVALS.map((rival) => ({ rival, xp: 0 }));
    expect(standingsFor(0, r, 1).find((x) => x.me)!.zone).not.toBe('promote');
  });
});

/** Estadística del equilibrio: con tu ritmo normal ni es imposible ni es trivial ganar. */
describe('equilibrio de la liga', () => {
  const outcomes = (mult: number, division: number) => {
    let promoted = 0;
    let relegated = 0;
    let top = 0;
    const N = 400;
    for (let i = 0; i < N; i++) {
      const week = new Date(Date.UTC(2026, 0, 5) + i * 7 * 86_400_000).toISOString().slice(0, 10);
      const avg = 300;
      const noise = 0.85 + ((i * 37) % 31) / 100; // ±15 % determinista
      const o = closeWeek(week, division, Math.round(avg * mult * noise), avg);
      if (o.result === 'promoted') promoted++;
      if (o.result === 'relegated') relegated++;
      if (o.myRank === 1) top++;
    }
    return { promoted: promoted / N, relegated: relegated / N, top: top / N };
  };

  it.each([0, 2])('en la división %i, a tu ritmo normal no es trivial ni imposible', (d) => {
    const normal = outcomes(1, d);
    expect(normal.top).toBeLessThan(0.15); // ganar a ritmo normal no es trivial
    expect(normal.promoted).toBeLessThan(0.5);
    expect(normal.promoted).toBeGreaterThan(0.05); // pero posible
  });

  it.each([0, 2, 3])('en la división %i, un 40 % más de esfuerzo asciende casi siempre', (d) => {
    expect(outcomes(1.4, d).promoted).toBeGreaterThan(0.75);
  });

  it.each([1, 3])('en la división %i, la mitad de ritmo baja casi siempre', (d) => {
    expect(outcomes(0.5, d).relegated).toBeGreaterThan(0.75);
  });

  it('ganar la semana (1.º) con el doble de ritmo es siempre posible', () => {
    expect(outcomes(2, 4).top).toBeGreaterThan(0.9);
  });
});

describe('liga a partir de eventos', () => {
  it('sin XP no hay liga inventada', () => {
    const l = leagueFromEvents([], '2026-10-14');
    expect(l.started).toBe(false);
    expect(l.history).toEqual([]);
    expect(l.lastClose).toBeNull();
    expect(l.vsLastWeek).toBeNull();
  });

  it('semana en curso: día y XP propios; rivales acumulan hasta hoy', () => {
    // miércoles 14-10-2026 → semana del lunes 12
    const l = leagueFromEvents([ev('2026-10-12', 40), ev('2026-10-14', 30)], '2026-10-14');
    expect(l.week).toBe('2026-10-12');
    expect(l.dayIndex).toBe(3);
    expect(l.myXp).toBe(70);
    expect(l.standings).toHaveLength(RIVALS.length + 1);
    expect(l.division).toBe(0);
  });

  it('cierre semanal: el lunes se cierra la semana anterior y cambia la división', () => {
    const events = [
      ev('2026-10-05', 90, 1),
      ev('2026-10-06', 90, 2),
      ev('2026-10-07', 90, 3),
      ev('2026-10-08', 90, 4),
      ev('2026-10-09', 90, 5),
      ev('2026-10-10', 90, 6),
      ev('2026-10-11', 90, 7),
    ];
    const before = leagueFromEvents(events, '2026-10-11');
    expect(before.history).toHaveLength(0); // aún en la semana
    const monday = leagueFromEvents(events, '2026-10-12');
    expect(monday.history).toHaveLength(1);
    expect(monday.lastClose!.week).toBe('2026-10-05');
    expect(monday.lastClose!.myXp).toBe(630);
    expect(monday.lastClose!.myRank).toBe(1);
    expect(monday.lastClose!.result).toBe('promoted');
    expect(monday.division).toBe(1);
    expect(monday.lastCloseMidweek).not.toBeNull();
  });

  it('una semana sin estudiar tras empezar cuenta como última y baja de división', () => {
    const events = [ev('2026-09-28', 400), ev('2026-09-29', 400), ev('2026-10-05', 400)];
    const l = leagueFromEvents(events, '2026-10-19'); // semana del 12 vacía y cerrada
    const w12 = l.history.find((h) => h.week === '2026-10-12')!;
    expect(w12.myXp).toBe(0);
    expect(w12.result === 'relegated' || w12.division === 0).toBe(true);
  });

  it('tu yo de la semana pasada: mismo día acumulado', () => {
    const l = leagueFromEvents(
      [ev('2026-10-05', 50), ev('2026-10-06', 50), ev('2026-10-12', 80)],
      '2026-10-13',
    );
    expect(l.vsLastWeek).toEqual({ now: 80, before: 100, delta: -20 });
  });

  it('es una proyección pura: mismos eventos → misma liga', () => {
    const e = [ev('2026-09-21', 200), ev('2026-09-28', 250), ev('2026-10-05', 300)];
    expect(leagueFromEvents(e, '2026-10-15')).toEqual(
      leagueFromEvents([...e].reverse(), '2026-10-15'),
    );
  });

  it('xpByWeek agrupa por lunes', () => {
    expect(xpByWeek({ '2026-10-11': 5, '2026-10-12': 7, '2026-10-18': 3 })).toEqual({
      '2026-10-05': 5,
      '2026-10-12': 10,
    });
  });
});
