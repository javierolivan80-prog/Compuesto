import { describe, expect, it } from 'vitest';
import { ev } from '../../tests/helpers';
import { MINUTE_OPTIONS, dailyGoalXpFor, normalizeInitials } from './onboarding';
import {
  PASS_PCT,
  chainSummary,
  firstPhaseDecision,
  phaseQuestions,
  currentUnit,
  recordChainResult,
  scorePlacement,
  startChain,
} from './placement';
import { projectSeenConcepts } from './projections';

describe('puntuación del test de salto', () => {
  it('8 preguntas: 7 aciertos (87,5 %) dominan; 6 (75 %) no', () => {
    expect(scorePlacement([true, true, true, true, true, true, true, false])).toEqual({
      correct: 7,
      total: 8,
      pct: 87.5,
      passed: true,
    });
    expect(scorePlacement([true, true, true, true, true, true, false, false])).toMatchObject({
      correct: 6,
      pct: 75,
      passed: false,
    });
    expect(PASS_PCT).toBe(87.5);
  });
  it('8 de 8 aprueba, 0 de 8 suspende, y lo no contestado cuenta como fallo', () => {
    expect(scorePlacement(Array(8).fill(true)).passed).toBe(true);
    expect(scorePlacement(Array(8).fill(false))).toMatchObject({ correct: 0, passed: false });
    expect(scorePlacement([true, true, true])).toMatchObject({
      correct: 3,
      total: 8,
      passed: false,
    });
  });
  it('no cuenta más aciertos que preguntas', () => {
    expect(scorePlacement(Array(12).fill(true)).correct).toBe(8);
  });
});

describe('saltar un nivel completo (cadena de tests)', () => {
  const pass = scorePlacement(Array(8).fill(true));
  const fail = scorePlacement(Array(8).fill(false));

  it('si se aprueban todas las unidades, el nivel queda saltado', () => {
    let s = startChain(['n0-u1', 'n0-u2', 'n0-u3']);
    expect(currentUnit(s)).toBe('n0-u1');
    s = recordChainResult(s, pass);
    expect(currentUnit(s)).toBe('n0-u2');
    s = recordChainResult(s, pass);
    s = recordChainResult(s, pass);
    expect(s.status).toBe('completed');
    expect(currentUnit(s)).toBeUndefined();
    expect(chainSummary(s)).toEqual({
      skipped: ['n0-u1', 'n0-u2', 'n0-u3'],
      stoppedAt: undefined,
      levelSkipped: true,
    });
  });
  it('al suspender una unidad la cadena se detiene: las anteriores quedan saltadas y esa se estudia', () => {
    let s = startChain(['n0-u1', 'n0-u2', 'n0-u3']);
    s = recordChainResult(s, pass);
    s = recordChainResult(s, fail);
    expect(s.status).toBe('stopped');
    expect(chainSummary(s)).toEqual({
      skipped: ['n0-u1'],
      stoppedAt: 'n0-u2',
      levelSkipped: false,
    });
    expect(() => recordChainResult(s, pass)).toThrow(/terminó/);
  });
  it('una cadena vacía está completada', () => {
    expect(startChain([]).status).toBe('completed');
  });
});

describe('conceptos vistos', () => {
  const answered = ev(
    'exercise_answered',
    {
      exerciseId: 'e1',
      lessonId: 'l1',
      conceptIds: ['inflacion'],
      correct: false,
      timeMs: 1000,
      xp: 0,
    },
    '2026-02-01T10:00:00Z',
  );
  const skipped = ev(
    'unit_skipped',
    { unitId: 'n0-u2', level: 0, scorePct: 87.5 },
    '2026-02-02T10:00:00Z',
  );
  const catalog = { 'n0-u2': ['tin', 'tae'], 'n0-u3': ['presupuesto'] };

  it('los conceptos de una unidad saltada cuentan como vistos, junto con los de los ejercicios respondidos', () => {
    expect(projectSeenConcepts([answered, skipped], catalog)).toEqual(['inflacion', 'tae', 'tin']);
  });
  it('una unidad que no se ha saltado no aporta conceptos; el orden y los duplicados no importan', () => {
    expect(projectSeenConcepts([answered], catalog)).toEqual(['inflacion']);
    expect(projectSeenConcepts([skipped, answered, skipped], catalog)).toEqual([
      'inflacion',
      'tae',
      'tin',
    ]);
    expect(projectSeenConcepts([skipped], {})).toEqual([]);
  });
});

describe('onboarding', () => {
  it('minutos y objetivo de XP', () => {
    expect([...MINUTE_OPTIONS]).toEqual([5, 10, 15, 20]);
    expect(MINUTE_OPTIONS.map(dailyGoalXpFor)).toEqual([20, 40, 60, 80]);
  });
  it('iniciales: letras sin tildes, en mayúsculas, de 2 a 4', () => {
    expect(normalizeInitials('jav')).toBe('JAV');
    expect(normalizeInitials(' j.o ')).toBe('JO');
    expect(normalizeInitials('Álv')).toBe('ALV');
    expect(normalizeInitials('abcdef')).toBeNull();
    expect(normalizeInitials('j')).toBeNull();
    expect(normalizeInitials('12')).toBeNull();
    expect(normalizeInitials('')).toBeNull();
  });
});

describe('test de salto en dos fases (tarea 2.12)', () => {
  const flags = (n: number, total: number) => Array.from({ length: total }, (_, i) => i < n);
  it('8 y 7 aciertos dominan; 6 abre la segunda fase si el banco tiene 12; 5 empieza la unidad', () => {
    expect(firstPhaseDecision(8, 12)).toBe('dominada');
    expect(firstPhaseDecision(7, 12)).toBe('dominada');
    expect(firstPhaseDecision(6, 12)).toBe('segunda-fase');
    expect(firstPhaseDecision(6, 8)).toBe('estudiar'); // banco antiguo: sin reserva no hay segunda fase
    expect(firstPhaseDecision(5, 12)).toBe('estudiar');
  });
  it('6 + 3 domina; 6 + 2 no; el resultado guarda las dos fases', () => {
    expect(scorePlacement(flags(6, 8), 8, flags(3, 4))).toEqual({
      correct: 6,
      total: 8,
      pct: 75,
      passed: true,
      second: { correct: 3, total: 4 },
    });
    expect(scorePlacement(flags(6, 8), 8, flags(2, 4)).passed).toBe(false);
    expect(scorePlacement(flags(6, 8), 8, flags(4, 4)).passed).toBe(true);
    // una segunda fase no rescata a quien no sacó 6
    expect(scorePlacement(flags(5, 8), 8, flags(4, 4)).passed).toBe(false);
    expect(scorePlacement(flags(8, 8)).passed).toBe(true);
    expect(scorePlacement(flags(5, 8)).passed).toBe(false);
  });
  it('las preguntas de la segunda fase son las 4 del banco que no salieron en la primera', () => {
    const bank = Array.from({ length: 12 }, (_, i) => `q${i + 1}`);
    const one = phaseQuestions(bank, 1);
    const two = phaseQuestions(bank, 2);
    expect(one).toHaveLength(8);
    expect(two).toEqual(['q9', 'q10', 'q11', 'q12']);
    expect(one.filter((q) => two.includes(q))).toEqual([]);
    expect(phaseQuestions(bank.slice(0, 8), 2)).toEqual([]);
  });
  it('la cadena «saltar nivel» usa la misma regla: un 6 + 3 cuenta como superada', () => {
    let s = startChain(['a', 'b']);
    s = recordChainResult(s, scorePlacement(flags(6, 8), 8, flags(3, 4)));
    expect(currentUnit(s)).toBe('b');
    s = recordChainResult(s, scorePlacement(flags(6, 8), 8, flags(2, 4)));
    expect(chainSummary(s)).toEqual({ skipped: ['a'], stoppedAt: 'b', levelSkipped: false });
  });
});
