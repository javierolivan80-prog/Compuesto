# Spec: lección-juego «La cartera de dos activos» de N6 (`two-assets`, unidad `n6-u2`)

Motor: `src/engine/games/two-assets.ts`. Interfaz: `src/features/games/TwoAssetsGame.tsx` (con `AskStep`). Textos: `es.json` → `twoAssetsGame`. Explicador de la unidad: `EfficientFrontier` (catálogo, nivel 6, en su versión de dos activos; en l3). Juego nuevo, como se decidió en la división de N6.

## Reglas
- Un fondo ficticio de acciones (A) y bonos (B), su cartera tangente y una acción de la cartera.
- **Paso 1 (volatilidad):** √(w²σA² + (1 − w)²σB² + 2w(1 − w)ρσAσB). Semilla 0: 60 % en A, σA 20 %, σB 8 %, ρ 0,2: 13,02 %. Distractores: 15,20 % (media ponderada, ρ = 1) y 12,42 % (sin covarianza, ρ = 0).
- **Paso 2 (mínima varianza):** peso en A = (σB² − ρσAσB) / (σA² + σB² − 2ρσAσB): 8,0 %. Distractores: 50,0 % y 28,6 % (volatilidad inversa).
- **Paso 3 (línea del mercado de capitales):** rf + (Rt − rf) / σt × σ*: 2 + 5 / 12 × 9 = 5,75 %. Distractores: 5,25 % (sin rf) y 8,67 % (cociente al revés). Hay semillas con una volatilidad objetivo del 20 %, por encima de la tangente, que exigen pedir prestado.
- **Paso 4 (alfa de Jensen):** β = ρ × σi / σm = 0,6 × 30 / 15 = 1,2; α = 12 − (2 + 1,2 × 6) = 2,80 %. Distractores: 6,40 % (usando ρ como beta) y 4,00 % (R − Rm).
- La semilla sortea volatilidades, correlaciones, pesos y rentabilidades, y repite el sorteo hasta que las opciones de cada paso se distinguen, el alfa no es cero y la mínima varianza tiene un peso entre 0 y 100 % (comprobado en 10.000 semillas). Un test comprueba que la mínima varianza tiene menos volatilidad que sus vecinas y que el activo menos volátil.
- Nota: un cuarto por paso.
- Cifras para la lección (`twoValues`): `s_a`, `s_b`, `rho`, `w_a`, `port_vol`, `avg_vol`, `min_var_w`, `rf`, `rt`, `st`, `target`, `cml`, `ri`, `rho_m`, `si`, `sm`, `rm`, `beta`, `alpha` y `hits`.
- Peor caso (`worst-seeds.ts`): semilla 4, correlación negativa, volatilidad objetivo del 20 % (con préstamo) y alfa negativo.

## Verificación
`two-assets.test.ts`, `tests/two-assets-game.test.tsx`, la rama `two-assets` de `e2e/play-game.ts`, `e2e/leccion-juego.spec.ts` («la cartera de dos activos de N6»), `e2e/peor-caso-juegos.spec.ts` (`n6/u2/l1`) y `e2e/n6u2.spec.ts`.
