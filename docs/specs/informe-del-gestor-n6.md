# Spec: lección-juego «El informe del gestor» de N6 (`fund-report`, unidad `n6-u1`)

Motor: `src/engine/games/fund-report.ts`. Interfaz: `src/features/games/FundReportGame.tsx` (con `AskStep` y un gráfico SVG del valor liquidativo, con descripción). Textos: `es.json` → `fundReportGame`. Explicador de la unidad: `Drawdown` (nuevo, en l5). Ficha: las dos fichas de N6 de JUEGOS.md van a otras unidades («Gestor por un año» a la de asset allocation y «Máquina del tiempo» a la de riesgo extremo), así que este es un juego sencillo de cuatro pasos.

## Reglas
- El año de un fondo ficticio: doce rentabilidades mensuales enteras, una aportación en enero y otra en julio, y un tipo sin riesgo.
- **Paso 1 (TWR):** (1 + primer semestre) × (1 + segundo semestre) − 1, con los semestres redondeados como se muestran. Semilla 0: 13,64 % y −3,23 %: 9,97 %. Distractores: la suma (10,41 %) y la media (5,21 %).
- **Paso 2 (MWR):** TIR anual del cliente (10.000 € en enero y 10.000 € en julio; valor final de 20.673,94 €), resuelta por bisección: 4,51 %. Distractores: la TWR (9,97 %) y la ganancia sobre lo aportado (3,37 %).
- **Paso 3 (drawdown):** la mayor caída desde un máximo del valor liquidativo: 7,89 %. Distractores: la caída desde el máximo hasta el final (3,23 %) y el peor mes (5 %).
- **Paso 4 (Sharpe):** (TWR − tipo sin riesgo) / volatilidad anual (desviación típica mensual con n − 1, × √12): (9,97 − 2) / 9,91 = 0,80. Distractores: sin restar el tipo sin riesgo (1,01) y con la volatilidad mensual (2,79).
- La semilla sortea las rentabilidades mensuales (−5 a +7 %), las aportaciones y el tipo sin riesgo, y repite el sorteo hasta que el primer semestre es positivo, el segundo peor que el primero (así la MWR del cliente queda siempre por debajo de la TWR) y las tres opciones de cada paso se distinguen (comprobado en 10.000 semillas).
- Nota: un cuarto por paso.
- Cifras para la lección (`reportValues`): `h1`, `h2`, `twr`, `start`, `added`, `end_value`, `mwr`, `roi`, `max_dd`, `worst_month`, `vol_m`, `vol`, `rf`, `sharpe` y `hits`.
- Peor caso (`worst-seeds.ts`): semilla 63, 50.000 € más 20.000 € en julio, año negativo (−2,69 %) y Sharpe negativo.

## Verificación
`fund-report.test.ts`, `tests/fund-report-game.test.tsx`, la rama `fund-report` de `e2e/play-game.ts`, `e2e/leccion-juego.spec.ts` («el informe del gestor de N6»), `e2e/peor-caso-juegos.spec.ts` (`n6/u1/l1`) y `e2e/n6u1.spec.ts`.
