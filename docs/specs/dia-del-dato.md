# Spec: lección-juego «El día del dato» (`n4-u1-l1`)

Motor: `src/engine/games/macro-day.ts`. Interfaz: `src/features/games/MacroGame.tsx` (con `AskStep`). Textos: `es.json` → `macroGame`. Explicador de la unidad: `DataSurprise` (l5, nuevo en el catálogo).

## Reglas
- Una mañana de calendario macro en una economía ficticia. Semilla 0: IPC de 112 a 115,6; consenso del 2,9 %; PMI de 48,5; 24 millones de activos y 2,76 millones de parados.
- **Paso 1:** inflación interanual = (115,6 / 112 − 1) × 100 = 3,2 %. Distractores: 3,6 (puntos del índice) y 3,1 (dividir entre el índice de hoy).
- **Paso 2:** sorpresa +0,3 frente al consenso: la rentabilidad del bono a 2 años sube. Opciones: sube, baja y «no se mueve».
- **Paso 3:** PMI por debajo de 50: contracción.
- **Paso 4:** tasa de paro = parados / activos = 11,5 %. Distractores: 13,0 (sobre ocupados) y 88,5 (empleo sobre activos).
- Las demás semillas sortean el índice de partida (104, 108, 112 o 118), la inflación (1,5–4,5 %), la sorpresa (±0,2 o ±0,3), el PMI (46,5, 48,5, 51,2 o 53) y el paro.
- Nota: un cuarto por paso.

## Verificación
`macro-day.test.ts`, `tests/macro-game.test.tsx`, `explainers.test.tsx` (DataSurprise), `e2e/leccion-juego.spec.ts`, `e2e/peor-caso-juegos.spec.ts`, `e2e/n4u1.spec.ts` y `content:validate`.
