import type { LessonGameKind } from '../../engine/games/lesson-games';

/*
 * Solo en desarrollo (break-ui): semillas con las cifras más largas o extremas de cada lección-juego, para revisar la
 * interfaz con el peor caso realista. Se activan con `?datos=peor` en la URL; nunca llegan a producción.
 */
export const WORST_SEEDS: Record<LessonGameKind, number> = {
  'block-trade': 43, // punto medio de 10,99 €: los precios más largos del libro
  'first-shares': 686, // la acción llega a 11,20 €
  'opening-auction': 749, // indicativo más alto a las 8:59
  'index-mover': 1479, // la sesión que más mueve el índice
  'dividend-day': 167, // la orden más grande: 9.992 €
  'ipo-book': 4, // demanda de 20.000.000 de acciones a 9 €
  'takeover-rumor': 104, // la oferta más alta: 8,32 €
};

export const worstCaseOn = (): boolean =>
  import.meta.env.DEV && new URLSearchParams(window.location.search).get('datos') === 'peor';

export function setWorstCase(on: boolean) {
  const url = new URL(window.location.href);
  if (on) url.searchParams.set('datos', 'peor');
  else url.searchParams.delete('datos');
  window.location.replace(url.toString());
}
