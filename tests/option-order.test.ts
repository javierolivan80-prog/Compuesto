import { describe, expect, it } from 'vitest';
import { allLessons } from '../src/content/library';
import { optionOrder } from '../src/features/exercises/views';

/* Las opciones se barajan al mostrarse: la correcta no debe quedar casi siempre la primera. */

describe('orden de las opciones', () => {
  const mc = allLessons()
    .flatMap((l) => l.exercises)
    .filter((e) => e.type === 'multiple_choice');

  it('es una permutación estable para cada ejercicio', () => {
    for (const e of mc) {
      const a = optionOrder(e);
      expect([...a].sort()).toEqual(e.options.map((_, i) => i));
      expect(optionOrder(e)).toEqual(a);
    }
  });
  it('la respuesta correcta no queda primera en más de la mitad de los ejercicios', () => {
    const first = mc.filter((e) => optionOrder(e)[0] === e.answer).length;
    expect(mc.length).toBeGreaterThan(20);
    expect(first / mc.length).toBeLessThan(0.5);
  });
});
