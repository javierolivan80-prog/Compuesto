# Spec: lección-juego «La subasta de apertura» (`n1-u4-l8`)

Motor: `src/engine/games/opening-auction.ts`. Interfaz: `src/features/games/AuctionGame.tsx`. Textos: `es.json` → `auction`.

## Reglas
- Tu cliente quiere 500 acciones de Naranjas del Turia. Ayer cerró entre 9,00 y 9,49 €. Por buenas noticias, el indicativo de las 8:30 está entre un 1 % y un 2,5 % por encima.
- A las 8:59 entra una orden de 800 acciones, de compra o de venta según la semilla, con límite a 6 céntimos del punto de partida.
- Tu orden puede ser a mercado o limitada, con un límite entre el indicativo − 3 y + 3 céntimos. Se puede cambiar a las 8:59.
- Fijación del precio y prioridad: ver DECISIONES.md (18/10/2026).
- Lo que no compras en la subasta lo compras en el continuo a la apertura + 0,05 €.

## Escenarios
- **Dado** el libro de las 8:30, **cuando** eliges un tipo de orden o un límite, **entonces** la tabla y el indicativo se recalculan con tu orden y dicen cuántas comprarías.
- **Cuando** envías la orden, **entonces** son las 8:59, entra la orden grande, el tablero se sacude y el texto avisa de que, si cambias la orden, pierdes tu sitio en la cola.
- **Cuando** confirmas, **entonces** se ve el cierre aleatorio (instantáneo con reduced-motion), suena la campana y aparece el resultado: precio de apertura, variación con signo y flecha, compradas en la subasta y en el continuo, y total.
- A mercado compras siempre las 500 (comprobado con 40 semillas). Con el límite más bajo, ninguna.

## Verificación
`opening-auction.test.ts`, `tests/auction-game.test.tsx`, `e2e/leccion-juego.spec.ts` (axe y 375 px en las tres fases, y la lección entera), `e2e/n1u4.spec.ts` (la unidad entera) y `content:validate` con cuatro partidas de referencia.
