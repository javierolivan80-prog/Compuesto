# Spec: lección-juego «¿Ventaja real?» de N5 (`edge-test`, unidad `n5-u4`)

Motor: `src/engine/games/edge-test.ts`. Interfaz: `src/features/games/EdgeTestGame.tsx` (con `AskStep`). Textos: `es.json` → `edgeTestGame`. Explicador de la unidad: `ExpectedValue` (del catálogo de ANIMACIONES, nivel 5; se construye ahora, en l2). Ficha: ninguna de JUEGOS.md encaja (la 18, «La trampa del backtest», es de la rama Pro de Fintech y se reserva para ella), así que es un juego sencillo de cuatro pasos, como permite DECISIONES (N5, juegos de u2–u5).

## Reglas
- No repite n2-u4 («Riesgo y estadística», «¿Suerte o habilidad?»: media, desviación típica, normal, colas y rachas por azar). Parte de ahí: el becario rival lleva al comité una estrategia ficticia con su backtest.
- **Paso 1 (valor esperado):** acierto × ganancia media − fallo × pérdida media. Semilla 0: 55 %, 120 € y 100 €: 21 €. Distractores: 66 € (solo las ganancias) y 10 € ((ganancia − pérdida) / 2). Nunca da 0; hay semillas con valor esperado negativo.
- **Paso 2 (estadístico t):** Sharpe anual × √años. Semilla 0: 0,8 × √4 = 1,60, por debajo de 2. Distractores: 3,20 (× años) y 0,40 (/ √años). Nunca justo 2.
- **Paso 3 (multiple testing):** de N variantes sin ventaja, al 5 % salen «significativas» N × 0,05. Semilla 0: 40 → 2. Distractores: N × 0,5 y N × 0,01.
- **Paso 4 (Bayes):** s·b / (s·b + f·(1 − b)). Semilla 0: 10 % con ventaja, 80 % de detección, 20 % de falsos positivos: 30,8 %. Distractores: 80 % (la detección) y 8 % (s·b).
- La semilla sortea acierto (40 a 60 %), ganancia (80 a 150 €), pérdida (80 a 120 €), Sharpe (0,4 a 1,2), años (4, 9 o 16), variantes (20 a 100) y los datos de Bayes; las opciones son distintas en 10.000 semillas.
- Nota: un cuarto por paso.
- Cifras para la lección (`edgeValues`): `win_pct`, `avg_win`, `avg_loss`, `ev`, `sharpe`, `years`, `t_stat`, `significant`, `n_tests`, `false_pos`, `prior`, `sens`, `fpr`, `posterior` y `hits`.
- Peor caso (`worst-seeds.ts`): semilla 8, estrategia que pierde 28 € por operación, 16 años y 100 variantes.

## Verificación
`edge-test.test.ts`, `tests/edge-test-game.test.tsx`, la rama `edge-test` de `e2e/play-game.ts`, `e2e/leccion-juego.spec.ts` («¿ventaja real? de N5»), `e2e/peor-caso-juegos.spec.ts` (`n5/u4/l1`) y `e2e/n5u4.spec.ts`.
