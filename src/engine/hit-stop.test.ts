import { describe, expect, it } from 'vitest';
import { createHitStop } from './hit-stop';

describe('hit-stop', () => {
  it('congela entre 40 y 60 ms y siempre se reanuda', () => {
    const h = createHitStop();
    h.freeze(1000, 5); // se sube a 40
    expect(h.isFrozen(1039)).toBe(true);
    expect(h.isFrozen(1040)).toBe(false);
    h.freeze(2000, 500); // se baja a 60
    expect(h.isFrozen(2059)).toBe(true);
    expect(h.isFrozen(2060)).toBe(false);
  });
  it('sin congelar no está congelado', () => {
    expect(createHitStop().isFrozen(0)).toBe(false);
  });
  it('un acierto durante una congelación la renueva sin pasarse de 60 ms desde ahora', () => {
    const h = createHitStop();
    h.freeze(0, 60);
    h.freeze(30, 60);
    expect(h.isFrozen(89)).toBe(true);
    expect(h.isFrozen(90)).toBe(false);
  });
  it('acumula el tiempo congelado para descontarlo de la simulación', () => {
    const h = createHitStop();
    h.freeze(100, 50);
    expect(h.frozenTotal(120)).toBe(20);
    expect(h.frozenTotal(500)).toBe(50);
    h.freeze(600, 40);
    expect(h.frozenTotal(1000)).toBe(90);
  });
});
