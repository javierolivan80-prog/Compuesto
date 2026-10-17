---
name: crear-unidad
description: Flujo completo para crear una unidad de contenido educativo de Compuesto (una por conversación): generar en draft, validar, revisar con subagente, dejar en reviewed. Usa las skills de nicho que tocan según el tipo de unidad. Úsala cuando se pida crear o ampliar una unidad, lección o ejercicios.
---

# Crear una unidad de contenido

Fuente: `docs/TEMARIO.md` (esquema §7, calidad §8, bibliografía §3b) y `CLAUDE.md` §8–§9. **Una unidad por conversación.** Manda `EXECUTION.md`.

**Regla de oro:** ninguna skill es fuente. Lo que propongan se contrasta con la bibliografía de TEMARIO §3b y con fuentes oficiales españolas (PGC, NIIF-UE, CNMV, Banco de España, BCE, AEAT, BOE) y va a `sources`. Las skills de financial-services piensan en EE. UU. (GAAP, SEC, 10-K): se traduce a PGC/NIIF, CNMV y LIS.

## Pasos

1. **Diseño inverso** con `backwards-design-unit-planner` y `kud-knowledge-type-mapper`: qué debe saber hacer Javier al cerrar la unidad (el Jefe final), y desde ahí las lecciones. Lee en TEMARIO la unidad, el mapa de conceptos y el esquema JSON; confirma que los conceptos previos existen.
2. **Elige las skills de dominio** en la tabla de abajo y léelas antes de escribir. Si la unidad construye un modelo, usa primero `modelo-referencia`: los ejercicios salen del JSON de `/content/shared/models/`, nunca de cifras nuevas.
3. **Genera en `draft`** en `/content/es/levels/...` o `/content/es/tracks/...`: 6–10 ejercicios por lección, mezcla de TEMARIO §6 y Bloom de CLAUDE.md §8, empresas ficticias (reales solo en `document_read` e históricas), IDs inmutables, textos en `es`. Fiscalidad y normativa con fuente oficial y fecha (`sources`, `verificarAntesDe`). Skills pedagógicas por tipo de ejercicio:

   | Ejercicio | Skill |
   |---|---|
   | Teoría (≤ 60 palabras, ≤ 3 tarjetas) | `cognitive-load-analyser`, `dual-coding-designer` (con el explicador) |
   | Preguntas de recuperación y test de salto | `retrieval-practice-generator` |
   | Cálculo: resuelto → guiado → libre | `worked-example-fading-designer`, `practice-problem-sequence-designer` |
   | `hint` | `adaptive-hint-sequence-designer` (pistas en cascada que no dan la respuesta) |
   | `spot_the_error` | `erroneous-example-designer` |
   | `self_explain`, `best_argument` | `self-explanation-prompt-designer`, `elaborative-interrogation-generator`, `criterion-referenced-rubric-generator` |
   | Mezcla con unidades anteriores | `interleaving-unit-planner` |
   | Jefe final y Comité | `assessment-validity-checker` |

4. Ejecuta `npm run content:validate` y `npm run content:check`; corrige hasta que pasen. Cada `numeric_input` lleva `formula` y su test.
5. Usa la skill `revisar-unidad` (subagente `revisor-financiero`) y aplica sus cambios.
6. Deja `status: "reviewed"`. **Nunca `published`**: eso lo decide Javier tras su revisión (🛑). Anótalo en `CONTENIDO-QA.md`.
7. Informe según `EXECUTION.md` §6.

## Tipo de unidad → skills de dominio

Dónde están: las skills de `.claude/skills/` se cargan con la herramienta Skill. Los plugins (financial-services, knowledge-work `finance`, claude-tutor) son de usuario y pueden faltar en una sesión en la nube: entonces se leen sus `SKILL.md` en `~/.compuesto-skills-src/` (commits fijados en `DECISIONES.md`). Los comandos de ai-berkshire (`.claude/commands/`, en chino) se usan como marco de análisis: no se ejecutan sus pasos de búsqueda ni sus `tools/`. GAJETOso y andreworia solo se leen desde `~/.compuesto-skills-src/`.

| Tipo de unidad | Niveles / ramas | Skills de dominio | Contrastar con |
|---|---|---|---|
| Valor temporal, interés, préstamos | N0, 🧮 de N1–N3 | `time-value-of-money`, `return-calculations` | Berk y DeMarzo; Banco de España (TAE) |
| Mercados, órdenes, microestructura, trading | N1, N5, Mercados | `position-sizer`, `backtest-expert`, `risk-management` | CNMV, BME, Bodie-Kane-Marcus |
| Renta fija y crédito | N2, Mercados, IB 10 | `fixed-income-sovereign`, `fixed-income-corporate`, `fixed-income-structured` (JoelLewis); `fixed-income` de agiprolabs solo como apoyo (STUB) | Fabozzi; Tesoro Público; Banco de España |
| Contabilidad y estados financieros | N3, IB 1 y 5 | knowledge-work `finance` (`financial-statements`, `journal-entry`), `financial-analyst`, `3-statement-model`; consulta: GAJETOso `lease-accounting`, `deferred-tax`, `corporate-consolidation`, `revenue-recognition` | PGC (RD 1514/2007), NIIF-UE, ICAC; Penman |
| Valoración (DCF, múltiplos, SOTP) | N3, IB 2–4, ER 3 | `modelo-referencia`, `dcf-model`, `comps-analysis`, `creating-financial-models`; consulta: andreworia `valuation-triangulator`, `trading-comps-builder`, `precedent-transaction-screener` | Rosenbaum y Pearl; Koller; Damodaran |
| Macro, banca, supervisión | N4, Banca y riesgos | `scenario-analyzer`, `statsmodels`; consulta: GAJETOso `banking-compliance` (Basilea), `ecl-computation` (IFRS 9), `credit-analysis` | BCE, Banco de España (Memoria de Supervisión, IEF), EBA, CRR/CRD |
| Carteras, riesgo, estadística | N6, Fintech | `asset-allocation`, `rebalancing`, `performance-attribution`, `historical-risk`, `forward-risk`, `portfolio-analytics`, `correlation-analysis`, `statistics-fundamentals`, `statistical-analysis`, `statsmodels`, `aeon` | Bodie-Kane-Marcus; CFA Institute |
| Derivados | N7, Mercados | `options-strategy-advisor`, `volatility-modeling`; `options-pricing` solo como apoyo (STUB) | Hull; MEFF/BME |
| M&A, LBO, merger | N8, IB 6–7, PE | `modelo-referencia`, `merger-model`, `lbo-model`, `returns-analysis`; consulta: andreworia `accretion-dilution-tester`, `lbo-returns-analysis` | Rosenbaum y Pearl; NIIF 3; LIS arts. 16 y 29 |
| Proceso de venta, ECM, DCM | IB 8–10 | `teaser`, `cim-builder`, `buyer-list`, `process-letter`, `datapack-builder`, `strip-profile`, `pitch-deck`; consulta: andreworia `cim-red-flag-reviewer` | CNMV (folletos, OPAs: RD 1066/2007), BME |
| Reestructuraciones | IB 11 | consulta: GAJETOso `debt-restructuring` | TRLC (reforma Ley 16/2022) |
| Equity research y buy-side | ER 1–8 | `initiating-coverage`, `earnings-analysis`, `earnings-preview`, `model-update`, `sector-overview`, `thesis-tracker`, `catalyst-calendar`, `idea-generation`, `stock-analysis`; marco ai-berkshire: `/investment-research`, `/investment-checklist`, `/quality-screen`, `/thesis-tracker` | Graham, Greenwald, Marks; Penman |
| Hedge funds, cortos, atribución | ER 9–10, Mercados | `performance-attribution`, `backtest-expert`, `correlation-analysis` | Bodie-Kane-Marcus; ESMA (ventas en corto) |
| Private equity | PE 1–6, 8 | `deal-sourcing`, `deal-screening`, `dd-checklist`, `dd-meeting-prep`, `ic-memo`, `value-creation-plan`, `portfolio-monitoring`, `returns-analysis`; consulta: andreworia `ic-memo-drafting` | Rosenbaum y Pearl; Invest Europe; CNMV (ECR) |
| Venture capital | PE 7 | `unit-economics`; consulta: andreworia `priced-round-dilution`, GAJETOso `startup-valuation`, `venture-debt` | CNMV (ECR, Ley 22/2014); Ley de Startups |
| Fintech y cuantitativo | Fintech | `statsmodels`, `aeon`, `backtest-expert`, `statistical-analysis` | BCE (euro digital), MiCA, PSD2 |
| Historia, regulación, ética, fiscalidad | N9, 🏛 de todos | consulta: GAJETOso `forensic-accounting`, `banking-compliance` | CNMV, ESMA, MiFID II, AEAT, BOE |
