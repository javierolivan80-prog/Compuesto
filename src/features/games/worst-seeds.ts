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
  'cash-cycle': 120, // ventas de 64.000 con solo 5.000 de caja: el hueco más grande
  'ratio-detective': 1,
  'wacc-mix': 0,
  'dcf-express': 0,
  'bond-issue': 0,
  'yield-curve': 2, // la curva invertida
  'fund-fees': 0,
  'luck-or-skill': 0,
  'fx-trip': 0,
  'repo-night': 0,
  'bank-window': 0,
  'macro-day': 0,
  'ecb-meeting': 0,
  'stress-test': 244, // préstamos de 24.000 M€ y el CET1 estresado por debajo del 7 % (6,9 %)
  'fx-desk': 203, // exportaciones de 340 con déficit corriente, EUR/USD 1,12 y el país A vulnerable
  'risk-premium': 1453, // recesión con PIB de 1.200, Bund al 2,35 % y la prima más alta (245 pb)
  'cheap-or-dear': 3, // precios con más dígitos y los tres veredictos
  'balance-builder': 203, // los importes de enero más altos (15.900 mil € entre las cinco operaciones)
};

export const worstCaseOn = (): boolean =>
  import.meta.env.DEV && new URLSearchParams(window.location.search).get('datos') === 'peor';

export function setWorstCase(on: boolean) {
  const url = new URL(window.location.href);
  if (on) url.searchParams.set('datos', 'peor');
  else url.searchParams.delete('datos');
  window.location.replace(url.toString());
}
