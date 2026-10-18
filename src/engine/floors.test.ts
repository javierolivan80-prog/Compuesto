import { describe, expect, it } from 'vitest';
import { BASE_LEVEL, FLOOR_COUNT, floorOfLevel, levelOfFloor, levelOrder } from './floors';

describe('plantas del Camino', () => {
  it('la planta 0 son los mercados (nivel 1) y la 1, leer una empresa (nivel 3)', () => {
    expect(levelOfFloor(0)).toBe(1);
    expect(levelOfFloor(1)).toBe(3);
    expect(floorOfLevel(2)).toBe(2);
    expect(floorOfLevel(10)).toBe(FLOOR_COUNT - 1);
  });
  it('la Base no es planta y va antes que todo', () => {
    expect(floorOfLevel(BASE_LEVEL)).toBeNull();
    expect(levelOrder(BASE_LEVEL)).toBe(-1);
    expect(levelOrder(1)).toBe(0);
    expect(levelOrder(3)).toBeLessThan(levelOrder(2));
  });
  it('niveles desconocidos: sin planta y al final', () => {
    expect(floorOfLevel(42)).toBeNull();
    expect(levelOfFloor(42)).toBeUndefined();
    expect(levelOrder(42)).toBe(FLOOR_COUNT);
  });
  it('cada planta es un nivel distinto', () => {
    const levels = Array.from({ length: FLOOR_COUNT }, (_, f) => levelOfFloor(f));
    expect(new Set(levels).size).toBe(FLOOR_COUNT);
    for (let f = 0; f < FLOOR_COUNT; f++) expect(floorOfLevel(levelOfFloor(f)!)).toBe(f);
  });
});
