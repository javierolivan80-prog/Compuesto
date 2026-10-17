# Ficha de revisión de los modelos de referencia — Naranjas del Turia

> **Estado: borrador (`draft`).** Pasa a revisada cuando Javier escriba «aprobado». Esta ficha explica los modelos y no los cambia: las cifras salen de `content/shared/models/` (versión 1, generada con `npm run models:build`).
> **Unidades:** miles de € salvo los importes por acción (€). «2025» es el último año real de `companies.json`; 2026–2030 son proyecciones. Fecha de valoración: 31/12/2025.
> **Cómo usarla:** lee primero «Qué pregunta responde», sigue el recorrido con el JSON abierto y haz las 5 comprobaciones con la calculadora. Si un resultado no te sale, apúntalo: es justo lo que hay que revisar.

**Leyenda de hipótesis:** ✅ sale de las cuentas reales de 2021–2025 (comprobable en `companies.json`) · 📘 decisión del modelo, justificada pero discutible · ⚠️ dato de mercado **didáctico, sin verificar** (hay que contrastarlo con la fuente antes de publicar; fecha límite 17/04/2027).

---

## 1. Modelo de 3 estados (2026–2030)

### Qué pregunta responde
¿Cómo serán la cuenta de resultados, el balance y los flujos de caja de Naranjas del Turia en los próximos cinco años si sigue comportándose como hasta ahora? Es la base de todos los demás modelos: el DCF, el LBO y el merger toman de aquí sus cifras.

### Hipótesis clave

| Hipótesis | Valor | De dónde sale | Tipo |
|---|---|---|---|
| Crecimiento de ingresos | 6,5 %, 6,0 %, 5,5 %, 5,0 %, 4,5 % | Histórico: crecimiento anual compuesto del 7,2 % (44.520 → 58.882) y +7,0 % en 2025; se frena 0,5 puntos al año | 📘 |
| Coste de ventas / ingresos | 62 % | 62,0 % en los cinco años reales | ✅ |
| Gastos operativos / ingresos | 18 % | 18,0 % en los cinco años reales | ✅ |
| Amortización / inmovilizado inicial | 8 % | 1.682 / 21.030 = 8,0 % en 2025 (igual en 2022–2024) | ✅ |
| Capex / ingresos | 5,5 % | Media real 4,9 %, con 5,9 % en 2023 y 2025; se sube por nuevas líneas de zumo | 📘 |
| Días de cobro / existencias / pago | 60 / 70 / 50 | Clientes / ingresos = 16,44 % (= 60/365); existencias / coste de ventas = 19,18 % (70/365); proveedores / coste de ventas = 13,70 % (50/365) | ✅ |
| Interés de la deuda | 4,5 % de la deuda inicial del año | 4,5 % en 2023–2025 | ✅ |
| Impuesto sobre sociedades | 25 % | Tipo general (art. 29 LIS); coincide con el tipo efectivo real | ✅ |
| Dividendo (payout) | 45 % del beneficio | 45 % en los cinco años reales | ✅ |
| Devolución de deuda | 1.500 al año | Supuesto del modelo; no se pide deuda nueva | 📘 |
| Caja | partida de cierre, sin remunerar | Simplificación para evitar circularidad | 📘 |

### Recorrido de las cifras (2026 como ejemplo)

| Paso | Fórmula | 2026 |
|---|---|---|
| 1. Ingresos | ingresos 2025 × (1 + g) = 58.882 × 1,065 | **62.709** |
| 2. Coste de ventas | 62 % × ingresos | 38.880 |
| 3. Gastos operativos | 18 % × ingresos | 11.288 |
| 4. EBITDA | ingresos − coste de ventas − gastos operativos | 12.541 |
| 5. Amortización | 8 % × inmovilizado de 2025 (22.848) | 1.828 |
| 6. EBIT | EBITDA − amortización | 10.713 |
| 7. Gastos financieros | 4,5 % × deuda de 2025 (12.000) | 540 |
| 8. Beneficio antes de impuestos | EBIT − gastos financieros | 10.173 |
| 9. Impuestos | 25 % × BAI | 2.543 |
| 10. Resultado neto | BAI − impuestos | **7.630** |
| 11. Circulante | clientes 62.709 × 60/365 = 10.308; existencias 38.880 × 70/365 = 7.456; proveedores 38.880 × 50/365 = 5.326 | circulante neto 12.438 |
| 12. Variación del circulante | 12.438 − circulante 2025 (9.679 + 7.001 − 5.001 = 11.679) | 759 (consume caja) |
| 13. Flujo operativo | resultado neto + amortización − Δ circulante = 7.630 + 1.828 − 759 | 8.699 |
| 14. Flujo de inversión | − capex = − 5,5 % × 62.709 | −3.449 |
| 15. Flujo de financiación | Δ deuda − dividendos = −1.500 − 45 % × 7.630 (3.434) | −4.934 |
| 16. Caja final | caja 2025 + suma de flujos = 15.385 + 316 | **15.701** |
| 17. Balance | activo 57.934 = pasivo 15.826 + patrimonio 42.108 | cuadra |

En 2030: ingresos 76.948, EBITDA 15.389, resultado neto 9.554, caja 19.251 y deuda 4.500.

### 5 comprobaciones con calculadora

| # | Calcula | Resultado esperado |
|---|---|---|
| 1 | 58.882 × 1,065 | 62.709 (ingresos 2026, redondeado) |
| 2 | 0,08 × 22.848 | 1.828 (amortización 2026) |
| 3 | 7.630 + 1.828 − 759 | 8.699 (flujo operativo 2026) |
| 4 | 15.385 + 8.699 − 3.449 − 4.934 | 15.701 (caja 2026) |
| 5 | 15.701 + 10.308 + 7.456 + 24.469 y 15.826 + 42.108 | 57.934 las dos (el balance cuadra) |

### Conceptos que necesitas

| Concepto | Dónde se enseña |
|---|---|
| Porcentajes, interés compuesto | N0 |
| Balance, PyG, estado de flujos, conexión entre los tres | N3 |
| Circulante y ciclo de caja; estado de flujos por el método indirecto | N3 |
| Impuesto sobre sociedades, política de dividendos | N3 |
| Modelo de 3 estados completo con calendarios | Rama Investment Banking (unidad 5, se abre al aprobar N3) |

---

## 2. DCF con sensibilidades y Monte Carlo

### Qué pregunta responde
¿Cuánto vale hoy cada acción de Naranjas del Turia según el dinero que generará en el futuro? Se suman los flujos de caja de 2026–2030 y un valor final por todo lo que viene después, descontados al coste del capital de la empresa.

### Hipótesis clave

| Hipótesis | Valor | De dónde sale | Tipo |
|---|---|---|---|
| Flujos de caja | los del modelo de 3 estados | — | ✅ (vía 3 estados) |
| Tipo libre de riesgo | 3,25 % | Bono del Estado a 10 años aproximado a la fecha de valoración; verificar en el Tesoro Público o el Banco de España | ⚠️ |
| Prima de riesgo del mercado | 5,5 % | Rango de Damodaran (mercado maduro + prima país España); verificar | ⚠️ |
| Prima por tamaño | 2 % | Supuesto discutido para una cotizada pequeña; muchos manuales no la aceptan | ⚠️ / 📘 |
| Beta desapalancada | 0,65 | Procesado de alimentos en Europa (Damodaran); verificar | ⚠️ |
| Deuda / (deuda + patrimonio) objetivo | 20 % | Estructura del sector, no la actual (Naranjas tiene caja neta) | 📘 |
| Coste de la deuda antes de impuestos | 4,5 % | Su préstamo actual | ✅ |
| Crecimiento a perpetuidad (g) | 2 % | Igual al objetivo de inflación del BCE: crecimiento real nulo, conservador | 📘 |
| Múltiplo de salida (contraste) | 9,0x EBITDA | Supuesto de comparables del sector | 📘 |
| Deuda neta | −3.385 (caja neta) | 12.000 de deuda − 15.385 de caja; toda la caja se trata como no operativa | ✅ / 📘 |
| Acciones | 12.000.000 | `companies.json` | ✅ |
| Cotización de referencia | 7,50 € | Supuesto didáctico | ⚠️ |

### Recorrido de las cifras

| Paso | Fórmula | Resultado |
|---|---|---|
| 1. Deuda / patrimonio | 0,20 / 0,80 | 0,25 |
| 2. Beta apalancada (Hamada) | βU × (1 + (1 − t) × D/E) = 0,65 × (1 + 0,75 × 0,25) | 0,7719 |
| 3. Coste del capital propio (CAPM + tamaño) | rf + β × prima + prima tamaño = 3,25 % + 0,7719 × 5,5 % + 2 % | 9,50 % |
| 4. Coste de la deuda después de impuestos | 4,5 % × (1 − 0,25) | 3,375 % |
| 5. WACC | 80 % × 9,50 % + 20 % × 3,375 % | **8,27 %** |
| 6. FCFF de cada año | EBIT × (1 − 25 %) + amortización − capex − Δ circulante | 2026: 5.654,75 … 2030: 7.246,75 |
| 7. Factor de descuento (mitad de año) | 1 / (1 + WACC)^(t − 0,5) | 2026: 0,9610 … 2030: 0,6993 |
| 8. Valor actual de los flujos | Σ FCFF × factor | 26.369 |
| 9. Valor terminal (Gordon) | FCFF 2030 × (1 + g) / (WACC − g) = 7.246,75 × 1,02 / 0,062713 | 117.866 |
| 10. Valor actual del valor terminal | 117.866 × 0,6993 (descontado a 4,5 años, como el último flujo) | 82.429 |
| 11. Valor de empresa (EV) | 26.369 + 82.429 | **108.798** |
| 12. Valor del patrimonio | EV − deuda neta = 108.798 − (−3.385) | 112.183 |
| 13. Precio por acción | 112.183 × 1.000 / 12.000.000 | **9,35 €** |
| 14. Contraste por múltiplo | TV = 9 × EBITDA 2030 (15.389) = 138.501, descontado a 5 años → 93.087; EV 119.455 | 10,24 € |
| 15. Implícitos (reconcilian los dos métodos) | múltiplo implícito en Gordon = 117.866 × 1,0827^0,5 / 15.389; g implícito en el múltiplo | 7,97x y 2,68 % |

**Lecturas que el modelo quiere enseñar:**
- El valor terminal pesa el 75,8 % del EV, así que casi todo el valor depende de g y del WACC.
- Con un WACC entre 7,27 % y 9,27 % y g entre 1 % y 3 %, el precio va de 7,38 € a 13,15 €.
- El Monte Carlo (5.000 escenarios, semilla fija) da: percentil 5 = 6,91 €, mediana = 9,10 €, percentil 95 = 11,96 €. La probabilidad de valer más que 7,50 € es del 87 %.

### 5 comprobaciones con calculadora

| # | Calcula | Resultado esperado |
|---|---|---|
| 1 | 0,65 × (1 + 0,75 × 0,25) | 0,771875 |
| 2 | 0,8 × (3,25 + 0,771875 × 5,5 + 2) + 0,2 × 4,5 × 0,75 | 8,2713 (WACC en %) |
| 3 | 10.713 × 0,75 + 1.828 − 3.449 − 759 | 5.654,75 (FCFF 2026) |
| 4 | 7.246,75 × 1,02 / (0,082713 − 0,02) | ≈ 117.866 (valor terminal) |
| 5 | (108.798 + 3.385) / 12.000 | ≈ 9,35 € por acción |

### Conceptos que necesitas

| Concepto | Dónde se enseña |
|---|---|
| Valor temporal del dinero | N0 |
| Media y desviación típica (para leer el Monte Carlo) | N2 |
| VAN, estado de flujos, impuesto sobre sociedades, estructura de capital | N3 |
| CAPM y beta, beta apalancada (Hamada), coste de la deuda, WACC | N3 (movidos aquí con las mejoras del 17/10/2026) |
| DCF paso a paso; múltiplos | N3 |
| DCF de banca de inversión (mitad de año, Gordon frente a múltiplo) | Rama Investment Banking (unidad 4) |
| Simulación Monte Carlo | N6 |

---

## 3. LBO (Marjal Capital Partners lanza una OPA de exclusión)

### Qué pregunta responde
Si un fondo de private equity compra Naranjas del Turia pagando una parte con deuda y la vende en cinco años, ¿qué rentabilidad obtiene? Y la pregunta de fondo: ¿a qué precio máximo le sale la operación con la rentabilidad que exige un fondo (20 %)?

### Hipótesis clave

| Hipótesis | Valor | De dónde sale | Tipo |
|---|---|---|---|
| Precio de la OPA | 9,375 € por acción (+25 % sobre 7,50 €) | Prima típica de una OPA; la cotización es supuesta | ⚠️ / 📘 |
| Deuda nueva total | 4,5x EBITDA 2025 (11.776) | Supuesto de mercado de préstamos apalancados | 📘 |
| Tramos | Senior A 2,0x al 6 % (amortiza 10 %/año); Senior B 1,75x al 7 % (1 %/año); mezzanine 0,75x al 12 % capitalizado (PIK) | Supuestos de mercado | 📘 |
| Barrido de caja | 100 % del excedente: primero senior A, luego B | Práctica habitual | 📘 |
| Caja mínima | 3.000 | Supuesto operativo | 📘 |
| Comisiones | 2 % del EV (operación) y 2,5 % de la deuda (financiación, se amortiza en 5 años) | Supuestos | 📘 |
| Plan operativo del fondo | gastos operativos 17,8 % en 2026 → 17,0 % en 2029–2030 (resto como el caso base) | Plan de creación de valor | 📘 |
| Límite de gastos financieros | 30 % del beneficio operativo (≈ EBITDA), mínimo 1 M€ deducible, exceso a años siguientes | Art. 16 LIS | ✅ norma (aproximación con EBITDA 📘) |
| Salida | 2030 a 9,0x EBITDA | Algo por debajo de la entrada: sin expansión de múltiplo | 📘 |
| TIR objetivo | 20 % | Referencia habitual de los fondos | 📘 |

### Recorrido de las cifras

| Paso | Fórmula | Resultado |
|---|---|---|
| 1. Precio de las acciones | 9,375 € × 12.000.000 | 112.500 |
| 2. EV de entrada | precio − caja neta = 112.500 − 3.385 | 109.115 (**9,27x** EBITDA 11.776) |
| 3. Usos | acciones 112.500 + refinanciar deuda 12.000 + comisiones 2.182 + 1.325 | 128.007 |
| 4. Deuda nueva | 23.552 + 20.608 + 8.832 (2,0x, 1,75x y 0,75x de 11.776) | 52.992 |
| 5. Caja de la sociedad usada | 15.385 − 3.000 | 12.385 |
| 6. Capital del fondo (la partida de cierre) | usos − deuda − caja usada = 128.007 − 52.992 − 12.385 | **62.630** |
| 7. Cada año: intereses | tipo × saldo inicial de cada tramo (el PIK se suma a la deuda) | 2026: 2.856 en efectivo + 1.060 PIK |
| 8. Cada año: impuestos | 25 % × (EBIT − gasto financiero deducible) | 2026: deducible 3.800 (= 30 % × 12.667); se arrastran 381 |
| 9. Cada año: flujo para la deuda | resultado neto + amortización + PIK + comisiones amortizadas − capex − Δ circulante | 2026: 3.843 |
| 10. Cada año: devolución | obligatoria (2.561) + barrido del resto | deuda total 52.992 → 32.114 en 2030 |
| 11. EV de salida | 9,0 × EBITDA 2030 (16.159) | 145.431 |
| 12. Patrimonio de salida | EV − deuda neta (32.114 − 3.000) | **116.317** |
| 13. MOIC | 116.317 / 62.630 | **1,86x** |
| 14. TIR | MOIC^(1/5) − 1 (no hay flujos intermedios) | **13,2 %** |
| 15. Puente de valor | crecimiento del EBITDA (+40.612) + cambio de múltiplo (−4.296) + desapalancamiento (+20.878) − comisiones (3.507) | +53.687 = 116.317 − 62.630 |
| 16. Precio máximo para TIR del 20 % | se busca el precio que da exactamente 20 % | **8,08 €** (prima de solo 7,7 %) |

**Conclusión que el modelo quiere enseñar:** a 9,375 € la operación rinde un 13,2 %, por debajo del 20 % que suele exigir un fondo. Para llegar al 20 % el fondo solo podría ofrecer 8,08 €, una prima del 7,7 % que los accionistas difícilmente aceptarían. El comité no la aprobaría tal cual: es el punto de partida del IC memo.

**Art. 16.5 LIS:** la deuda es el 47,1 % del precio, por debajo del 70 %. Además baja cada año más deprisa que la senda lineal hacia el 30 % en 8 años (en 2030 está en el 28,5 %). Ver `acquisitionDebtTest`; queda pendiente de verificar con la norma vigente.

### 5 comprobaciones con calculadora

| # | Calcula | Resultado esperado |
|---|---|---|
| 1 | (112.500 − 3.385) / 11.776 | 9,27 (múltiplo de entrada) |
| 2 | 112.500 + 12.000 + 2.182 + 1.325 − 52.992 − 12.385 | 62.630 (capital del fondo) |
| 3 | 0,30 × 12.667 | 3.800 (gasto financiero deducible 2026; los gastos fueron 4.181) |
| 4 | 9 × 16.159 − 29.114 | 116.317 (patrimonio de salida) |
| 5 | (116.317 / 62.630)^(1/5) − 1 | ≈ 0,1318 (TIR del 13,2 %) |

### Conceptos que necesitas

| Concepto | Dónde se enseña |
|---|---|
| OPA | N1 (intuición); precio equitativo y OPA de exclusión en la rama IB (unidad 9) |
| Préstamo bancario y sindicado, emisión de bonos, estructura de capital, TIR de un proyecto | N3 |
| Impuesto sobre sociedades | N3 |
| LBO (intuición) | N8 |
| LBO completo; deuda de adquisición en España (art. 16 LIS y fusión apalancada) | Rama Investment Banking (unidad 7) |
| Retornos de un fondo, IC memo | Rama Private Equity y VC |

---

## 4. Merger model (Grupo Azahar Calderona compra Naranjas del Turia)

### Qué pregunta responde
Si una empresa alimentaria más grande compra Naranjas del Turia, ¿sube o baja el beneficio por acción (BPA) de la compradora? Es decir, ¿la compra es acrecitiva o dilutiva, y cuántas sinergias hacen falta para que no empeore el BPA?

### Hipótesis clave

| Hipótesis | Valor | De dónde sale | Tipo |
|---|---|---|---|
| Precio de oferta | 10,50 € (+40 % sobre 7,50 €) | El comprador industrial paga más que el fondo gracias a las sinergias | ⚠️ / 📘 |
| Pago | 50 % efectivo y 50 % acciones nuevas | Supuesto | 📘 |
| Compradora | 21 € por acción, 60 millones de acciones, caja 80.000, deuda 150.000 (2025) | Ficha de Azahar en `companies.json` (ficticia) | ✅ (universo) |
| Beneficio de la compradora | 90.000 / 95.400 / 100.170 (2026–2028) | Previsión supuesta (+9 % sobre 2025, luego +6 % y +5 %) | 📘 |
| Beneficio de Naranjas | 7.630 / 8.147 / 8.646 | Modelo de 3 estados | ✅ (vía 3 estados) |
| Financiación del efectivo | 40 % caja (rinde un 2 %), 60 % deuda nueva al 5 % con comisión del 1 % | Supuesto | 📘 |
| Sinergias de costes | 3.000 al año; 50 % el primer año | Supuesto (logística y compras) | 📘 |
| Intangibles identificados (PPA) | 25.000, amortizables en 10 años | Supuesto (marca y clientes) | 📘 |
| Comisiones de asesoramiento | 1,5 % del precio, pagadas al cierre (fuera del BPA recurrente) | Supuesto | 📘 |
| Impuestos | 25 % | Art. 29 LIS | ✅ |
| Fondo de comercio | no se amortiza (NIIF, cotizada que consolida); con PGC se amortizaría en 10 años | NIIF 3 / NIC 36 / PGC | ✅ norma |

### Recorrido de las cifras

| Paso | Fórmula | Resultado |
|---|---|---|
| 1. Precio total | 10,50 € × 12.000.000 | 126.000 (EV 122.615 = 10,4x EBITDA; 16,5 veces el beneficio de 2026) |
| 2. Contraprestación | mitad en efectivo, mitad en acciones | 63.000 + 63.000 |
| 3. Acciones nuevas | 63.000 / 21 € | 3.000 (miles); por acción de Naranjas: 0,25 acciones + 5,25 € |
| 4. Efectivo a financiar | 63.000 + comisiones 1.890 = 64.890 → 40 % caja 25.956; 60 % deuda 38.934 / 0,99 | deuda nueva 39.327 |
| 5. PPA | exceso = 126.000 − patrimonio contable 37.912 = 88.088 | — |
| 6. Fondo de comercio | exceso − intangibles + impuesto diferido = 88.088 − 25.000 + 6.250 | **69.338** |
| 7. Beneficio pro forma 2026 | 90.000 + 7.630 + sinergias 1.125 − caja que deja de rendir 389 − intereses nuevos 1.475 − amortización de intangibles 1.875 − comisión de financiación 59 (todo después de impuestos) | 94.957 |
| 8. Acciones pro forma | 60.000 + 3.000 | 63.000 |
| 9. BPA pro forma | 94.957 / 63.000 | 1,5073 € |
| 10. Acreción / dilución | BPA pro forma / BPA solo (90.000 / 60.000 = 1,50 €) − 1 | **+0,48 %** (2027: +1,83 %; 2028: +1,99 %) |
| 11. Sinergias de equilibrio | (BPA solo × acciones pro forma − beneficio sin sinergias) / (1 − t) | 2026: **891** antes de impuestos |

**Lectura que el modelo quiere enseñar:** la parte en acciones diluye, porque el P/E de la compradora (14x) es menor que el que paga (16,5x). La parte en efectivo acrece, porque la deuda cuesta un 3,75 % después de impuestos y el beneficio de Naranjas rinde un 6,1 % sobre el precio. Sin sinergias el año 1 es prácticamente neutro; las sinergias deciden.

### 5 comprobaciones con calculadora

| # | Calcula | Resultado esperado |
|---|---|---|
| 1 | 10,50 / 7,50 − 1 | 0,40 (prima del 40 %) |
| 2 | 63.000 / 21 | 3.000 (miles de acciones nuevas) |
| 3 | 126.000 − 37.912 − 25.000 + 0,25 × 25.000 | 69.338 (fondo de comercio) |
| 4 | (94.957 / 63.000) / 1,5 − 1 | ≈ 0,0048 (+0,48 %) |
| 5 | (1,5 × 63.000 − (94.957 − 1.125)) / 0,75 | ≈ 891 (sinergias de equilibrio 2026) |

### Conceptos que necesitas

| Concepto | Dónde se enseña |
|---|---|
| OPA | N1 |
| Fondo de comercio y deterioros (PGC frente a NIIF), impuestos diferidos (NIC 12), múltiplos | N3 |
| M&A y sinergias (intuición) | N8 |
| M&A completo: acreción/dilución, PPA, due diligence; SPA y earn-out | Rama Investment Banking (unidad 6 y 8) |

---

## Pendiente antes de dar los modelos por buenos

- Verificar los datos ⚠️ con su fuente: Tesoro Público / Banco de España para el bono y Damodaran para la prima y la beta. La cotización de 7,50 € es un supuesto y se puede quedar como tal si se dice.
- Comprobar en la CNMV y el Registro Mercantil que «Marjal Capital Partners» y «Grupo Azahar Calderona» no coinciden con entidades reales (lo hace Javier).
- Contrastar con los apuntes: convención de mitad de año (Rosenbaum y Pearl, cap. 3), Hamada, art. 16 y 16.5 LIS y NIIF 3.
