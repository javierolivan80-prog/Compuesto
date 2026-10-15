import { describe, expect, it } from 'vitest';
import {
  accuracy,
  answer,
  completionXp,
  currentId,
  isDone,
  startSession,
  xpForAnswer,
} from './lesson-session';

describe('cola de la lección', () => {
  it('todo a la primera: 10 XP cada uno, precisión 100 %', () => {
    let s = startSession(['a', 'b', 'c']);
    for (let i = 0; i < 3; i++) s = answer(s, true).state;
    expect(isDone(s)).toBe(true);
    expect(s.xp).toBe(30);
    expect(accuracy(s)).toBe(1);
    expect(completionXp(accuracy(s))).toBe(20);
  });
  it('un fallo vuelve al final y da 5 XP al acertarlo después', () => {
    let s = startSession(['a', 'b', 'c']);
    s = answer(s, false).state; // falla a
    expect(s.queue).toEqual(['b', 'c', 'a']);
    expect(currentId(s)).toBe('b');
    s = answer(s, true).state;
    s = answer(s, true).state;
    const last = answer(s, true);
    expect(last.isRetry).toBe(true);
    expect(last.xp).toBe(5);
    expect(isDone(last.state)).toBe(true);
    expect(last.state.xp).toBe(10 + 10 + 5);
    expect(accuracy(last.state)).toBeCloseTo(2 / 3, 10);
  });
  it('fallar también el repaso no bloquea la lección: sale sin XP', () => {
    let s = startSession(['a', 'b']);
    s = answer(s, false).state; // a → final
    s = answer(s, true).state; // b
    const r = answer(s, false); // a otra vez mal
    expect(r.xp).toBe(0);
    expect(isDone(r.state)).toBe(true);
    expect(r.state.done).toEqual(['b']);
  });
  it('precisión baja → bonificación de cierre menor', () => {
    let s = startSession(['a', 'b', 'c', 'd', 'e']);
    for (const ok of [false, false, true, true, true]) s = answer(s, ok).state;
    expect(accuracy(s)).toBeCloseTo(0.6, 10);
    expect(completionXp(0.6)).toBe(10);
    expect(completionXp(0.8)).toBe(20);
  });
  it('xpForAnswer y guardas', () => {
    expect(xpForAnswer(true, false)).toBe(10);
    expect(xpForAnswer(true, true)).toBe(5);
    expect(xpForAnswer(false, false)).toBe(0);
    expect(() => answer(startSession([]), true)).toThrow(/terminó/);
    expect(accuracy(startSession([]))).toBe(0);
  });
});
