import { describe, expect, it } from 'vitest';
import { makeEvent, type AppEvent } from './events';
import { nextPathLesson, pendingPathLessons, practiceBatch } from './next-step';
import { conceptMastery, projectCards, type ExerciseRef } from './srs';

const lessons = [
  { id: 'n1-u1-l1', level: 1, unit: 1 },
  { id: 'n1-u1-l2', level: 1, unit: 1 },
  { id: 'n1-u2-l1', level: 1, unit: 2 },
  { id: 'n3-u1-l1', level: 3, unit: 1 },
];
const done = (...ids: string[]) =>
  Object.fromEntries(ids.map((id) => [id, { status: 'completed' }]));

describe('siguiente lección del Camino', () => {
  it('es la primera sin completar, en orden', () => {
    expect(nextPathLesson(lessons, { lessons: {}, skippedUnits: [] })).toBe('n1-u1-l1');
    expect(nextPathLesson(lessons, { lessons: done('n1-u1-l1'), skippedUnits: [] })).toBe(
      'n1-u1-l2',
    );
  });
  it('una lección empezada pero sin terminar sigue pendiente', () => {
    expect(
      nextPathLesson(lessons, {
        lessons: { 'n1-u1-l1': { status: 'started' } },
        skippedUnits: [],
      }),
    ).toBe('n1-u1-l1');
  });
  it('se salta las unidades dominadas por test de salto', () => {
    expect(nextPathLesson(lessons, { lessons: {}, skippedUnits: ['n1-u1'] })).toBe('n1-u2-l1');
    expect(
      pendingPathLessons(lessons, { lessons: done('n1-u2-l1'), skippedUnits: ['n1-u1'] }).map(
        (l) => l.id,
      ),
    ).toEqual(['n3-u1-l1']);
  });
  it('si hiciste una lección más adelante, vuelve a la primera que falta (sin muros)', () => {
    expect(nextPathLesson(lessons, { lessons: done('n3-u1-l1'), skippedUnits: [] })).toBe(
      'n1-u1-l1',
    );
  });
  it('sin nada pendiente devuelve null', () => {
    expect(
      nextPathLesson(lessons, {
        lessons: done('n1-u1-l1', 'n1-u1-l2', 'n1-u2-l1'),
        skippedUnits: ['n3-u1'],
      }),
    ).toBeNull();
    expect(nextPathLesson([], { lessons: {}, skippedUnits: [] })).toBeNull();
  });
});

/* ---------- Tandas de práctica ---------- */

const ctx = { deviceId: 'd', tz: 'Europe/Madrid' };
let n = 0;
const answer = (exerciseId: string, correct: boolean, at: string, concepts = ['c1']): AppEvent =>
  makeEvent(
    'exercise_answered',
    {
      exerciseId,
      lessonId: exerciseId.startsWith('e3') ? 'l2' : 'l1',
      conceptIds: concepts,
      correct,
      timeMs: 5000,
      xp: correct ? 10 : 0,
    },
    { ...ctx, now: new Date(at), id: `00000000-0000-4000-a000-${String(++n).padStart(12, '0')}` },
  );

const catalog: ExerciseRef[] = [
  { id: 'e1', lessonId: 'l1', unitId: 'u1', concepts: ['c1'] },
  { id: 'e2', lessonId: 'l1', unitId: 'u1', concepts: ['c1'] },
  { id: 'e3', lessonId: 'l2', unitId: 'u1', concepts: ['c2'] },
  { id: 'e4', lessonId: 'l2', unitId: 'u1', concepts: ['c2'] },
];
const graph = { c1: { prerequisites: [] }, c2: { prerequisites: ['c1'] } };

const input = (events: AppEvent[], today: string) => ({
  cards: projectCards(events),
  catalog,
  mastery: conceptMastery(events),
  graph,
  today,
});

describe('tandas de práctica (Seguir practicando)', () => {
  const events = [
    answer('e1', false, '2026-10-15T10:00:00Z'),
    answer('e2', true, '2026-10-15T10:30:00Z'),
    answer('e3', true, '2026-10-15T11:00:00Z', ['c2']),
  ];

  it('repaso: primero lo que vence, sin repetir lo ya respondido en esta racha', () => {
    const first = practiceBatch({ ...input(events, '2026-10-16'), mode: 'due' });
    expect(first.extra).toBe(false);
    expect(first.items.map((i) => i.exerciseId)).toContain('e1');
    const second = practiceBatch({
      ...input(events, '2026-10-16'),
      mode: 'due',
      exclude: new Set(first.items.map((i) => i.exerciseId)),
    });
    const seen = new Set(first.items.map((i) => i.exerciseId));
    expect(second.items.length).toBeGreaterThan(0);
    expect(second.items.some((i) => seen.has(i.exerciseId))).toBe(false);
  });

  it('repaso sin nada pendiente: práctica extra intercalada con lo ya estudiado, nunca vacía', () => {
    const b = practiceBatch({ ...input(events, '2026-10-15'), mode: 'due' });
    expect(b.extra).toBe(true);
    expect(b.items.length).toBeGreaterThan(0);
    expect(b.items.every((i) => ['e1', 'e2', 'e3'].includes(i.exerciseId))).toBe(true);
  });

  it('si ya se ha visto todo lo estudiado, vuelve a empezar en lugar de quedarse vacía', () => {
    const b = practiceBatch({
      ...input(events, '2026-10-15'),
      mode: 'due',
      exclude: new Set(['e1', 'e2', 'e3', 'e4']),
    });
    expect(b.extra).toBe(true);
    expect(b.items.length).toBeGreaterThan(0);
  });

  it('mis errores: los fallos; agotados, práctica extra', () => {
    const a = practiceBatch({ ...input(events, '2026-10-15'), mode: 'errores' });
    expect(a).toEqual({ extra: false, items: [expect.objectContaining({ exerciseId: 'e1' })] });
    const b = practiceBatch({
      ...input(events, '2026-10-15'),
      mode: 'errores',
      exclude: new Set(['e1']),
    });
    expect(b.extra).toBe(true);
    expect(b.items.some((i) => i.exerciseId !== 'e1')).toBe(true);
  });

  it('por tema: los ejercicios del concepto en tandas; agotados, práctica extra', () => {
    const a = practiceBatch({
      ...input(events, '2026-10-15'),
      mode: 'tema',
      conceptId: 'c2',
      max: 1,
    });
    expect(a.extra).toBe(false);
    expect(a.items).toHaveLength(1);
    const b = practiceBatch({
      ...input(events, '2026-10-15'),
      mode: 'tema',
      conceptId: 'c2',
      exclude: new Set(['e3', 'e4']),
    });
    expect(b.extra).toBe(true);
  });

  it('sin nada estudiado devuelve una tanda vacía (la pantalla ofrece la siguiente lección)', () => {
    expect(practiceBatch({ ...input([], '2026-10-15'), mode: 'due' })).toEqual({
      items: [],
      extra: true,
    });
  });

  it('respeta el tamaño de la tanda', () => {
    expect(
      practiceBatch({ ...input(events, '2026-10-15'), mode: 'due', max: 2 }).items.length,
    ).toBeLessThanOrEqual(2);
  });
});
