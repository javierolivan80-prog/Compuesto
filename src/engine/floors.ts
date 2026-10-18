/*
 * Plantas del Camino (temario «directo a mercados», aprobado el 17/10/2026). El número de nivel del contenido
 * (`n1-u4-l7` → nivel 1) es un identificador y no cambia; la planta es el orden en que se presenta. El nivel 0
 * (finanzas personales) deja de ser una planta: es la «Base» opcional de Practicar.
 * content:validate comprueba que curriculum.json dice lo mismo.
 */

/** Nivel de contenido que no es planta: la Base opcional. */
export const BASE_LEVEL = 0;

/** Nivel de contenido de cada planta, de la planta 0 (recepción) al despacho de socios. */
export const FLOOR_LEVELS = [1, 3, 2, 4, 5, 6, 7, 8, 9, 10] as const;

export const FLOOR_COUNT = FLOOR_LEVELS.length;

/** Planta de un nivel de contenido; `null` para la Base o un nivel desconocido. */
export function floorOfLevel(level: number): number | null {
  const i = (FLOOR_LEVELS as readonly number[]).indexOf(level);
  return i < 0 ? null : i;
}

/** Nivel de contenido que se enseña en una planta. */
export function levelOfFloor(floor: number): number | undefined {
  return FLOOR_LEVELS[floor];
}

/** Orden de un nivel en el temario: la Base va antes que todo (es lo que se da por sabido). */
export function levelOrder(level: number): number {
  return level === BASE_LEVEL ? -1 : (floorOfLevel(level) ?? FLOOR_COUNT);
}
