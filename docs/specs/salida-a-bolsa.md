# Spec: lección-juego «La salida a bolsa» (`n1-u2-l6`)

Motor: `src/engine/games/ipo-book.ts`. Interfaz: `src/features/games/IpoGame.tsx`. Textos: `es.json` → `ipo`.

## Reglas
- Antes de 2021: la familia tiene 9.000.000 de acciones. La oferta es una OPS de 3.000.000 (el dinero va a Naranjas) y una OPV de 1.200.000 (el dinero va a la familia). Después hay 12.000.000 de acciones.
- Rango: de 9,00 a 10,50 €, en pasos de 0,25. La demanda baja en línea recta y va en múltiplos de 50.000 acciones.
- Veces cubierta = demanda ÷ 4.200.000. Si es menor que 1, la oferta no se cubre y hay que elegir otro precio.
- Cierre del primer día = valor × (1 + 0,015 × (mín.(veces cubierta, 6) − 2)), un supuesto del juego que se dice en pantalla.

## Escenarios
- **En el folleto** se ven la OPS, la OPV, el rango y las acciones después; se aclara que la CNMV aprueba el folleto pero no garantiza la inversión.
- **En el libro de demanda**, cada precio tiene una barra de demanda (verde si cubre la oferta, roja si no) con la marca de la oferta y las veces cubierta; al elegir un precio se ve en directo cuánto recibirían Naranjas y la familia.
- **Si la oferta no se cubre**, se explica y se pide otro precio.
- **En el estreno**, se forma la vela desde el precio de salida, con la variación (▲▼ y signo) y el motivo, y se recuerda que desde ese día el dinero va de inversor a inversor.

## Verificación
`ipo-book.test.ts`, `tests/ipo-game.test.tsx`, `e2e/leccion-juego.spec.ts` (axe y 375 px en cada paso), `e2e/n1u2.spec.ts` (la unidad entera) y `content:validate` con las partidas de todos los precios que cubren la oferta.
