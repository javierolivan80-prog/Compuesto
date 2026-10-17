---
name: modelo-referencia
description: Genera o actualiza un modelo de referencia (3 estados, DCF, LBO, merger model, comps) de una empresa ficticia de companies.json y lo guarda como JSON en /content/shared/models/ con tests que comprueban que cuadra. Es la «respuesta oficial» con la que se crean y corrigen los ejercicios del Modelo por piezas (TEMARIO §3). Úsala al preparar una unidad Pro que construya un modelo o cuando cambien las cuentas de una empresa del universo.
---

# Modelo de referencia

Fuentes: `docs/TEMARIO.md` §3 y §3b, `CLAUDE.md` §9. Manda `EXECUTION.md`. Coste 0 €: sin APIs ni datos de mercado en ejecución.

## Qué hay ya

| Pieza | Dónde |
|---|---|
| Motor puro (3 estados, WACC, FCFF, DCF Gordon y múltiplo, Monte Carlo con semilla, LBO, merger) | `src/engine/models.ts` + `models.test.ts` |
| Hipótesis, justificación y fuentes de Naranjas del Turia | `src/content/reference-models.ts` |
| Generador | `npm run models:build` → `/content/shared/models/<empresa>-<tipo>.json` |
| Tests de cuadre sobre el JSON | `src/content/models.test.ts` |

## Pasos

1. **Lee la skill profesional del modelo** antes de tocar nada. Si los plugins no están en la sesión, léelas en `~/.compuesto-skills-src/financial-services/plugins/vertical-plugins/` (commit `574ed36`, ver `DECISIONES.md`):
   - 3 estados → `financial-analysis/skills/3-statement-model` (comprobaciones de su §«Core Linkages»).
   - DCF → `financial-analysis/skills/dcf-model` + `.claude/skills/creating-financial-models` (sensibilidad, Monte Carlo).
   - LBO → `financial-analysis/skills/lbo-model` + `private-equity/skills/returns-analysis`.
   - Merger → `investment-banking/skills/merger-model`.
   - Comps → `financial-analysis/skills/comps-analysis`.
   Sus instrucciones de Excel (colores, openpyxl, plantillas) no aplican: aquí el modelo es JSON + tests. Sí aplican sus comprobaciones y convenciones.
2. **Parte de `companies.json`** (último año real) y no inventes datos históricos. Si la empresa necesita cuentas nuevas, se añaden a `companies.json` y pasan `checkCompany`.
3. **Hipótesis** en `reference-models.ts`, cada una con su `rationale` (de qué ratio histórica sale) y, si es dato de mercado (tipo libre de riesgo, prima de riesgo, beta, cotización), marcada como hipótesis didáctica con fuente para verificar y `verificarAntesDe`.
4. **Convenciones fijas**
   - Miles de €; partidas redondeadas a entero y totales derivados, para que las identidades cuadren al euro.
   - Intereses sobre saldo inicial (sin circularidad); se dice en `notes`.
   - DCF: FCFF, mitad de año, Gordon descontado a N − 0,5 y múltiplo a N (Rosenbaum y Pearl, cap. 3); se guardan el múltiplo implícito y el crecimiento implícito.
   - Sensibilidades 5×5 con el caso base en el centro (lo exige `lbo-model`/`dcf-model` y lo comprueba el test).
   - España: impuesto de sociedades 25 % (art. 29 LIS), límite de gastos financieros del 30 % con 1 M€ mínimo (art. 16 LIS), NIIF 3 para PPA y fondo de comercio.
   - Monte Carlo con `mulberry32` y semilla guardada: el resultado es reproducible.
   - Compradores, fondos y bancos del modelo son ficticios, con `pendienteVerificarCNMV: true` hasta comprobarlos.
5. **Genera** con `npm run models:build` y **comprueba**: `npx vitest run src/engine/models.test.ts src/content/models.test.ts`. Cada modelo nuevo añade su bloque de tests al menos con: balance y caja (3 estados), WACC/EV/precio recalculados (DCF), fuentes = usos, calendario de deuda, TIR por un método distinto al del motor y puente de valor (LBO), PPA y acreción/dilución partida a partida (merger).
6. **Estado `draft`.** Pasa por el subagente `revisor-financiero` (como una unidad) y después 🛑 por Javier. Claude nunca lo marca `published`. Si cambia un modelo ya usado por ejercicios, sube `version` y avisa de qué ejercicios regenerar.
7. **Informe** según `EXECUTION.md` §6, pegando la salida real de los tests.

## Cómo lo usan las unidades Pro

Cada lección del Modelo por piezas toma del JSON el estado de partida y la respuesta de su paso (p. ej. la fila FCFF de 2026 para un `spreadsheet`, la TIR para un `numeric_input` con `formula`). Ningún ejercicio recalcula con cifras distintas a las del modelo.
