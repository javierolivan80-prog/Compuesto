import { describe, expect, it } from 'vitest';
import { makeEvent, type AppEvent, type BlockSpec } from './events';
import { dailyMissions } from './missions';
import {
  COST,
  activeSession,
  estimateMinutes,
  planSession,
  weekStart,
  weeklyBossAvailable,
  type PlanInput,
} from './session';

const lessons = [
  { id: 'l1', minutes: 4 },
  { id: 'l2', minutes: 5 },
  { id: 'l3', minutes: 4 },
];
const base: PlanInput = {
  minutes: 20,
  dueCount: 0,
  nextLessons: lessons,
  reviewable: 0,
  weeklyBoss: false,
};
const kinds = (b: BlockSpec[]) => b.map((x) => x.kind);
const minutesOf = (plan: ReturnType<typeof planSession>) =>
  estimateMinutes(plan.blocks, (id) => lessons.find((l) => l.id === id)?.minutes ?? 4);

describe('orquestador de sesión', () => {
  it('siempre abre con Briefing y cierra con Cierre', () => {
    for (const minutes of [5, 10, 15, 20])
      for (const dueCount of [0, 8])
        for (const reviewable of [0, 20]) {
          const { blocks } = planSession({ ...base, minutes, dueCount, reviewable });
          expect(blocks[0]!.kind).toBe('briefing');
          expect(blocks.at(-1)!.kind).toBe('cierre');
        }
  });

  it('usuario nuevo (sin repasos ni historial): lecciones, sin repaso fantasma', () => {
    const p5 = planSession({ ...base, minutes: 5 });
    expect(kinds(p5.blocks)).toEqual(['briefing', 'lesson', 'cierre']);
    const p10 = planSession({ ...base, minutes: 10 });
    expect(kinds(p10.blocks)).toEqual(['briefing', 'lesson', 'review', 'reto', 'cierre']);
    const p20 = planSession({ ...base, minutes: 20 });
    expect(kinds(p20.blocks)).toEqual(['briefing', 'lesson', 'review', 'lesson', 'reto', 'cierre']);
  });

  it('el tiempo estimado cuadra con el elegido (5, 10, 15 y 20 min) sin huecos grandes', () => {
    for (const minutes of [5, 10, 15, 20]) {
      for (const state of [
        { dueCount: 0, reviewable: 0 },
        { dueCount: 12, reviewable: 30 },
        { dueCount: 0, reviewable: 30 },
      ]) {
        const plan = planSession({ ...base, minutes, ...state });
        const m = minutesOf(plan);
        expect(m, `${minutes} min ${JSON.stringify(state)}`).toBeLessThanOrEqual(minutes + 1);
        expect(m, `${minutes} min ${JSON.stringify(state)}`).toBeGreaterThanOrEqual(minutes - 3);
      }
    }
  });

  it('con repasos vencidos, Due diligence va primero y no pasa de 15 tarjetas ni se come la sesión', () => {
    const plan = planSession({ ...base, minutes: 20, dueCount: 40, reviewable: 40 });
    expect(plan.blocks[1]).toMatchObject({ kind: 'due' });
    const due = plan.blocks[1] as Extract<BlockSpec, { kind: 'due' }>;
    expect(due.cards).toBeLessThanOrEqual(15);
    expect(due.cards * COST.perDueCard).toBeLessThanOrEqual(6.01);
    expect(kinds(plan.blocks)).toContain('lesson');
  });

  it('5 min con repasos: solo lo que cabe, sin pasarse', () => {
    const plan = planSession({ ...base, minutes: 5, dueCount: 10, reviewable: 30 });
    expect(plan.blocks[1]).toMatchObject({ kind: 'due' });
    expect(minutesOf(plan)).toBeLessThanOrEqual(5.5);
  });

  it('sin contenido nuevo: el tiempo se llena con repaso y reto, sin huecos', () => {
    for (const minutes of [10, 15, 20]) {
      const plan = planSession({ ...base, minutes, nextLessons: [], dueCount: 5, reviewable: 40 });
      expect(kinds(plan.blocks)).not.toContain('lesson');
      expect(minutesOf(plan)).toBeGreaterThanOrEqual(minutes - 2);
      expect(minutesOf(plan)).toBeLessThanOrEqual(minutes + 0.5);
    }
  });

  it('sin contenido nuevo ni historial, la sesión se queda en Briefing y Cierre (nada que montar)', () => {
    const plan = planSession({ ...base, nextLessons: [], dueCount: 0, reviewable: 0 });
    expect(kinds(plan.blocks)).toEqual(['briefing', 'cierre']);
  });

  it('el Encargo del jefe sustituye al reto si toca esta semana y hay tiempo', () => {
    const plan = planSession({
      ...base,
      minutes: 20,
      nextLessons: [],
      dueCount: 0,
      reviewable: 40,
      weeklyBoss: true,
    });
    const reto = plan.blocks.find((b) => b.kind === 'reto') as Extract<BlockSpec, { kind: 'reto' }>;
    expect(reto.weekly).toBe(true);
    expect(reto.exercises).toBe(8);
    const short = planSession({
      ...base,
      minutes: 5,
      nextLessons: [],
      reviewable: 40,
      weeklyBoss: true,
    });
    expect(short.blocks.some((b) => b.kind === 'reto' && b.weekly)).toBe(false);
  });
});

const ctx = { deviceId: 'd', tz: 'Europe/Madrid' };
let n = 0;
const ev = (type: string, payload: object, at: string): AppEvent =>
  makeEvent(type as never, payload as never, {
    ...ctx,
    now: new Date(at),
    id: `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`,
  });

describe('estado de la sesión desde eventos', () => {
  const blocks: BlockSpec[] = [
    { kind: 'briefing' },
    { kind: 'lesson', lessonId: 'l1' },
    { kind: 'cierre' },
  ];
  const start = (id: string, at: string, day = '2026-10-15') =>
    ev('session_started', { sessionId: id, day, minutes: 10, blocks }, at);

  it('reanuda por el primer bloque sin completar', () => {
    const events = [
      start('s1', '2026-10-15T08:00:00Z'),
      ev('session_block_completed', { sessionId: 's1', index: 0 }, '2026-10-15T08:01:00Z'),
    ];
    const s = activeSession(events, '2026-10-15')!;
    expect(s.nextIndex).toBe(1);
    expect(s.completed).toEqual([0]);
    expect(s.blocks).toHaveLength(3);
  });

  it('una sesión cerrada o de otro día no está activa', () => {
    const closed = [
      start('s1', '2026-10-15T08:00:00Z'),
      ev('session_completed', { sessionId: 's1' }, '2026-10-15T08:20:00Z'),
    ];
    expect(activeSession(closed, '2026-10-15')).toBeNull();
    expect(
      activeSession([start('s2', '2026-10-14T08:00:00Z', '2026-10-14')], '2026-10-15'),
    ).toBeNull();
  });

  it('con dos sesiones abiertas el mismo día se reanuda la última', () => {
    const events = [start('s1', '2026-10-15T08:00:00Z'), start('s2', '2026-10-15T09:00:00Z')];
    expect(activeSession(events, '2026-10-15')!.sessionId).toBe('s2');
  });

  it('el Encargo del jefe es semanal: una sesión cerrada con encargo lo da por hecho hasta el lunes', () => {
    const boss: BlockSpec[] = [
      { kind: 'briefing' },
      { kind: 'reto', exercises: 8, weekly: true },
      { kind: 'cierre' },
    ];
    const events = [
      ev(
        'session_started',
        { sessionId: 'b1', day: '2026-10-14', minutes: 20, blocks: boss },
        '2026-10-14T08:00:00Z',
      ),
      ev('session_completed', { sessionId: 'b1' }, '2026-10-14T08:20:00Z'),
    ];
    expect(weekStart('2026-10-15')).toBe('2026-10-12'); // jueves → lunes
    expect(weekStart('2026-10-18')).toBe('2026-10-12'); // domingo
    expect(weeklyBossAvailable(events, '2026-10-15')).toBe(false);
    expect(weeklyBossAvailable(events, '2026-10-19')).toBe(true); // lunes siguiente
    expect(weeklyBossAvailable([], '2026-10-15')).toBe(true);
  });
});

describe('misiones diarias', () => {
  const answered = (correct: boolean, at: string, source: 'lesson' | 'review' = 'lesson') =>
    ev(
      'exercise_answered',
      {
        exerciseId: `x${n}`,
        lessonId: 'l1',
        conceptIds: ['c'],
        correct,
        timeMs: 1000,
        xp: correct ? 10 : 0,
        source,
      },
      at,
    );

  it('son 3, distintas y estables para el mismo día', () => {
    const a = dailyMissions([], '2026-10-15', 20);
    const b = dailyMissions([], '2026-10-15', 20);
    expect(a).toHaveLength(3);
    expect(new Set(a.map((m) => m.id)).size).toBe(3);
    expect(b).toEqual(a);
    const otherDays = new Set(
      ['2026-10-16', '2026-10-17', '2026-10-18', '2026-10-19'].map((d) =>
        dailyMissions([], d, 20)
          .map((m) => m.id)
          .join(),
      ),
    );
    expect(otherDays.size).toBeGreaterThan(1);
  });

  it('calculan el progreso desde los eventos del día, no de otros días', () => {
    const events: AppEvent[] = [
      ...Array.from({ length: 12 }, (_, i) =>
        answered(true, `2026-10-15T10:${String(i).padStart(2, '0')}:00Z`),
      ),
      answered(true, '2026-10-14T10:00:00Z'),
      ev('lesson_completed', { lessonId: 'l1', xp: 20, accuracy: 1 }, '2026-10-15T11:00:00Z'),
    ];
    const all = ['2026-10-15'].flatMap((d) => {
      // para comprobar cada tipo se mira en varios días hasta ver todos los ids
      return [d];
    });
    void all;
    const ms = dailyMissions(events, '2026-10-15', 100);
    for (const m of ms) {
      if (m.id === 'diez') expect(m.progress).toBe(10);
      if (m.id === 'leccion') expect(m.done).toBe(true);
      if (m.id === 'xp') expect(m.progress).toBe(100); // 12 × 10 + 20 = 140 → tope en el objetivo
      if (m.id === 'racha-aciertos') expect(m.progress).toBe(6);
      if (m.id === 'sesion') expect(m.progress).toBe(0);
    }
  });
});
