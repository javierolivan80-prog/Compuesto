import { describe, expect, it } from 'vitest';
import { addDays } from './days';
import { Rating } from 'ts-fsrs';
import { makeEvent, type AppEvent } from './events';
import { seededShuffle } from './grading';
import {
  archivedCards,
  buildChallenge,
  buildPractice,
  buildReview,
  conceptMastery,
  dueCards,
  firstAttempts,
  interleave,
  nextReviewDay,
  pickVariant,
  practiceConcept,
  projectCards,
  rateAttempt,
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

describe('bloques de la sesión diaria', () => {
  it('Repaso (en lugar del minijuego): primero los fallos, luego lo flojo, acotado y sin repetir', () => {
    const events = [
      answer('e1', false, '2026-10-15T10:00:00Z'),
      answer('e2', true, '2026-10-15T10:30:00Z'),
      answer('e3', true, '2026-10-15T11:00:00Z', ['c2'], 'l2'),
    ];
    const cards = projectCards(events);
    const items = buildPractice({
      cards,
      catalog,
      mastery: conceptMastery(events),
      today: '2026-10-16',
      n: 3,
    });
    expect(items).toHaveLength(3);
    expect(items[0]!.exerciseId === 'e1' || items.some((i) => i.exerciseId === 'e1')).toBe(true);
    expect(new Set(items.map((i) => i.exerciseId)).size).toBe(3);
    expect(
      buildPractice({ cards, catalog, mastery: conceptMastery(events), today: '2026-10-16', n: 99 })
        .length,
    ).toBeLessThanOrEqual(3);
  });

  it('Reto del día: determinista por día, solo de lo estudiado y sin lo respondido hoy', () => {
    const base = {
      catalog,
      completedLessons: new Set(['l1', 'l2']),
      day: '2026-10-15',
      n: 2,
      shuffle: seededShuffle,
    };
    const a = buildChallenge(base);
    expect(buildChallenge(base)).toEqual(a);
    expect(a.every((i) => ['e1', 'e2', 'e3'].includes(i.exerciseId))).toBe(true);
    const without = buildChallenge({ ...base, n: 5, answeredToday: new Set(['e1']) });
    expect(without.some((i) => i.exerciseId === 'e1')).toBe(false);
    expect(buildChallenge({ ...base, completedLessons: new Set() })).toEqual([]);
  });
});

/* ---------- Tarea 2.11: Hard y variantes ---------- */

const answered = (
  exerciseId: string,
  correct: boolean,
  at: string,
  extra: { timeMs?: number; hintUsed?: boolean; cardId?: string } = {},
): AppEvent =>
  makeEvent(
    'exercise_answered',
    {
      exerciseId,
      lessonId: 'l1',
      conceptIds: ['c1'],
      correct,
      timeMs: extra.timeMs ?? 5000,
      xp: correct ? 10 : 0,
      source: 'review',
      ...(extra.hintUsed !== undefined ? { hintUsed: extra.hintUsed } : {}),
      ...(extra.cardId ? { cardId: extra.cardId } : {}),
    },
    { ...ctx, now: new Date(at), id: `00000000-0000-4000-9000-${String(++n).padStart(12, '0')}` },
  );

describe('calificación Again / Hard / Good (tarea 2.11)', () => {
  const first = '2026-10-01T10:00:00Z';
  const second = '2026-10-04T10:00:00Z';
  const due = (evs: AppEvent[]) => nextReviewDay(projectCards(evs).get('e1')!);

  it('Hard programa antes que Good y después que Again', () => {
    const good = due([answered('e1', true, first), answered('e1', true, second)]);
    const hard = due([
      answered('e1', true, first),
      answered('e1', true, second, { hintUsed: true }),
    ]);
    const again = due([answered('e1', true, first), answered('e1', false, second)]);
    expect(again < hard).toBe(true);
    expect(hard < good).toBe(true);
    expect(
      projectCards([answered('e1', true, first, { hintUsed: true })]).get('e1')!.lastRating,
    ).toBe(Rating.Hard);
  });

  it('un evento antiguo sin hintUsed da lo mismo que hoy (Good) y Easy nunca es automático', () => {
    const old = projectCards([answer('e1', true, first)]).get('e1')!;
    const explicit = projectCards([answered('e1', true, first, { hintUsed: false })]).get('e1')!;
    expect(old.lastRating).toBe(Rating.Good);
    expect(nextReviewDay(old)).toBe(nextReviewDay(explicit));
    const fast = projectCards([
      answered('e1', true, first, { timeMs: 9000 }),
      answered('e1', true, '2026-10-05T10:00:00Z', { timeMs: 9000 }),
      answered('e1', true, '2026-10-20T10:00:00Z', { timeMs: 9000 }),
      answered('e1', true, '2026-11-20T10:00:00Z', { timeMs: 100 }),
    ]).get('e1')!;
    expect(fast.lastRating).toBe(Rating.Good);
  });

  it('un acierto con más del doble del tiempo mediano es Hard; sin 3 intentos previos no hay mediana', () => {
    const base = (t: number) => [
      answered('e1', true, '2026-10-01T10:00:00Z', { timeMs: 4000 }),
      answered('e1', true, '2026-10-05T10:00:00Z', { timeMs: 5000 }),
      answered('e1', true, '2026-10-20T10:00:00Z', { timeMs: 6000 }),
      answered('e1', true, '2026-11-20T10:00:00Z', { timeMs: t }),
    ];
    expect(projectCards(base(10_001)).get('e1')!.lastRating).toBe(Rating.Hard);
    expect(projectCards(base(10_000)).get('e1')!.lastRating).toBe(Rating.Good);
    // solo dos intentos previos de e1 y ningún tipo conocido: no hay mediana
    const two = [
      answered('e1', true, '2026-10-01T10:00:00Z', { timeMs: 1000 }),
      answered('e1', true, '2026-10-05T10:00:00Z', { timeMs: 1000 }),
      answered('e1', true, '2026-10-20T10:00:00Z', { timeMs: 60_000 }),
    ];
    expect(projectCards(two).get('e1')!.lastRating).toBe(Rating.Good);
  });

  it('con menos de 3 intentos del ejercicio, usa la mediana de los del mismo tipo', () => {
    const typeOf = (id: string) => (id === 'e3' ? 'scenario' : 'numeric_input');
    const evs = [
      answered('e1', true, '2026-10-01T10:00:00Z', { timeMs: 3000 }),
      answered('e2', true, '2026-10-01T10:05:00Z', { timeMs: 3000 }),
      answered('e3', true, '2026-10-01T10:10:00Z', { timeMs: 60_000 }),
      answered('e1', true, '2026-10-05T10:00:00Z', { timeMs: 3000 }),
      answered('x9', true, '2026-10-06T10:00:00Z', { timeMs: 7000 }),
    ];
    // x9 es numérico: mediana de e1, e2, e1 = 3000 → 7000 > 6000 → Hard
    expect(projectCards(evs, { typeOf }).get('x9')!.lastRating).toBe(Rating.Hard);
    // sin tipos, x9 no tiene mediana
    expect(projectCards(evs).get('x9')!.lastRating).toBe(Rating.Good);
    expect(
      rateAttempt(
        { ...firstAttempts([evs[4]!])[0]!, correct: false },
        firstAttempts(evs.slice(0, 4)),
        typeOf,
      ),
    ).toBe(Rating.Again);
  });

  it('reconstruir desde eventos da las mismas tarjetas en cualquier orden', () => {
    const evs = [
      answered('e1', true, '2026-10-01T10:00:00Z', { timeMs: 4000 }),
      answered('e1', true, '2026-10-05T10:00:00Z', { timeMs: 5000, hintUsed: true }),
      answered('e2', false, '2026-10-06T10:00:00Z'),
      answered('e1', true, '2026-10-20T10:00:00Z', { timeMs: 6000 }),
      answered('e2', true, '2026-10-21T10:00:00Z', { cardId: 'e1' }),
      answered('e1', true, '2026-11-20T10:00:00Z', { timeMs: 30_000 }),
    ];
    const a = projectCards(evs);
    for (const order of [[...evs].reverse(), seededShuffle(evs, 'orden')]) {
      const b = projectCards(order);
      expect([...b.entries()].sort()).toEqual([...a.entries()].sort());
    }
  });

  it('una variante califica la tarjeta original y queda como último ítem mostrado', () => {
    const cards = projectCards([
      answered('e1', true, '2026-10-01T10:00:00Z'),
      answered('e2', true, '2026-10-05T10:00:00Z', { cardId: 'e1' }),
    ]);
    expect(cards.has('e2')).toBe(false);
    const c = cards.get('e1')!;
    expect(c.reviews).toBe(2);
    expect(c.lastShownId).toBe('e2');
    expect(c.exerciseId).toBe('e1');
  });
});

describe('variantes en el repaso (tarea 2.11)', () => {
  const cat: ExerciseRef[] = [
    { id: 'a1', lessonId: 'l1', unitId: 'u1', concepts: ['c1'], category: 'producir' },
    { id: 'a2', lessonId: 'l1', unitId: 'u1', concepts: ['c1'], category: 'producir' },
    { id: 'a3', lessonId: 'l2', unitId: 'u1', concepts: ['c1', 'c2'], category: 'producir' },
    { id: 'b1', lessonId: 'l1', unitId: 'u1', concepts: ['c1'], category: 'reconocer' },
    { id: 'z1', lessonId: 'l3', unitId: 'u1', concepts: ['c9'], category: 'producir' },
    {
      id: 'p1',
      lessonId: 'l1',
      unitId: 'u1',
      concepts: ['c1'],
      category: 'producir',
      parametric: true,
    },
  ];
  const cardOf = (id: string, at = '2026-10-01T10:00:00Z') =>
    projectCards([answered(id, true, at)]).get(id)!;

  it('elige de forma determinista entre los de la misma categoría y concepto, sin repetir el último', () => {
    const c = cardOf('a1');
    const v = pickVariant(c, cat, '2026-10-10')!;
    expect(v).toEqual(pickVariant(c, cat, '2026-10-10'));
    expect(['a2', 'a3', 'p1']).toContain(v.id); // ni a1 (el último mostrado), ni b1 (otra categoría), ni z1
    // a lo largo de muchos días nunca repite el último ni sale de su grupo
    const seen = new Set<string>();
    for (let d = 1; d <= 28; d++) {
      const id = pickVariant(c, cat, `2026-11-${String(d).padStart(2, '0')}`)!.id;
      expect(id).not.toBe('a1');
      seen.add(id);
    }
    expect([...seen].sort()).toEqual(['a2', 'a3', 'p1']);
    // si el último repaso mostró a2, puede volver a1 pero no a2
    const shownA2 = projectCards([
      answered('a1', true, '2026-10-01T10:00:00Z'),
      answered('a2', true, '2026-10-05T10:00:00Z', { cardId: 'a1' }),
    ]).get('a1')!;
    for (let d = 1; d <= 28; d++)
      expect(pickVariant(shownA2, cat, `2026-12-${String(d).padStart(2, '0')}`)!.id).not.toBe('a2');
  });

  it('un paramétrico se muestra a sí mismo (con cifras nuevas); sin otros candidatos, el original', () => {
    expect(pickVariant(cardOf('p1'), cat, '2026-10-10')!.id).toBe('p1');
    expect(pickVariant(cardOf('z1'), cat, '2026-10-10')!.id).toBe('z1');
    expect(pickVariant(cardOf('b1'), cat, '2026-10-10')!.id).toBe('b1');
  });

  it('buildReview muestra la variante y apunta a la tarjeta original', () => {
    const cards = projectCards([
      answered('a1', true, '2026-10-01T10:00:00Z'),
      answered('z1', true, '2026-10-01T10:05:00Z'),
    ]);
    const review = buildReview({
      cards,
      catalog: cat,
      mastery: new Map(),
      graph: {},
      today: '2026-12-31',
    });
    const forA1 = review.find((r) => r.cardId === 'a1')!;
    expect(['a2', 'a3', 'p1']).toContain(forA1.exerciseId);
    expect(review.find((r) => r.exerciseId === 'z1')!.cardId).toBeUndefined();
  });
});

describe('unidades saltadas en el repaso (tarea 2.12)', () => {
  const placementAnswer = (id: string, correct: boolean, at: string) =>
    makeEvent(
      'exercise_answered',
      { exerciseId: id, lessonId: 'salto-n2-u7', conceptIds: ['c1'], correct, timeMs: 3000, xp: 0 },
      { ...ctx, now: new Date(at), id: `00000000-0000-4000-a000-${String(++n).padStart(12, '0')}` },
    );
  const skipped = (at: string) =>
    makeEvent(
      'unit_skipped',
      { unitId: 'n2-u7', level: 2, scorePct: 87.5 },
      { ...ctx, now: new Date(at), id: `00000000-0000-4000-b000-${String(++n).padStart(12, '0')}` },
    );
  const qs = ['salto-n2-u7-q1', 'salto-n2-u7-q2'];
  const placementCatalog: ExerciseRef[] = qs.map((id) => ({
    id,
    lessonId: 'salto-n2-u7',
    unitId: 'n2-u7',
    concepts: ['c1'],
  }));

  it('las preguntas de una unidad saltada vencen a los 7 días, aciertos y fallos', () => {
    const evs = [
      placementAnswer(qs[0]!, true, '2026-10-19T10:00:00Z'),
      placementAnswer(qs[1]!, false, '2026-10-19T10:01:00Z'),
      skipped('2026-10-19T10:02:00Z'),
    ];
    const cards = projectCards(evs);
    expect(qs.map((id) => nextReviewDay(cards.get(id)!))).toEqual(['2026-10-26', '2026-10-26']);
    expect(dueCards(cards, { today: '2026-10-25', catalog: placementCatalog })).toHaveLength(0);
    expect(dueCards(cards, { today: '2026-10-26', catalog: placementCatalog })).toHaveLength(2);
    // en cualquier orden de llegada, lo mismo
    expect([...projectCards([...evs].reverse()).entries()].sort()).toEqual(
      [...cards.entries()].sort(),
    );
  });

  it('sin saltar la unidad, el test no crea tarjetas; el repaso de una pregunta saltada programa normal', () => {
    expect(projectCards([placementAnswer(qs[0]!, true, '2026-10-19T10:00:00Z')]).size).toBe(0);
    const reviewed = projectCards([
      placementAnswer(qs[0]!, true, '2026-10-19T10:00:00Z'),
      skipped('2026-10-19T10:02:00Z'),
      makeEvent(
        'exercise_answered',
        {
          exerciseId: qs[0]!,
          lessonId: 'salto-n2-u7',
          conceptIds: ['c1'],
          correct: true,
          timeMs: 3000,
          xp: 5,
          source: 'review',
        },
        {
          ...ctx,
          now: new Date('2026-10-26T10:00:00Z'),
          id: '00000000-0000-4000-8fff-000000000001',
        },
      ),
    ]).get(qs[0]!)!;
    expect(reviewed.reviews).toBe(1);
    expect(nextReviewDay(reviewed) > '2026-10-27').toBe(true);
  });
});
