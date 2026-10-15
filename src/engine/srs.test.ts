import { describe, expect, it } from 'vitest';
import { addDays } from './days';
import { makeEvent, type AppEvent } from './events';
import {
  archivedCards,
  buildReview,
  conceptMastery,
  dueCards,
  firstAttempts,
  interleave,
  nextReviewDay,
  practiceConcept,
  projectCards,
  recentMistakes,
  weakPrerequisites,
  type ExerciseRef,
} from './srs';

const ctx = { deviceId: 'd', tz: 'Europe/Madrid' };
let n = 0;
const answer = (
  exerciseId: string,
  correct: boolean,
  at: string,
  concepts: string[] = ['c1'],
  lessonId = 'l1',
): AppEvent =>
  makeEvent(
    'exercise_answered',
    { exerciseId, lessonId, conceptIds: concepts, correct, timeMs: 5000, xp: correct ? 10 : 0 },
    { ...ctx, now: new Date(at), id: `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}` },
  );

const catalog: ExerciseRef[] = [
  { id: 'e1', lessonId: 'l1', unitId: 'u1', concepts: ['c1'] },
  { id: 'e2', lessonId: 'l1', unitId: 'u1', concepts: ['c1'] },
  { id: 'e3', lessonId: 'l2', unitId: 'u1', concepts: ['c2'] },
  { id: 'p1', lessonId: 'l0', unitId: 'u0', concepts: ['pre'] },
  { id: 'p2', lessonId: 'l0', unitId: 'u0', concepts: ['pre'] },
];
const graph = {
  c1: { prerequisites: ['pre'] },
  c2: { prerequisites: ['c1'] },
  pre: { prerequisites: [] },
};

describe('tarjetas FSRS como proyección de eventos', () => {
  it('un fallo hoy reaparece al día siguiente y un acierto espacia cada vez más', () => {
    const cards = projectCards([answer('e1', false, '2026-10-15T10:00:00Z')]);
    const c = cards.get('e1')!;
    expect(nextReviewDay(c)).toBe('2026-10-16');
    expect(dueCards(cards, { today: '2026-10-15', catalog })).toHaveLength(0);
    expect(dueCards(cards, { today: '2026-10-16', catalog }).map((x) => x.exerciseId)).toEqual([
      'e1',
    ]);

    // acierta al día siguiente: el siguiente repaso se aleja
    const after = projectCards([
      answer('e1', false, '2026-10-15T10:00:00Z'),
      answer('e1', true, '2026-10-16T10:00:00Z'),
    ]).get('e1')!;
    expect(nextReviewDay(after) > '2026-10-17').toBe(true);

    // varios aciertos seguidos: intervalos crecientes
    let when = '2026-10-15T10:00:00Z';
    const events: AppEvent[] = [];
    const gaps: number[] = [];
    let prevDue = when.slice(0, 10);
    for (let i = 0; i < 4; i++) {
      events.push(answer('e2', true, when));
      const due = nextReviewDay(projectCards(events).get('e2')!);
      gaps.push((Date.parse(due) - Date.parse(prevDue)) / 86_400_000);
      prevDue = due;
      when = `${due}T10:00:00Z`;
    }
    expect(gaps[1]!).toBeGreaterThan(gaps[0]!);
    expect(gaps[2]!).toBeGreaterThan(gaps[1]!);
  });

  it('los reintentos de la misma sesión (menos de 20 min) no cuentan como un repaso más', () => {
    const events = [
      answer('e1', false, '2026-10-15T10:00:00Z'),
      answer('e1', false, '2026-10-15T10:03:00Z'),
      answer('e1', true, '2026-10-15T10:08:00Z'),
    ];
    expect(firstAttempts(events)).toHaveLength(1);
    const c = projectCards(events).get('e1')!;
    expect(c.reviews).toBe(1);
    expect(c.lastCorrect).toBe(false);
    expect(nextReviewDay(c)).toBe('2026-10-16');
  });

  it('un repaso justo después de un fallo sí cuenta (no es un reintento de la lección)', () => {
    const fail = answer('e1', false, '2026-10-15T10:00:00Z');
    const review = makeEvent(
      'exercise_answered',
      {
        exerciseId: 'e1',
        lessonId: 'l1',
        conceptIds: ['c1'],
        correct: true,
        timeMs: 4000,
        xp: 5,
        source: 'review',
      },
      { ...ctx, now: new Date('2026-10-15T10:05:00Z'), id: '00000000-0000-4000-8000-0000000000aa' },
    );
    const c = projectCards([fail, review]).get('e1')!;
    expect(c.reviews).toBe(2);
    expect(c.lastCorrect).toBe(true);
  });

  it('reconstruir desde los eventos da las mismas tarjetas, llegue el orden que llegue', () => {
    const events = [
      answer('e1', false, '2026-10-15T10:00:00Z'),
      answer('e2', true, '2026-10-15T10:01:00Z'),
      answer('e1', true, '2026-10-16T10:00:00Z'),
      answer('e3', false, '2026-10-17T09:00:00Z', ['c2'], 'l2'),
    ];
    const a = projectCards(events);
    const b = projectCards([...events].reverse());
    const c = projectCards([...events, ...events]); // duplicados por id: idempotente
    const plain = (m: ReturnType<typeof projectCards>) =>
      JSON.stringify([...m.entries()].sort(([x], [y]) => x.localeCompare(y)));
    expect(plain(b)).toBe(plain(a));
    expect(plain(c)).toBe(plain(a));
  });

  it('los ejercicios retirados se archivan: no vencen, pero siguen en el historial', () => {
    const cards = projectCards([answer('viejo', false, '2026-10-01T10:00:00Z')]);
    expect(dueCards(cards, { today: '2026-12-01', catalog })).toHaveLength(0);
    expect(archivedCards(cards, catalog).map((c) => c.exerciseId)).toEqual(['viejo']);
  });
});

describe('dominio por concepto y refuerzo de prerrequisitos', () => {
  it('detecta el concepto en dificultad y sus prerrequisitos flojos', () => {
    const events = [
      answer('e1', true, '2026-10-15T10:00:00Z'),
      answer('e2', false, '2026-10-15T10:30:00Z'),
      answer('e1', false, '2026-10-16T10:00:00Z'),
    ];
    const m = conceptMastery(events);
    expect(m.get('c1')).toMatchObject({ attempts: 3, correct: 1, struggling: true });
    expect(weakPrerequisites(m, graph)).toEqual(['pre']);
  });

  it('un prerrequisito bien dominado no se refuerza', () => {
    const events = [
      ...[0, 1, 2, 3].map((i) => answer('p1', true, `2026-10-1${i}T10:00:00Z`, ['pre'], 'l0')),
      answer('e1', false, '2026-10-15T10:00:00Z'),
      answer('e2', false, '2026-10-15T10:30:00Z'),
      answer('e1', true, '2026-10-16T10:00:00Z'),
    ];
    const m = conceptMastery(events);
    expect(m.get('pre')!.mastery).toBe(1);
    expect(weakPrerequisites(m, graph)).toEqual([]);
  });

  it('fallar repetidamente un concepto programa el repaso de sus prerrequisitos', () => {
    const events = [
      answer('e1', false, '2026-10-15T10:00:00Z'),
      answer('e2', false, '2026-10-15T10:30:00Z'),
      answer('e1', false, '2026-10-16T10:00:00Z'),
    ];
    const cards = projectCards(events);
    const review = buildReview({
      cards,
      catalog,
      mastery: conceptMastery(events),
      graph,
      today: '2026-10-16',
    });
    const reinforced = review.filter((r) => r.reason === 'refuerzo').map((r) => r.exerciseId);
    expect(reinforced).toEqual(expect.arrayContaining(['p1']));
    expect(review.some((r) => r.reason === 'vencida')).toBe(true);
  });

  it('sin dificultad no hay refuerzo y la sesión no pasa de 15 tarjetas', () => {
    const many: ExerciseRef[] = Array.from({ length: 40 }, (_, i) => ({
      id: `x${i}`,
      lessonId: `l${i % 5}`,
      unitId: 'u',
      concepts: ['k'],
    }));
    const events = many.map((e, i) =>
      answer(e.id, true, `2026-09-0${(i % 9) + 1}T10:00:00Z`, ['k'], e.lessonId),
    );
    const cards = projectCards(events);
    const review = buildReview({
      cards,
      catalog: many,
      mastery: conceptMastery(events),
      graph: {},
      today: '2026-12-31',
    });
    expect(review).toHaveLength(15);
    expect(review.every((r) => r.reason === 'vencida')).toBe(true);
  });
});

describe('intercalado y modos de práctica', () => {
  it('no deja seguidos dos ejercicios de la misma lección si hay alternativa', () => {
    const items = [
      { exerciseId: 'a1', lessonId: 'A' },
      { exerciseId: 'a2', lessonId: 'A' },
      { exerciseId: 'b1', lessonId: 'B' },
      { exerciseId: 'b2', lessonId: 'B' },
    ];
    const out = interleave(items);
    for (let i = 1; i < out.length; i++) expect(out[i]!.lessonId).not.toBe(out[i - 1]!.lessonId);
  });

  it('Mis errores: solo ejercicios cuyo último intento fue un fallo, los más recientes primero', () => {
    const cards = projectCards([
      answer('e1', false, '2026-10-15T10:00:00Z'),
      answer('e2', false, '2026-10-16T10:00:00Z'),
      answer('e3', true, '2026-10-16T11:00:00Z', ['c2'], 'l2'),
    ]);
    expect(recentMistakes(cards, catalog).map((r) => r.exerciseId)).toEqual(['e2', 'e1']);
  });

  it('Por tema: primero lo fallado o vencido, luego lo no practicado', () => {
    const cards = projectCards([answer('e2', false, '2026-10-15T10:00:00Z')]);
    const out = practiceConcept('c1', cards, catalog, '2026-10-16');
    expect(out.map((r) => r.exerciseId)).toEqual(['e2', 'e1']);
    expect(practiceConcept('desconocido', cards, catalog, '2026-10-16')).toEqual([]);
  });

  it('addDays se usa con claves de día (sanity del reloj simulado)', () => {
    expect(addDays('2026-10-15', 1)).toBe('2026-10-16');
  });
});
