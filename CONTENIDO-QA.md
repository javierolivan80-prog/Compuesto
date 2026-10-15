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
