# Spec: lección-juego «El viaje del dólar» (`n2-u5-l1`)

Motor: `src/engine/games/fx-trip.ts`. Interfaz: `src/features/games/FxGame.tsx` (con `AskStep` del kit). Textos: `es.json` → `fxGame`. Explicador de la unidad: `FxEffect` (l2, nuevo en el catálogo).

## Reglas
- Se invierten 10.000 € en un ETF de bolsa estadounidense en dólares. Semilla 0: EUR/USD 1,10 al comprar y 1,20 un año después; ETF +10 % en dólares; coste de cobertura del 1,5 %.
- **Paso 1:** cuántos dólares se compran. Las opciones son 11.000 (la buena), 9.091 (dividir en vez de multiplicar) y 10.000 (no convertir).
- **Paso 2:** ¿se gana en euros más o menos que el ETF? Con el euro apreciado se gana menos: 10.083 €, un +0,83 %.
- **Paso 3:** con miedo a que el dólar se deprecie, la clase cubierta es la elección coherente (10.850 €, +8,5 %).
- **Simplificación declarada:** la clase cubierta da la subida del ETF menos el coste de cobertura, sin ningún efecto divisa residual.
- Las demás semillas sortean el EUR/USD inicial (1,05 · 1,10 · 1,15), su movimiento (−0,10 · +0,10 · +0,15), la subida del ETF y el coste de cobertura.
- Nota: un tercio por paso.

## Verificación
`fx-trip.test.ts`, `tests/fx-game.test.tsx`, `explainers.test.tsx` (FxEffect), `e2e/leccion-juego.spec.ts`, `e2e/peor-caso-juegos.spec.ts`, `e2e/n2u5.spec.ts` y `content:validate`.
