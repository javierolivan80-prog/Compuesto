# Spec: lección-juego «Stress test» (`stress-test`, unidad `n4-u5`)

Motor: `src/engine/games/stress-test.ts`. Interfaz: `src/features/games/StressGame.tsx` (con `AskStep`). Textos: `es.json` → `stressGame`. Explicador de la unidad: `Cet1Cushion`. Ficha de partida: JUEGOS.md, juego 12.

## Reglas
- Albufera Partners, que es un banco de inversión, asesora a **Banca Malvarrosa**, un banco comercial ficticio, en plena crisis. Cifras en millones de €. La ficha de JUEGOS.md («diriges Albufera Partners») se adapta así porque Albufera no capta depósitos ni da préstamos.
- **Paso 1 (margen de intereses):** préstamos × tipo − depósitos × tipo. Semilla 0: 20.000 × 4 % − 18.000 × 1 % = 620. Distractores: 600 (el diferencial por los préstamos) y 800 (solo lo cobrado).
- **Paso 2 (ratio CET1):** APR = hipotecas × 35 % + empresas × 100 % (ponderaciones simplificadas del método estándar); CET1 / APR con 1 decimal. Semilla 0: 12.000 × 35 % + 8.000 = 12.200 de APR; 1.600 / 12.200 = 13,1 %. Distractores: 8,0 % (sobre los préstamos sin ponderar) y 10,8 % (ponderaciones al revés). Las hipotecas son el 60 o el 70 % de los préstamos, nunca el 50 %, para que las ponderaciones al revés den otro resultado.
- **Paso 3 (escenario adverso):** (CET1 − pérdidas) / (APR × (1 + subida)). Semilla 0: 1.100 / 13.420 = 8,2 %. Distractores: 9,0 % (sin subir los APR) y 11,9 % (sin restar las pérdidas). La explicación lo compara con el 7 % (4,5 % de pilar 1 + 2,5 % de colchón de conservación); las semillas incluyen bancos que se quedan por debajo.
- **Paso 4 (LCR):** activos líquidos / (salidas − entradas a 30 días). Semilla 0: 3.000 / 1.800 = 166,7 %. Distractores: 125,0 % (sin restar las entradas) y 60,0 % (el cociente al revés). El LCR siempre supera el 100 %.
- Rangos: préstamos de 16.000 a 24.000; CET1 del 12 al 15 % de los APR; pérdidas del 2 al 5 % de los APR; subida de los APR del 5, 10 o 15 %.
- Nota: un cuarto por paso.
- Cifras para la lección (`stressValues`): `loans`, `deposits`, `r_loans`, `r_deposits`, `nii`, `mortgages`, `corporates`, `apr`, `cet1`, `cet1_ratio`, `losses`, `apr_rise`, `stressed_ratio`, `hqla`, `outflows`, `inflows`, `lcr` y `hits`.
- Peor caso (`worst-seeds.ts`): semilla 244, préstamos de 24.000 y un CET1 estresado del 6,9 %.

## Verificación
`stress-test.test.ts`, `tests/stress-game.test.tsx`, la rama `stress-test` de `e2e/play-game.ts`, `e2e/leccion-juego.spec.ts` («stress test»), `e2e/peor-caso-juegos.spec.ts` (`n4/u5/l1`) y `e2e/n4u5.spec.ts`.
