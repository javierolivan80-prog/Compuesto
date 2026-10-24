# Spec: lección-juego «La mesa de divisas» (`fx-desk`, unidad `n4-u4`)

Motor: `src/engine/games/fx-desk.ts`. Interfaz: `src/features/games/FxDeskGame.tsx` (con `AskStep`). Textos: `es.json` → `fxDeskGame`. Explicador de la unidad: `FxParity`.

## Reglas
- Un día en la mesa de divisas de Albufera Partners, con países y divisas ficticios. Convención: EUR/USD = dólares por euro.
- **Paso 1 (balanza de pagos):** cuenta corriente = exportaciones − importaciones de bienes y servicios + rentas netas (primarias y secundarias). Semilla 0: 320 − 300 − 8 = +12 (superávit), en miles de millones de €. Distractores: 20 (sin las rentas) y −12 (signo cambiado). El saldo comercial (±12 o ±20) y las rentas (−9, −6, −3, 4 o 7) se sortean para que las tres opciones nunca coincidan.
- **Paso 2 (paridad cubierta):** forward a un año = contado × (1 + i$) / (1 + i€), con 4 decimales. Semilla 0: 1,10 × 1,04 / 1,02 = 1,1216. Distractores: 1,0788 (tipos al revés) y 1,1000 (el contado). Los tipos nunca coinciden: i€ de 1,5 a 2,5 % e i$ de 3 a 4,5 %, así que el forward siempre cotiza por encima del contado.
- **Paso 3 (carry trade):** rentabilidad ≈ tipo de inversión − tipo de financiación − depreciación de la divisa de inversión. Semilla 0: 10 − 2 − 10,5 = −2,5 %. Distractores: 8 % (sin la depreciación) y 18,5 % (sumándola). La depreciación (4,5, 7,5, 10,5 o 13,5 %) nunca deja el resultado en cero.
- **Paso 4 (emergentes):** con la Fed subiendo y el dólar al alza, el país más vulnerable a una parada súbita es el que tiene a la vez más déficit por cuenta corriente (−4,5 a −6,5 % del PIB) y más deuda en dólares (35 a 55 %). El otro tiene −1 a +1,5 % y 8 a 18 %. Opciones fijas: país A, país B, los dos por igual. Semilla 0: el B.
- Las semillas 0–80 cubren superávit y déficit, carry con ganancia y con pérdida, y los dos países.
- Nota: un cuarto por paso.
- Cifras para la lección (`fxDeskValues`): `exports`, `imports`, `trade_balance`, `income`, `current_account`, `spot`, `i_eur`, `i_usd`, `forward`, `i_high`, `i_fund`, `depreciation`, `carry` y `hits`.
- Peor caso (`worst-seeds.ts`): semilla 203, exportaciones de 340 con déficit corriente de 18 y EUR/USD a 1,12.

## Verificación
`fx-desk.test.ts`, `tests/fx-desk-game.test.tsx`, la rama `fx-desk` de `e2e/play-game.ts`, `e2e/leccion-juego.spec.ts` («la mesa de divisas»), `e2e/peor-caso-juegos.spec.ts` (`n4/u4/l1`) y `e2e/n4u4.spec.ts`.
