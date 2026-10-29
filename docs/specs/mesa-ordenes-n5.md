# Spec: lección-juego «Mesa de órdenes» de N5 (`order-desk`, unidad `n5-u1`)

Motor: `src/engine/games/order-desk.ts`. Interfaz: `src/features/games/OrderDeskGame.tsx` (con `AskStep`). Textos: `es.json` → `orderDeskGame`. Explicador de la unidad: `MarketImpact`. Ficha: JUEGOS.md, juego 3 («Mesa de órdenes», niveles 1 y 5), en su versión de N5.

## Reglas
- Parte de lo que enseñan n1-u4 y su juego «La compra grande» (horquilla, precio medio barriendo el libro, impacto frente al punto medio, trocear) y va un paso más allá: la horquilla efectiva y la realizada, la selección adversa, los dark pools y la reacción del market maker. Acción ficticia; los precios se calculan en céntimos.
- **Paso 1 (horquilla efectiva):** 2 × (precio ejecutado − punto medio) / punto medio, en pb. Semilla 0: punto medio 10,00 €, horquilla 9,98–10,02 €, compras a 10,03 €: 60,0 pb. Distractores: 40,0 pb (la cotizada) y 30,0 pb (sin el 2 ×).
- **Paso 2 (horquilla realizada):** un market maker vende al ask y el punto medio sube 5 minutos después; realizada = 2 × (ask − punto medio a 5 minutos) / punto medio inicial. Semilla 0: punto medio a 5 minutos de 10,015 €, realizada de 10,0 pb. Distractores: 40,0 pb (lo que cobró, su efectiva) y 30,0 pb (el impacto en el precio, la selección adversa). Realizada + impacto en el precio = efectiva. Hay semillas con realizada negativa.
- **Paso 3 (dark pool):** cruzar un bloque al punto medio en vez de barrer el libro visible ahorra cantidad × (precio medio barriendo − punto medio). Semilla 0: 20.000 × (10,06 − 10,00) = 1.200 €. Distractores: 800 € (frente al ask) y 400 € (solo la media horquilla).
- **Paso 4 (market maker):** con flujo informado (órdenes grandes en un sentido tras una noticia) ensancha la horquilla; con flujo equilibrado de minoristas, la mantiene. Opciones fijas: ensanchar, mantener y estrechar.
- La semilla sortea punto medio (8 a 20 €), media horquilla (1 a 3 céntimos), barrido, deriva y bloque, siempre de forma que ninguna opción coincida con otra; comprobado en 10.000 semillas.
- Nota: un cuarto por paso.
- Cifras para la lección (`deskValues`): `mid`, `half_c` (media horquilla en céntimos), `bid`, `ask`, `fill`, `quoted_bp`, `effective_bp`, `mid5`, `realized_bp`, `impact_bp`, `qty`, `lit_avg`, `saving`, `informed` y `hits`.
- Peor caso (`worst-seeds.ts`): semilla 96, acción a 15 €, bloque de 50.000 y realizada negativa.

## Verificación
`order-desk.test.ts`, `tests/order-desk-game.test.tsx`, la rama `order-desk` de `e2e/play-game.ts`, `e2e/leccion-juego.spec.ts` («mesa de órdenes de N5»), `e2e/peor-caso-juegos.spec.ts` (`n5/u1/l1`) y `e2e/n5u1.spec.ts`.
