# Spec: lección-juego «El primer dividendo» (`n1-u5-l7`)

Motor: `src/engine/games/dividend-day.ts`. Interfaz: `src/features/games/DividendGame.tsx`. Textos: `es.json` → `dividend`.

## Reglas
- Compras n acciones (200, 300, 400, 600 u 800) de Pirineo Energía a entre 12,00 y 12,49 €. El dividendo está entre 0,30 y 0,50 € por acción.
- Comisión = máx.(porcentaje × importe, mínimo). El bróker más barato se calcula para la orden de compra.
- Precio de referencia en la fecha ex = cierre anterior − dividendo. Un mes después, el precio sube entre un 2 % y un 5 % desde ahí.
- Retención: 19 % del bruto. Rentabilidad total (antes de impuestos) = (venta neta − coste con comisión + dividendo bruto) ÷ coste.
- Cazar el dividendo con 300 acciones cuesta las dos comisiones; el dividendo bruto compensa justo la bajada del precio.
- Nota: un tercio por cada acierto (bróker más barato, no cazar el dividendo, acertar el precio en la fecha ex).

## Escenarios
- **Cuando** eliges bróker, **entonces** ves la comisión de cada uno para tu orden, con ✓ en el más barato.
- **Cuando** decides cazar el dividendo, **entonces** en la fecha ex se explica que solo quedan las comisiones y que la retención es un adelanto del IRPF; en el resultado aparece su coste.
- **En el pago**, se ven el bruto, la retención y el neto que llega a la cuenta.
- **Al vender**, se ven coste, venta, ganancia por precio, dividendo y rentabilidad total con ▲▼ y signo.

## Verificación
`dividend-day.test.ts`, `tests/dividend-game.test.tsx`, `e2e/leccion-juego.spec.ts` (axe y 375 px en cada paso), `e2e/n1u5.spec.ts` (la unidad entera) y `content:validate` con cuatro partidas de referencia.
