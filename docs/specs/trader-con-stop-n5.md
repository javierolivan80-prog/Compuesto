# Spec: lección-juego «El trader con stop» de N5 (`stop-trade`, unidad `n5-u6`)

Motor: `src/engine/games/stop-trade.ts`, que reutiliza `impulsive.ts` («El trader impulsivo», ficha 11 de JUEGOS.md) sin duplicarlo: importa su mercado (`impulsiveMarket`, 30 sesiones con noticias que persiguen al precio), su número de sesiones y su capital inicial. Interfaz: `src/features/games/StopTradeGame.tsx` (con `AskStep` y un gráfico SVG con descripción). Textos: `es.json` → `stopTradeGame`. Explicador de la unidad: `PositionSizing` (catálogo, nivel 5; en l2).

## Reglas
- Es la variante de lección de la ficha 11. En vez de operar por impulso, se planifica una operación en el mismo mercado.
- **Paso 1 (tamaño):** acciones = (capital × riesgo %) / (entrada − stop), redondeado hacia abajo. Semilla 0: 10.000 €, 1 %, entrada 20 € y stop 19 €: 100 acciones. Distractores: 5 (riesgo / precio, sin el stop) y 500 (todo el capital).
- **Paso 2 (riesgo/beneficio):** objetivo a k veces la distancia al stop; acierto mínimo 1 / (1 + k). Semilla 0: 1:2, 33,3 %. Distractores: 1 / k y k / (1 + k).
- **Paso 3 (30 sesiones):** el precio sigue el índice del mercado de El trader impulsivo escalado a la entrada. Sale en el stop, en el objetivo (lo que toque antes) o al cierre de la sesión 30. Semilla 0: no toca ninguno; cierre a 20,24 €: +24 €. Distractores: los otros dos finales.
- **Paso 4 (tentación):** en la sesión de precio más bajo antes de salir, con la noticia de ese día: mantener el stop (bien), bajarlo para «darle aire» (aversión a la pérdida) o promediar a la baja.
- La semilla sortea la entrada (10 a 40 €), el riesgo (1 o 2 %), el stop (2, 4, 5 u 8 %) y la relación (1:1,5, 1:2 o 1:3); las opciones son distintas en 10.000 semillas y salen los tres finales.
- `START_VALUE` se lee al llamar a las funciones, no al cargar el módulo: hay un ciclo de importaciones (esquema del contenido → motores → datos de los juegos → esquema). Por eso `LESSON_GAMES` vive ahora en `lesson-game-kinds.ts`, sin dependencias.
- Nota: un cuarto por paso.
- Cifras para la lección (`stopValues`): `capital`, `risk_pct`, `risk_eur`, `entry`, `stop_pct`, `stop`, `rr`, `target`, `shares`, `position`, `breakeven`, `outcome` (0 stop, 1 objetivo, 2 cierre), `exit_day`, `exit_price`, `result` y `hits`.
- Peor caso (`worst-seeds.ts`): semilla 22, 125 acciones con un stop del 4 % y −38,75 € al cierre.

## Verificación
`stop-trade.test.ts`, `tests/stop-trade-game.test.tsx`, la rama `stop-trade` de `e2e/play-game.ts`, `e2e/leccion-juego.spec.ts` («el trader con stop de N5»), `e2e/peor-caso-juegos.spec.ts` (`n5/u6/l1`) y `e2e/n5u6.spec.ts`.
