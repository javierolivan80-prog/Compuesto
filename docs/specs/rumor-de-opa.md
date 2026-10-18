# Spec: lección-juego «El rumor de OPA» (`n1-u6-l7`)

Motor: `src/engine/games/takeover-rumor.ts`. Interfaz: `src/features/games/TakeoverGame.tsx`. Textos: `es.json` → `takeover`.

## Reglas
- Mediterránea de Navieras: 25.000.000 de acciones. Tienes 1.000, y antes del rumor cotiza entre 6,00 y 6,40 €.
- El día del rumor sube entre un 5 % y un 8 %. Oferta: un premio de entre el 20 % y el 30 % sobre el precio de antes del rumor. Tras el anuncio, cotiza entre un 1 % y un 2 % por debajo de la oferta. Si el rumor hubiera sido falso, la acción habría vuelto al 99 % del precio de antes.
- Nota: 0,6 por no operar con la confidencia. A eso se suman 0,4 por vender o acudir, o 0,2 por no acudir.

## Escenarios
- **Lunes:** titular del rumor y vela. Si compras 1.000 más, se explica que es legal para un inversor cualquiera (en un banco pasa por cumplimiento) y cuánto perderías si fuera falso.
- **Martes:** bocadillo de Hugo Ferrer con la confidencia. Si compras, Pilar Soler lo para y se explica que es abuso de mercado. Si avisas, Pilar lo registra.
- **Miércoles:** anuncio en la CNMV, vela, diferencial y tres decisiones, cada una con su porqué.
- **Resumen:** precio antes del rumor, precio de la OPA, premio, ganancia desde el viernes y, si compraste por el rumor, el resultado de esa apuesta.

## Verificación
`takeover-rumor.test.ts`, `tests/takeover-game.test.tsx`, `e2e/leccion-juego.spec.ts` (axe y 375 px en cada día), `e2e/n1u6.spec.ts` (la unidad entera) y `content:validate`.
