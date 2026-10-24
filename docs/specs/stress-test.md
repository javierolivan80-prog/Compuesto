# Spec: lección-juego «Stress test» (`stress-test`, unidad `n4-u5`)

Motor: `src/engine/games/stress-test.ts`. Interfaz: `src/features/games/StressGame.tsx` (con `AskStep`). Textos: `es.json` → `stressGame`. Explicador de la unidad: `Cet1Cushion`. Ficha de partida: JUEGOS.md, juego 12.

## Reglas
- Albufera Partners, que es un banco de inversión, asesora a **Banca Malvarrosa**, un banco comercial ficticio, en plena crisis. Cifras en millones de €. La ficha de JUEGOS.md («diriges Albufera Partners») se adapta así porque Albufera no capta depósitos ni da préstamos.
- **Paso 1 (margen de intereses):** préstamos × tipo − depósitos × tipo. Semilla 0: 20.000 × 4 % − 18.000 × 1 % = 620. Distractores: 600 (el diferencial por los préstamos) y 800 (solo lo cobrado).
- **Paso 2 (ratio CET1):** APR = hipotecas × 35 % + empresas × 100 % (ponderaciones simplificadas del método estándar); CET1 / APR con 1 decimal. Semilla 0: 12.000 × 35 % + 8.000 = 12.200 de APR; 1.590 / 12.200 = 13,0 %. Distractores: 8,0 % (sobre los préstamos sin ponderar) y 10,7 % (ponderaciones al revés). Las hipotecas son el 60 o el 70 % de los préstamos, nunca el 50 %, para que las ponderaciones al revés den otro resultado.
- **Paso 3 (escenario adverso):** (CET1 − pérdidas) / (APR × (1 + subida)). Semilla 0: (1.590 − 490) / 13.420 = 8,2 %. Distractores: 9,0 % (sin subir los APR) y 11,8 % (sin restar las pérdidas). La explicación lo compara con el 7 % (4,5 % de pilar 1 + 2,5 % de colchón de conservación); las semillas incluyen bancos que se quedan por debajo.
- **Paso 4 (LCR):** activos líquidos / (salidas − entradas a 30 días). Semilla 0: 2.700 / 1.800 = 150,0 %. Distractores: 112,5 % (sin restar las entradas) y 66,7 % (el cociente al revés). El LCR siempre supera el 100 %.
- Rangos: préstamos de 16.000 a 24.000; CET1 = APR × 12, 13, 14 o 15 %; pérdidas = APR × 2,5, 3, 4 o 5 % (desde el 2,5 % para que ningún distractor coincida: comprobado en 10.000 semillas); activos líquidos = salidas netas × 1,1, 1,3, 1,5 o 1,8; los tres redondeados a decenas. Subida de los APR del 5, 10 o 15 %.
- Nota: un cuarto por paso.
- Cifras para la lección (`stressValues`): `loans`, `deposits`, `r_loans`, `r_deposits`, `nii`, `mortgages`, `corporates`, `apr`, `cet1`, `k_cet1`, `m_loss`, `k_hqla`, `cet1_ratio`, `losses`, `apr_rise`, `stressed_ratio`, `hqla`, `outflows`, `inflows`, `lcr` y `hits`.
- Peor caso (`worst-seeds.ts`): semilla 383, préstamos de 24.000 y un CET1 estresado del 6,1 %.

## Verificación
`stress-test.test.ts`, `tests/stress-game.test.tsx`, la rama `stress-test` de `e2e/play-game.ts`, `e2e/leccion-juego.spec.ts` («stress test»), `e2e/peor-caso-juegos.spec.ts` (`n4/u5/l1`) y `e2e/n4u5.spec.ts`.
