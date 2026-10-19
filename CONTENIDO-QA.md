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

## 2.5 — Datos de los juegos (`content/shared/games.json`, 17/10/2026)

Revisor independiente: direcciones de los 12 titulares y tipos de orden correctos; sin errores de cálculo. Cambios aplicados:
- **Titulares:** distractores sustituidos por falacias reales de nivel 1 (p. ej. «una buena noticia ya estaba en el precio», «recomprar aumenta las acciones en circulación»), longitudes igualadas y sin el patrón «siempre/nunca» que delataba la respuesta; recompra y venta de fondo sin distractores defendibles; cierre de planta «sin costes de cierre relevantes».
- **Órdenes:** «precio único que resulte de la subasta» (hay dos subastas al día) y «ahora mismo» en la petición inmediata de venta.
- **Presupuesto:** «Dinero que llevas a un depósito a plazo» (evita confundir con ingreso), «Dinero que apartas cada mes para el viaje», «tu plan de ahorro», «Seguro del coche (parte mensual)»; el sobrante se llama «Lo que decides apartar este mes» y el ajuste de ingresos recae en la nómina o las clases.
- Pendiente: revisión de Javier (🛑).

## Modelos de referencia de Naranjas del Turia (`content/shared/models/`, 17/10/2026)

3 estados, DCF, LBO y merger, generados con `npm run models:build`; tests en `src/content/models.test.ts` y `src/engine/models.test.ts` (43 en verde).
- **Ronda 1 (revisor-financiero):** las cifras cuadran en los cuatro. 2 mayores: (1) el múltiplo y el crecimiento implícitos del DCF no aplicaban la mitad de año (7,66x → **7,97x**; 2,89 % → **2,68 %**); (2) la nota del art. 16.5 LIS contradecía las cifras (la deuda baja al 28,5 % del precio, por debajo del ritmo exigido) y resumía mal la norma. 9 menores aplicados: criterio de g, caja no operativa del DCF frente a caja mínima del LBO, art. 16 completo, asistencia financiera (art. 150 LSC) y fusión apalancada (RDL 5/2023, art. 42), hipótesis del LBO que no aplican a 0, canje desglosado (0,25 acciones + 5,25 € por acción; 0,5 si todo fuera en acciones), explicación de la financiación del merger, fuentes NIC 36 / PGC / Código de Comercio. Nuevo `acquisitionDebtTest` con test.
- **Ronda 2:** aprobada; 2 retoques de texto aplicados (art. 150 LSC y calendario del plan operativo).
- Cifras principales sin cambios: 9,35 €/acción, TIR 13,2 %, MOIC 1,86x, acreción +0,48 % el año 1.
- Estado **`draft`**. **🛑 Pendiente: revisión de Javier.** **PROVISIONAL:** hipótesis de mercado (bono 3,25 %, prima 5,5 %, beta 0,65, prima por tamaño 2 %, cotización 7,50 €) sin verificar, `verificarAntesDe` 2027-04-17. Marjal Capital Partners y Grupo Azahar Calderona: sin alta en `companies.json` ni comprobación en la CNMV.

## 2.9 — Ejercicios paramétricos de muestra (17/10/2026)

`n0-u1-l2-e4` (interés compuesto, `numeric_input`; lección `n0-u1-l2` v3) y `n0-u2-l3-e3` (intereses del mes en hoja de cálculo; lección `n0-u2-l3` v2) pasan a tener cifras variables en el repaso.
- **Ronda 1 (revisor-financiero):** sin errores de cálculo en todo el rango; la tolerancia no impide acertar. 1 mayor aplicado: el derivado de 3 decimales detrás de un «=» podía contradecir el redondeo → se usa el factor `1 + tipo/100` (2 decimales) y la respuesta redondeada al céntimo. Menores aplicados: `tipo.max` 9 → 6 (realismo de un depósito); el segundo caso oculto de la hoja usa TIN 0,0425 (fuera de la rejilla) para que una fórmula sin referencia a B2 no pase; etiqueta «TIN (tanto por uno)» y equivalente en % en la explicación. Aceptado sin cambio: «250,00 €» en la explicación frente a «250 €» en la intro.
- **Ronda 2:** lanzada y **cortada por el límite de uso** antes de terminar. 🛑 Pendiente de repetir y de la revisión de Javier. Estado de las lecciones: `reviewed` (sin cambio).

## n1-u4-l7 — Lección-juego «La compra grande» (17/10/2026)

Primera lección-juego: se juega primero y las cifras de la partida rellenan tarjetas y ejercicios; en el repaso, los ejercicios usan sus `params`.
- **Ronda 1 (revisor-financiero):** 2 críticos aplicados: e1 pasa a precio medio = coste / acciones; e2 pasa a coste − 600 × punto medio, con rangos que siempre dan un sobrecoste positivo. Mayores aplicados: el motor ya no devuelve el libro a precios previos tras el evento; el desencadenante pasa de «resultados buenos» (incierto) a un evento público y cierto (Naranjas entra en un índice y los fondos indexados compran tras la ronda 2); la tarjeta 1 define punto medio y sobrecoste. Menores aplicados: e4 como hipótesis, e3 bloom «entender», fuentes concretas (BME Reglamentación; Bodie, Kane y Marcus, cap. 3), VWAP/TWAP explicados, matiz de que la liquidez vuelve solo en parte, decimales fijos en precios (`fixed`).
- **Ronda 2:** aprobada con retoques, todos aplicados: distractor 3 de e4 cambiado (el anterior describía algo cierto), «noticia» → «entren los fondos indexados» en e6, «no mueven» → «mueven menos» en realWorld, comentarios del motor actualizados. Estado: `reviewed`. 🛑 Pendiente de la revisión de Javier.

## n1-u1-l6 — Lección-juego «Tus primeras acciones» (18/10/2026)

Abre la planta 0 (unidad `n1-u1`). Juego: cinco noticias de Naranjas del Turia; luego tarjetas y ejercicios con las cifras de la partida (semilla 1: 9,62 € → 9,86 €, capitalización 115.440.000 € → 118.320.000 €, free float 35 %).
- **Ronda 1 (revisor-financiero):** aprobada con retoques. Mayores aplicados: definición de free float (todas las acciones cotizan; el free float es la parte en manos de inversores que compran y venden), origen de las acciones (las regala la abuela antes de entrar en el banco: evita un conflicto de intereses), e8 con etiquetas que no siguen el orden alfabético. Menores aplicados: cifras por defecto de e2 iguales a la semilla, «una subida del {pct} %», `envases.why`, e7 «vale en bolsa», distractor 2 de e4, fuentes concretas (Normas técnicas del IBEX 35, LSC art. 93).
- **Ronda 2:** aprobada; un retoque de vocabulario en e3 aplicado. Estado: `reviewed`. 🛑 Pendiente de la revisión de Javier.

## n1-u4-l8 — Lección-juego «La subasta de apertura» (18/10/2026), y `n1-u4-l4` v2

- **Ronda 1 (revisor-financiero):** cambios necesarios. Mayores, aplicados:
  - la tarjeta 1 decía que se casan todas las órdenes;
  - e1 quedaba trivial con las cifras de la partida: ahora es una hipótesis con su propio parámetro;
  - la prioridad no respetaba la orden de las 8:30 que no se cambia;
  - faltaba el tercer criterio de desempate (el lado con más volumen), también en `n1-u4-l4`;
  - `verificarAntesDe` y las fuentes estaban sin concretar;
  - el paso 3 de e7 se podía colocar en otro sitio.

  Menores, aplicados: el ítem de e6 (que se cambió por un ejercicio de prioridad), e3 (demanda acumulada), el supuesto del continuo explicado como tal, la longitud de las opciones de e8 y las cabeceras de la tabla.
- **Ronda 2:** aprobada. Cuatro retoques aplicados (`tableNote`, e6, la pista de e1 y la fecha de la fuente).
- Estado: `n1-u4-l8` en `reviewed`; `n1-u4-l4` v2 sigue en `reviewed` con el visto bueno del subagente. 🛑 Pendiente de la revisión de Javier. Pendiente de contrastar el paso 3 de la regla de precio con la circular del SIBE (ver DECISIONES.md).

## n1-u3-l6 — Lección-juego «¿Quién mueve el índice?» (18/10/2026)

- **Ronda 1 (revisor-financiero):** cambios necesarios. Mayores aplicados: los textos «why» de las sesiones all-up y small-big no se cumplían con todas las semillas (ahora sí, comprobado con los rangos del motor). Menores aplicados:
  - big-up: «todas las demás bajen»;
  - second-down: «algo más de una cuarta parte»;
  - «p. p.» en lugar de «puntos» donde podía confundirse con los puntos del índice;
  - la tarjeta 2 separa la regla de una sesión del total;
  - test de que la semilla 3 termina en subida;
  - la tarjeta 3 explica qué es el mercado continuo y dice «tope en cada revisión», DAX 40 y Euro Stoxx 50 (con la misma fuente que l4);
  - e6, longitud de las opciones y explicación del distractor 2.
- **Ronda 2:** aprobada; dos retoques aplicados («p. p.» en e5 y e8, y la frase del Euro Stoxx 50). Estado: `reviewed`. 🛑 Pendiente de la revisión de Javier, incluido el tope del 20 % en las Normas Técnicas del IBEX.

## n1-u5-l7 — Lección-juego «El primer dividendo» (18/10/2026)

- **Ronda 1 (revisor-financiero):** cambios necesarios. Mayores aplicados:
  - e6 tenía dos respuestas defendibles; se cambió el ítem por el de la retención;
  - los parámetros de repaso de e3 daban rentabilidades absurdas;
  - e4 y el texto del juego trataban la retención como un coste;
  - la pantalla final no descontaba el coste de cazar el dividendo;
  - el folleto de tarifas se citaba como obligatorio sin fuente; ahora no se afirma.

  Menores aplicados: «otra información relevante» en lugar de «hecho relevante», el día de pago sin fijar, «el cierre menos el dividendo», la bajada por acción en la tarjeta 2, «descontadas las comisiones», e7 (anuncio y «comprar como tarde»), e8 sin exagerar y el nombre «Banco del Turia» cambiado.
- **Ronda 2:** solo faltaban fuentes concretas. Añadida la consulta de «otra información relevante» de la CNMV; la norma de BME sobre el ajuste por dividendo queda pendiente (ver DECISIONES.md). Estado: `reviewed`. 🛑 Pendiente de la revisión de Javier y de comprobar en la CNMV los nombres de los brókers.

## n1-u2-l6 — Lección-juego «La salida a bolsa» (18/10/2026)

- **Ronda 1 (revisor-financiero):** cambios necesarios. Mayores, aplicados:
  - «Libro de órdenes» pasa a «libro de demanda», porque chocaba con su significado en `n1-u4`.
  - «Hace un año» pasa a «antes de 2021», porque contradecía las cuentas de `companies.json`.

  Menores, aplicados:
  - nota visible del supuesto del estreno;
  - «cubierta, y sobresuscrita si pasa de 1»;
  - prorrateo y reparto en conjunto en e2;
  - e5 y e6 sin afirmaciones absolutas;
  - el brief dice quién fija el precio;
  - realWorld reescrito;
  - fuentes concretas de la CNMV.
- **Ronda 2:** aprobada sin errores. Estado: `reviewed`.
- **Fuentes:** las dos nuevas de la CNMV (Mercado primario y la guía rápida GR07) se localizaron con una búsqueda que citaba su contenido, pero no se pudieron abrir desde el entorno.
- 🛑 Pendiente de la revisión de Javier.

## n1-u6-l7 — Lección-juego «El rumor de OPA» (18/10/2026)

- **Ronda 1 (revisor-financiero):** cambios necesarios. Mayores aplicados:
  - el diferencial se medía con la base contraria a la de e3;
  - el cobro de la OPA llega en meses, no en semanas (autorización de la CNMV y plazo de 15 a 70 días; art. 23 del RD 1066/2007), y e8 dice ahora «se acaba de anunciar»;
  - un rumor no hace pública la confirmación de alguien de dentro;
  - las operaciones personales de un empleado de banco pasan por cumplimiento.

  Menores aplicados:
  - «de forma apreciable»;
  - Hugo tampoco debía contarlo;
  - información obtenida por casualidad;
  - el premio medido sobre el precio del rumor;
  - e3 en condicional;
  - `okReject` matizado;
  - el resultado de la apuesta por el rumor en el resumen;
  - fuentes con artículos (RD 1066/2007, Ley 6/2023 con identificador BOE-A-2023-7053, comprobado por búsqueda, y Código Penal arts. 285 y 285 bis).
- **Ronda 2:** aprobada; aplicado un retoque de estilo en `spreadNote`. Estado: `reviewed`.
- 🛑 Pendiente de la revisión de Javier y de la pregunta del test de salto sobre información privilegiada.

## n3-u1 — Los tres estados financieros (planta 1) y lección-juego «Cuadra el balance» (18/10/2026)

- **Ronda 1 (revisor-financiero):** cambios necesarios. Las cifras estaban todas bien; los hallazgos eran de criterio y de evaluación.
  - Mayores aplicados:
    - el resultado del ejercicio va sumado a reservas (convención de `companies.json`): ahora se declara en el juego, en las tarjetas, en los enunciados y en las filas, y la explicación de l2-e4 da la cifra PGC separada;
    - nota PGC (gastos por naturaleza) frente a NIIF (por función: coste de ventas) y aclaración NIIF-UE / PGC en los realWorld;
    - fuente del 25 % (Ley 27/2014, art. 29.1, BOE-A-2014-12328) con `verificarAntesDe`;
    - el mensaje de apunte que descuadra era falso en dos casos;
    - el test de salto cubre ahora el método indirecto y el apunte de una operación, con cifras de 2021 y 2022;
    - el Jefe final separa activo corriente y no corriente, clasifica flujos y dura 5 minutos.
  - Menores aplicados (13): tolerancias exactas en sumas enteras, conceptos de l1 reetiquetados, «según el PGC» en dividendos (la NIC 7 admite explotación), «registró un gasto por impuesto», capital circulante definido y otros.
  - No aplicado: test de salto con ≥ 50 % de preguntas de producir y banco de 12. El esquema de todas las unidades solo admite 8 preguntas de reconocer; queda como pendiente global (ver `DECISIONES.md`).
- **Ronda 2:** un distractor sin error asociado en salto q3 (4.283 → 3.575), la pregunta de variación de caja recuperada y dos retoques. Aplicados.
- **Ronda 3:** aprobada. Estado: `reviewed`.
- 🛑 Pendiente de la revisión de Javier, contrastando con sus apuntes de Contabilidad cuando lleguen.

## n3-u2 — De la cuenta de resultados a la caja y lección-juego «Ciclo de caja» (18/10/2026)

- **Ronda 1 (revisor-financiero):** cambios necesarios, sin errores de cálculo.
  - Mayores aplicados:
    - incoherencia con el plazo de 30 días de la fruta fresca: el juego usa ahora días de pago **medios** de 30, 40 o 50 (50 es la fruta a 30 y los envases a 60), y las lecciones lo explican;
    - l4-e5: la explicación decía «el doble», y es 730 frente a 545;
    - l4-e2: el adelanto de factoring admitía dos lecturas;
    - l2-e4: «sueldos pendientes» chocaba con la definición simplificada de NOF;
    - el texto de la tarjeta de NOF era falso cuando no hay hueco.
  - Menores aplicados:
    - distractores del test de salto con su error típico;
    - fuera «descuento de efectos»;
    - nuevos ejercicios de beneficio → caja (8.151) y de intereses de la póliza;
    - sin días en el orden de pasos.
- **Ronda 2:** un mayor (l5-e7 daba por buena una media de pago de 60 días, imposible con la fruta a 30) y seis menores. Aplicados.
- **Ronda 3:** aprobada. Estado: `reviewed`.
- 🛑 Pendiente: comprobar en el BOE consolidado el artículo de la Ley 12/2013 que se cita (art. 14 bis, tras la Ley 16/2021) y la frase «desde la entrega». Además, la revisión de Javier.

## n3-u3 — Ratios y calidad del beneficio y lección-juego «¿Quién es quién?» (18/10/2026)

- **Ronda 1 (revisor-financiero):** cambios necesarios. Cálculos y pistas del juego correctos en 2021–2025.
  - Crítico aplicado: la q6 del test de salto admitía dos respuestas con el ROA de la unidad (resultado ÷ activo). Ahora compara con la rentabilidad que tendría el activo sin deuda.
  - Mayores aplicados:
    - la tarjeta de ROA y ROE mezclaba dos ROA;
    - a l6-e2 le faltaban las ventas.
  - Menores aplicados (11):
    - enunciados genéricos en el repaso;
    - «unas tres cuartas partes, o más» en la pista de Pirineo;
    - un numérico nuevo de deuda neta / EBITDA (Pirineo 2021: 1,56);
    - 0,079 en l6;
    - la conversión en caja atribuida a la amortización;
    - el explicador Leverage con valores y etiquetas, para no depender solo del color;
    - fuente del CFA Institute añadida.
- **Ronda 2:** aprobada, con tres menores aplicados: dos explicaciones con cifras del repaso y los metadatos de `companies`. Estado: `reviewed`.
- 🛑 Pendiente de la revisión de Javier.

## n3-u4 — Múltiplos: ¿cara o barata? y lección-juego «¿Cara o barata?» (19/10/2026)

- **Ronda 1 (revisor-financiero):** cambios necesarios.
  - Aplicados:
    - la nota de deuda del juego ya no afirma cuál de los dos valores sale mayor;
    - l1-e7 (por qué contrastar PER y EV/EBITDA con deuda y con caja neta);
    - l5-e8 clasifica el BPA, no la capitalización;
    - base del porcentaje en l5-e6;
    - ejemplo y e4 de l2 (PER con el BPA sin redondear);
    - q8 (EV/ventas si el EBITDA también es negativo);
    - q5 pasa a ser una elección múltiple de comparables.
- **Ronda 2:** aprobada, con cuatro menores aplicados:
  - la tarjeta del PER explica el efecto de los tipos de interés;
  - l1-e7 usa cifras de Naranjas;
  - el escenario de anclaje de l4 ya no copia el ejemplo;
  - q6 pasa a ser una pregunta de veredicto cara/barata con la banda del ±10 %.
- Estado: `reviewed`.
- 🛑 Pendiente de la revisión de Javier.

## n3-u5 — Coste de capital: CAPM y WACC y lección-juego «La mezcla de la financiación» (19/10/2026)

- **Ronda 1 (revisor-financiero):** cambios necesarios; ningún crítico.
  - Mayores aplicados (11):
    - un marcador `{best}` que se habría visto literal en un verdadero/falso;
    - restas visibles mal redondeadas y variantes de repaso incoherentes en l1-e6;
    - el 20 % de deuda pasa a ser la estructura objetivo del sector, como en el modelo DCF, y no la actual;
    - betas y coste de la deuda coherentes con el caso hilo (l2-e7, l3-e4, l4-e4);
    - dos `spot_the_error` con una sola línea defendible;
    - distractor de q1.
  - Menores aplicados (13): redacción de las tarjetas, ke con 4 decimales, art. 16 de la LIS con su matiz, fuente de la NIC 36, unidades de las betas, conceptos de las lecciones, distractores de q5 y el rationale de kd del modelo DCF.
- **Hallazgo transversal:** a raíz del `{best}`, el validador rechaza ahora los marcadores en ejercicios sin `params`.
  - Encontró el mismo fallo en n3-u1-l1-e7 y n3-u3-l1-e6, que se corrigen con texto fijo.
  - El revisor los ha comprobado en la ronda 2.
- **Ronda 2:** aprobada, con cuatro menores aplicados (companies de l2 y l4, comentarios internos y el enunciado de l1-e6 en el repaso).
- Estado: `reviewed`.
- 🛑 Pendiente de la revisión de Javier, incluido el art. 16 de la Ley 27/2014 (verificarAntesDe 2027-03-31).

## n3-u6 — DCF: lo que vale una empresa y lección-juego «DCF Express» (19/10/2026)

- **Ronda 1 (revisor-financiero):** cambios necesarios.
  - Crítico aplicado: la sensibilidad de l4-e5 decía que «un punto de WACC mueve el precio casi un 30 %». Son −13 % y +18 %.
  - Mayores aplicados (5):
    - la explicación del distractor de la inflación del BCE (con su fuente);
    - el signo de la deuda neta en las variantes de l1-e4;
    - dos respuestas defendibles en l5-e7 y en el orden de l2-e6;
    - el distractor 850 de q3.
  - Menores aplicados (6): conceptos del Jefe final, WACC − g en l5-e6, unidades y formato de g, sinónimos de WACC, cifras nuevas en l4-e1 y l4-e4.
- **Ronda 2:** un mayor. El valor terminal por múltiplo se descontaba a 4,5 años; se pasa a 5, porque es un valor a 31/12 y no un flujo repartido en el año. Así se vuelve al 10,24 € del modelo de referencia, y l4-e2 explica las dos convenciones.
- **Ronda 3:** aprobada. Estado: `reviewed`.
- 🛑 Pendiente de la revisión de Javier.

## n2-u1 — Bonos: cupón, precio y TIR y lección-juego «La emisión de Naranjas» (19/10/2026)

- **Ronda 1 (revisor-financiero):** cambios necesarios. Las cifras estaban todas bien.
  - Mayores aplicados (3):
    - el Jefe final explicaba mal el coste de la deuda del 5 % de Pirineo (el coste es la rentabilidad de mercado, no el cupón);
    - avisos que nombraban a Naranjas en lecciones sin Naranjas;
    - la tolerancia del 0,5 % en los precios aceptaba métodos mal planteados (ahora 0,1 %).
  - Menores aplicados (11):
    - plazos del Tesoro formulados como definición más emisión actual;
    - enunciados de l1-e8, l2-e8 y l5-e8 más precisos;
    - l3-e3 ya no repite el ejemplo;
    - el juego ya no atribuye al BCE el movimiento del tipo a 5 años;
    - distractores de l2-e5, l4-e5 y q7.
- **Ronda 2:** aprobada. Estado: `reviewed`.
- 🛑 Pendiente de la revisión de Javier, incluidos los plazos de Letras, Bonos y Obligaciones en tesoro.es (verificarAntesDe 2027-04-30).

## n2-u2 — Duración y curva de tipos y lección-juego «Curva de tipos» (19/10/2026)

- **Ronda 1 (revisor-financiero):** cambios necesarios. Las cifras estaban todas bien.
  - Mayor aplicado: el explicador `Duration` llamaba «≈» a una diferencia de 2,3 puntos sin mencionar la convexidad. Ahora lo explica.
  - Menores aplicados (13):
    - ambigüedades en l3-e4, l3-e5, l4-e6 y l4-e7;
    - «duración modificada» explícita en el Jefe final;
    - l1-e2 con la cifra de la partida;
    - matices en la curva invertida y en el aplanamiento;
    - distractores de l2-e4 y q2;
    - el texto del reto 1 del juego;
    - la descripción de `duracion`.
- **Ronda 2:** aprobada. Estado: `reviewed`.
- Bloom del nivel N2: 40/74 de recordar/entender (54,1 %).
- 🛑 Pendiente de la revisión de Javier.

## n2-u3 — Fondos, ETF y comisiones y lección-juego «Dos fondos, veinte años» (19/10/2026)

- **Ronda 1 (revisor-financiero):** cambios necesarios. Las cifras y la fiscalidad estaban bien.
  - Mayores aplicados (5):
    - el traspaso no evita días fuera del mercado; la ventaja es solo fiscal;
    - enunciado de l3-e2;
    - q8 con datos fijos y cifras;
    - el categorize de l5-e5;
    - l3-e7 acepta «pasivo».
  - Menores aplicados (9):
    - objetivo de l3;
    - el valor liquidativo también lo publican los ETF;
    - diferencia de seguimiento;
    - fuente con los arts. 66 y 76;
    - «costes corrientes» del documento PRIIPs;
    - redacción de l4-e7 y de varios distractores.
- **Ronda 2:** dos menores de redacción aplicados (referencia a «e3» y «costes corrientes» en los realWorld). Estado: `reviewed`.
- Bloom del nivel N2: 60/115 de recordar/entender (52,2 %).
- 🛑 Pendiente de la revisión de Javier, incluidos el régimen de traspasos y el tipo del 19 % (verificarAntesDe 2027-03-31).
