# Spec: lección-juego «¿Quién es quién?» (`n3-u3-l1`)

Motor: `src/engine/games/ratio-detective.ts`. Interfaz: `src/features/games/RatioGame.tsx`. Textos: `es.json` → `ratioGame`.

## Reglas
- Cinco empresas del universo sin nombre (tarjetas A–E): Naranjas del Turia, Pirineo Energía, Mediterránea de Navieras, Albufera Partners y Tramuntana Retail. La semilla elige el año (2021–2025) y el orden. Los ratios salen de `companies.json`.
- De salida se ven tres ratios: margen de explotación, rotación del activo y días de existencias. Se pueden pedir, en orden: días de cobro, deuda / patrimonio neto, inmovilizado / activo, flujo de explotación / beneficio y ROE. Cada ratio pedido aparece en las cinco tarjetas.
- Asignas una empresa a cada tarjeta (sin repetir) y compruebas una sola vez.
- Nota: aciertos / 5 − 0,04 por ratio pedido, sin bajar de 0.
- Tras comprobar, cada tarjeta dice quién era y qué ratio la delata.
- El resumen muestra el árbol DuPont de Naranjas y Tramuntana de ese año.

## Verificación
`ratio-detective.test.ts` (un test comprueba que las cinco se distinguen cada año con los tres ratios de salida), `tests/ratio-game.test.tsx`, `e2e/leccion-juego.spec.ts`, `e2e/peor-caso-juegos.spec.ts`, `e2e/n3u3.spec.ts` y `content:validate`.
