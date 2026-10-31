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
  'order-desk': 96, // acción a 15 €, bloque de 50.000 acciones y horquilla realizada negativa
  'fund-report': 63, // 50.000 € más 20.000 € en julio, año negativo (−2,69 %) y Sharpe negativo
  'stop-trade': 22, // 125 acciones con un stop del 4 %, sin tocar stop ni objetivo, y −38,75 € al cierre
  'pattern-noise': 60, // CFD de 5.000 € a 20:1 (100.000 € de exposición, 2.000 € de pérdida) y medias móviles que pierden un 6 % neto
  'edge-test': 8, // estrategia que pierde 28 € por operación, 16 años de backtest y 100 variantes probadas
  'short-desk': 640, // corto de 20.000 acciones a 40 € que pierde 58.666,67 €, comisión con céntimos y posición publicada
  'vwap-desk': 158, // compra de 100.000 acciones a 20,06 €: 2.006.000 € de efectivo y 5.616,80 € de costes explícitos
  'bank-valuation': 111, // patrimonio de 1.900, capitalización de 3.200 y Banco Russafa como ganador
  'risk-committee': 295, // solicitud de 2.000 con PD del 4 % y LGD del 60 % denegada; préstamo en fase 3 con provisión de 600
  'stress-test': 383, // préstamos de 24.000 M€ y el CET1 estresado por debajo del 7 % (6,1 %)
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
