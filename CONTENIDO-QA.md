# CONTENIDO-QA.md — Control de calidad del contenido

Flujo: docs/TEMARIO.md §8. Estados: `draft` → `reviewed` → `published` → (`retired`). **Claude nunca marca `published`.**

## Unidad n0-u1 · El dinero en el tiempo (5 lecciones, 41 ejercicios)

| Paso | Resultado |
|---|---|
| Generación | `draft`, 2026-10-15, solo tipos 1–8, empresa ficticia Naranjas del Turia |
| `content:validate` | 0 errores, 0 avisos (mezcla, 6–10 ejercicios, conceptos, ids, teoría ≤ 60 palabras, explicadores) |
| Subagente revisor, ronda 1 | `cambios_necesarios`: 4 mayores (l1-e8 fórmula no enseñada y aproximación también defendible; l3-e4 logaritmos en el nivel 0; l4-e5 valor actual sin ejemplo resuelto; l4-e8 pasos 1 y 2 intercambiables) y 7 menores |
| Correcciones | l1-e8 → multiple_choice; l3-e4 → potencia (1.000 × 1,06¹²); l4: ejemplo resuelto de valor actual en la intro y pasos fusionados; resto de menores aplicados |
| Subagente revisor, ronda 2 | `aprobada`: resolvió los 41 ejercicios a mano, una sola respuesta correcta en todos. 3 menores: tolerancias de l4-e4 y l2-e6 y concepto `inflacion` de l3 |
| Correcciones | tolerancias ajustadas a 0,1 % (el 0,01 % propuesto rechazaba la respuesta redondeada); `inflacion` añadido a l3 |
| Estado | **`reviewed`** (`reviewedBy: ["subagente"]`). Pendiente de revisión de Javier 🛑 |
| Horas de revisión humana | — (por registrar) |

### Notas para la revisión humana
- Contrasta cifras y redondeos con tus apuntes; cada ejercicio numérico lleva su `formula`, recalculada por un test.
- "Carmen" (dueña de Naranjas del Turia) es un personaje inventado: confirma el nombre o cámbialo (y compruébalo contra el registro de la CNMV, CLAUDE.md §8b).
- La fuente de l1 y l4 es la portada del INE (`https://www.ine.es/`): cita dónde mirar la inflación, no respalda ninguna cifra (los ejemplos son ficticios).

## Tests de salto N0–N1 (11 bancos × 8 preguntas = 88)

| Paso | Resultado |
|---|---|
| Generación | `draft`, 2026-10-15. Solo tipos de reconocer (test, verdadero/falso, selección múltiple); cada banco cubre **todos** los conceptos de su unidad (el validador lo exige) |
| `content:validate` | 0 errores (8 preguntas, ids con prefijo de unidad, conceptos de la unidad, wrongExplanations por opción, sin empresas reales) |
| Subagente revisor, ronda 1 | Las 88 respuestas eran correctas. `cambios_necesarios` en 5 unidades: 4 mayores (V/F del free float ambigua; V/F absoluta de la orden de mercado; explicación fiscal engañosa sobre actividad económica; multi_select subjetivo de "seguros básicos") y ~25 menores (opciones que delataban la respuesta, explicaciones vacías, fuentes genéricas) |
| Correcciones | Reformuladas las 4 mayores; igualadas longitudes de opciones; explicaciones específicas; fuentes con título de la norma; una pregunta nueva de `deuda-buena-mala` en n0-u3 |
| Subagente revisor, ronda 2 | `aprobada` en las 11 unidades, sin errores críticos ni mayores. 4 menores/opcionales: 2 wrongExplanations (aplicadas) y 2 redundancias de contenido en n0-u2 (q3 ≈ q2) y n0-u4 (q2 ≈ q1) que se dejan |
| Estado | **`reviewed`** (`reviewedBy: ["subagente"]`). Pendiente de tu revisión 🛑 antes de marcarlos `published` |

### Notas para la revisión humana
- Con 8 preguntas y umbral de 7, las verdadero/falso pesan mucho (50 % de acierto al azar). El revisor sugiere sustituir 1–2 por `numeric_input` donde haya cálculo (n0-u1, n1-u5): el esquema del test de salto hoy solo admite tipos 1–3.
- Fuentes: citan la norma por título y enlazan a la portada del organismo (AEAT, FGD, Seguridad Social); **conviene sustituir por el enlace concreto** (BOE) al publicar. `verificarAntesDe: 2027-10-15` en n0-u4, n0-u5 y n1-u5.
- Hechos de España a contrastar con tus apuntes: FGD 100.000 € por titular y entidad; intereses como rendimientos del capital mobiliario; venta de acciones como ganancia patrimonial; pensiones de reparto; BME / IBEX 35 / BME Growth.

## n0-u2 — TIN, TAE, préstamos e hipotecas (2026-10-15)
- 6 lecciones (TIN/TAE, préstamo y cuota, cuadro de amortización, hipoteca y Euríbor, alquilar o comprar, Jefe final) + 8 términos de glosario. Explicadores nuevos: `TinVsTae`, `LoanAmortization`. Cálculos en `engine/finance.ts` con tests; cada `numeric_input` lleva fórmula recalculada por el validador.
- **Ronda 1 (revisor):** 0 críticos, 2 mayores, 5 menores. Aceptados: supuestos de la lección 5 (acotados al primer mes, aviso de que no es comparación de caja y de lo que se excluye), tarjeta TIN, definición de Euríbor (EMMI), hiddenCase repetido, `companies` incoherente, categoría «Patrimonio (reduce tu deuda)». **Rechazado** el mayor sobre «2.545,63 €»: con cuota sin redondear los intereses sí son 2.545,63 € (469,70058×48−20.000); se dejó «unos 2.545 €» en la intro y la explicación aclara el redondeo.
- **Ronda 2:** aprobada, sin errores críticos ni mayores.
- Estado `reviewed`. **🛑 Pendiente: revisión de Javier** (contrastar con apuntes) antes de `published`. Fuentes: enlaces genéricos del Banco de España y EMMI (PROVISIONAL: sustituir por la página exacta).

## n0-u3 — Presupuesto, deuda y primeros pasos con Excel (2026-10-15)
- 6 lecciones (presupuesto, fondo de emergencia, deuda buena y mala, sesgo del presente, Excel: celdas y SUMA, Jefe final) + 8 términos de glosario. Reutiliza el explicador `CompoundCurve`. 3 ejercicios `spreadsheet` en L5 y 1 en L6 con casos ocultos.
- **Ronda 1:** 0 críticos, 9 mayores, 10 menores. Aceptados todos los de contenido: órdenes ambiguos (L1-e8, L3-e8), hoja de cálculo antes de enseñarla (L1), déficit sin introducir, mezcla TIN/TAE en la deuda, `fill_blank` con respuesta no única (liquidez), pautas sin fuente o presentadas como hechos (50/30/20, 3–6 meses, 24 % ilustrativo), sueldo poco realista (1.500 €), repetición L4/L6, id de glosario `liquidez` → `liquidez-general` (colisión futura con N1).
- **Ronda 2:** aprobada, 4 menores aplicados (concepto sobrante en L1, redacción de «=», fuentes de L4/L5, explicación del multi_select).
- Estado `reviewed`. **🛑 Pendiente: revisión de Javier.** PROVISIONAL: las fuentes (Finanzas para Todos, Warren y Tyagi 2005, soporte de Microsoft) están citadas pero no contrastadas con acceso a la página; confirmar que «3–6 meses» figura en material oficial o rebajar a «pauta habitual» sin fuente.

## n0-u4 — Bancos y depósitos (2026-10-15)
- 6 lecciones (qué hace un banco, creación de dinero, cuentas y depósitos, FGD, intereses e IRPF, Jefe final) + 6 términos de glosario. Explicador nuevo `MoneyCreation` (motor `depositChain`/`maxDeposits` con tests).
- **Ronda 1:** 0 críticos, 1 mayor, 8 menores. Aceptados todos. El mayor: el texto de transferencia de la L2 sugería que «los bancos crean dinero al prestar» era una simplificación; se reescribió (el crédito crea depósitos; el multiplicador de reservas es el modelo escolar; límites reales: solvencia, capital, liquidez, demanda). También: «entidades distintas» en vez de «grupos distintos» (FGD), ítem fuera de nivel (bonos), explicación de la base del ahorro, fuentes (BOE Ley 35/2006) y `verificarAntesDe`.
- **Ronda 2:** 1 mayor (tolerancia de l3-e5 aceptaba el TIN como respuesta) → tolerancia 0,3 %. Sin más errores.
- Estado `reviewed`. **🛑 Pendiente: revisión de Javier.** **PROVISIONAL / no verificado en vivo:** escala del IRPF (19/21/23 %), retención del 19 %, límite del FGD y 1 % del BCE se contrastaron con búsquedas web y con el revisor, no con las webs oficiales (no accesibles desde aquí); `verificarAntesDe` puesto (IRPF 2027-03-31, FGD/BCE 2027-10-15). **Pendiente de producto:** el ejercicio `document_read` (ficha precontractual de un depósito, 📄 del Nivel 0) no puede hacerse todavía porque el tipo no está implementado en la app; se hará cuando exista (Fase 2).

## n0-u5 — Seguros, pensiones y riesgo (2026-10-15)
- 6 lecciones (cómo funciona un seguro, qué asegurar, pensión pública, tres pilares, riesgo y rentabilidad, Jefe final) + 7 términos de glosario. Reutiliza `CompoundCurve` (ilustrativo, 4 % constante).
- **Ronda 1:** 0 críticos, 6 mayores, 7 menores. Aceptados todos: «pérdida esperada» usada sin definir (tarjeta + glosario), ejemplo de hospitalización discutible (sustituido), distractor del MEI inexacto, promesa de derecho a pensión sin condiciones, fuentes de pensiones (LGSS art. 205), L1-e8 sin contexto.
- **Ronda 2:** 1 mayor (dato del FGD sin fuente en L5 → se quita la cifra del ítem y se añade la fuente) y 1 menor (distractor ambiguo de L4-e8) aplicados.
- Estado `reviewed`. **🛑 Pendiente: revisión de Javier.** PROVISIONAL: requisitos de jubilación (15 años; 67 años en 2027; 65 con 38 años y 6 meses) verificados solo con el revisor, no con la web oficial; `verificarAntesDe` 2027-01-31. URL de criptoactivos CNMV y fuentes genéricas por confirmar.

## n1-u1 — La empresa y la acción (2026-10-15)
- 5 lecciones (la empresa y sus propietarios, la acción y sus derechos, capitalización, free float, Jefe final) + 5 términos de glosario. Explicador nuevo `MarketCapFloat` (motor `marketCap`/`freeFloatShares`). Datos de Naranjas del Turia (capital 6 M€, 12 M de acciones) coherentes con `companies.json`; el precio de 10 € se declara siempre como supuesto ilustrativo.
- **Ronda 1:** 0 críticos, 8 mayores, 12 menores. Aceptados: free float sin acotar (definición variable según proveedor), explicador con free float antes de su lección, ejercicios no autocontenidos (las tarjetas SRS se presentan sueltas), «cuota de liquidación»/«alícuota» sin definir, fill_blank con más de una respuesta defendible, multi_select ambiguo, «perder lo que aportaron» (el comprador en bolsa invierte, no aporta).
- **Descubierto durante la revisión (defecto de producto):** las opciones de `multiple_choice`/`multi_select` no se barajaban y la correcta era la primera en 47 de 54 ejercicios. Corregido (orden barajado estable por ejercicio) con test que exige < 50 % de correctas en primer lugar.
- **Regla nueva para el resto de unidades:** cada ejercicio debe ser autocontenido (no remitir a «el ejercicio anterior» ni a «esos datos»).
- **Ronda 2:** aprobada; 3 menores aplicados.
- Estado `reviewed`. **🛑 Pendiente: revisión de Javier.** PROVISIONAL: fuentes de BME y CNMV genéricas.

## n1-u2 — Mercado primario y secundario (2026-10-15)
- 5 lecciones (mercado primario, OPV/OPS, mercado secundario, qué cambia tras una emisión, Jefe final) + 6 términos de glosario. Explicador nuevo `PrimarySecondary`.
- **Ronda 1:** 0 críticos, 3 mayores, 11 menores. Aceptados: ejercicios no autocontenidos (l3-e4, l4-e5/e6), respuestas 0 triviales con fórmula `*0` (sustituidas por escenarios con cálculo real), «horquilla» con dos significados (ahora «rango indicativo»), OPV vs «mercado primario» (nota de cambio de manos), «bonos»/«derechos de suscripción» antes de nivel, repeticiones en el Jefe final, fuente del Reglamento (UE) 2017/1129.
- **Ronda 2:** aprobada; menor aplicado (concepto `opv` sobrante en l4).
- Estado `reviewed`. **🛑 Pendiente: revisión de Javier.** PROVISIONAL: fuentes de la CNMV genéricas.

## n1-u3 — Bolsas e índices (2026-10-15)
- 5 lecciones (BME y mercado continuo, IBEX 35, cómo se mueve un índice, BME Growth/índices del mundo/OTC, Jefe final) + 6 términos de glosario. Explicador nuevo `IndexWeights` (motor `capWeightedIndex` con tests).
- **Ronda 1:** 0 críticos, 6 mayores, 9 menores. Aceptados: sesión sin mencionar subastas, tope del 20 % del IBEX 35, categorize ambiguo (DAX en eurozona y en Alemania), dos fill_blank con otras respuestas defendibles, fuentes genéricas, vocabulario antes de nivel (bróker, subasta, contraparte).
- **Ronda 2:** 1 mayor (enunciado invertido en l4-e7) y 2 menores (fuente de OTC → EMIR; 20 % en glosario) aplicados.
- Estado `reviewed`. **🛑 Pendiente: revisión de Javier.** **PROVISIONAL / caduca:** horario del continuo, composición y tope del IBEX 35 (`verificarAntesDe` 2027-06-30); URLs de fuentes genéricas por sustituir por las páginas exactas; SIX/BME sin enlace a la nota de prensa concreta.

## n1-u4 — Precios, órdenes y subastas (2026-10-15)
- 6 lecciones (precio y horquilla, liquidez y orden de mercado, orden limitada, subastas, FOMO y efecto manada, Jefe final) + 7 términos de glosario. Explicador nuevo `OrderBook`; motor `engine/orderbook.ts` (horquilla, compra/venta a mercado, limitada, precio de subasta con desempates) con tests.
- **Ronda 1:** 0 críticos, 2 mayores (fuente específica del mecanismo de subasta; «cerca de los máximos» sin respaldo), 10 menores (autocontención de l5-e5, ejercicio de subasta que daba el resultado, ambigüedades de categorize/fill_blank, explicaciones). Aceptados.
- **Ronda 2:** aprobada; menores aplicados (l6-e9 sin volúmenes dados, 4.º ítem del categorize).
- Estado `reviewed`. **🛑 Pendiente: revisión de Javier.** PROVISIONAL: URL de la normativa de BME por sustituir por la circular exacta; `verificarAntesDe` 2027-06-30.

## n1-u5 — Operar en España: bróker, dividendos y fiscalidad (2026-10-15)
- 6 lecciones (bróker y comisiones, dividendos y rentabilidad por dividendo, rentabilidad total, scrip dividend, ganancias y dividendos en el IRPF, Jefe final) + 6 términos de glosario. Explicador nuevo `ExDividend`.
- **Ronda 1:** 0 críticos, 3 mayores (términos fiscales sin definir en los categorize, fill_blank con varias respuestas, fuentes del glosario), 8 menores. Aceptados; tags rellenados.
- **Ronda 2:** aprobada; 3 menores aplicados (fuente del scrip en L4, art. 76 en la fuente fiscal, margen de palabras en la tarjeta).
- Estado `reviewed`. **🛑 Pendiente: revisión de Javier.** **PROVISIONAL / caduca:** escala del IRPF (19/21/23 %) y retención del 19 % (`verificarAntesDe` 2027-03-31); scrip dividend sin tratamiento fiscal (a propósito); URLs genéricas de CNMV/AEAT/BOE por sustituir por la página exacta.

## n1-u6 — Operaciones corporativas y OPAs (2026-10-15)
- 6 lecciones (ampliación de capital, derechos de suscripción, split, recompra, OPA, Jefe final) + 6 términos de glosario. Explicadores nuevos `ShareDilution` y `StockSplit`; motor (`theoreticalExRightsPrice`, `rightValue`, `stockSplit`) con tests.
- **Ronda 1:** 0 críticos, 3 mayores (riesgo de coma flotante en l2-e6, tarjeta de la OPA jurídicamente incompleta —voluntaria, efectivo/valores, precio equitativo solo en la obligatoria—, glosario sin fuentes), 9 menores. Aceptados.
- **Ronda 2:** aprobada sin errores.
- Estado `reviewed`. **🛑 Pendiente: revisión de Javier.** **PROVISIONAL / caduca:** umbral del 30 % y reglas de la OPA, autocartera y suscripción preferente (`verificarAntesDe` 2027-06-30). **Pendiente de producto:** `document_read` (anuncio de una OPA en la CNMV, 📄 del Nivel 1) y fiscalidad de la venta de derechos de suscripción (TEMARIO §2 N1) no incluidos en esta unidad: se harán cuando exista el tipo de ejercicio y con fuente AEAT verificada.

## 2.3 — Ejercicios nuevos (-e9) en 5 lecciones (17/10/2026)

Revisor independiente: aprobados los 5; sin errores de exactitud. Aplicado: opciones de longitud pareja en `n0-u3-l2-e9` y `n0-u3-l4-e9`; `n0-u1-l3-e9` cambia al 4 % (72/4 = 18 años; exacto 17,7) para no repetir el 9 % de otros ejercicios. `tolerance` de `slider_estimate` es un % de la respuesta. Pendiente: revisión de Javier (🛑) como el resto de la unidad.
