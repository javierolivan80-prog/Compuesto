# docs/TEMARIO.md — Contenido de Compuesto

> Colócalo en `docs/TEMARIO.md`. Define el itinerario completo (año troncal + itinerario Pro de 6 ramas), el mapa de conceptos, los tipos de ejercicio, el test de nivel, el esquema JSON y el control de calidad. Los minijuegos se diseñan en `docs/JUEGOS.md`.

---

## 0. A dónde lleva

> **Orden «directo a mercados»** (aprobado por Javier el 17/10/2026, `docs/cambios/rumbo-juego-mercado/`): se empieza en la bolsa, cada unidad gira alrededor de un juego y de La Mesa, y la teoría llega después explicando lo que te ha pasado. Las finanzas personales (antiguo Nivel 0) son una **Base opcional** en Practicar.

| Tramo | Duración | Nivel al terminar |
|---|---|---|
| Plantas 0–2 | Semanas 1–22 (menos con tests de salto) | Mercados en vivo, leer y valorar una empresa, tipos y bonos: lo que la carrera da por sabido y bastante de 2.º |
| Plantas 3–5 | Semanas 23–38 | Macro y banca, trading y microestructura, carteras y riesgo de 2.º–4.º de carrera |
| Plantas 6–9 | Semanas 39–49 | Amplitud del **CFA Nivel I** (los 10 bloques) + lo específico de España, y examen final |
| Base (opcional) | Cuando quieras | Inflación, interés compuesto, préstamos, bancos y pensiones |
| **Itinerario Pro** (6 ramas) | 8–12 semanas cada una | **Nivel técnico de entrevista y de primer año** de analista en investment banking, equity research, private equity, mercados o riesgos: hacer los modelos y entregables reales, no solo conocer los conceptos |

**Lo que diferencia el nivel Pro:** no basta con saber qué es un LBO; hay que **construirlo** (fuentes y usos, calendario de deuda, cash sweep, TIR y MOIC), defenderlo ante un comité y responder preguntas técnicas de entrevista con presión de tiempo. Cada rama Pro se organiza alrededor de los **entregables que hace un analista real** (ver §3).

Promesa honesta: conocimientos y práctica técnica a nivel de analista junior. No sustituye la experiencia, un título oficial ni el CFA.

---

## 1. Estructura

Planta (= rango) → Unidad → Lección → Ejercicios.
- **Planta y nivel de contenido.** Cada planta enseña un nivel de contenido. El nivel es un identificador (`n1-u4-l7`) y no cambia nunca; la planta es el orden en que se presenta (`src/engine/floors.ts`, y `curriculum.json` lo repite; `content:validate` comprueba que coinciden):

| Planta | Rango | Nivel de contenido | Bloque |
|---|---|---|---|
| 0 | Becario | N1 | Mercados en vivo |
| 1 | Analista Junior | N3 | Leer una empresa: contabilidad, finanzas corporativas y valoración |
| 2 | Analista | N2 | Tipos, bonos y productos |
| 3 | Asociado | N4 | Macro que mueve precios: macro, finanzas internacionales y banca |
| 4 | VP | N5 | Trading y microestructura |
| 5 | Director | N6 | Carteras, riesgo y alternativos |
| 6 | Director Sénior | N7 | Derivados |
| 7 | Managing Director | N8 | Finanzas profesionales y fintech |
| 8 | Partner | N9 | Historia, regulación, ética y fiscalidad |
| 9 | Leyenda | N10 | Despacho de socios: examen final del año |
| Base | — | N0 | El dinero (opcional, en Practicar) |

- Los **prerrequisitos** de un concepto deben enseñarse en su planta o antes (la Base cuenta como anterior a todo).
- **Año troncal:** 10 plantas, ~49 semanas, ~700 lecciones, más la Base.
- **Itinerario Pro:** 6 ramas de 8–12 semanas. Se desbloquean al aprobar el nivel indicado y se pueden hacer en paralelo al troncal (a costa de avanzar más despacio) o al terminarlo. Con el orden nuevo, Investment Banking (se abre al aprobar N3) queda disponible desde la planta 1.
- 4–8 unidades por planta · 4–7 lecciones por unidad · **6–10 ejercicios por lección (3–5 min)**.
- **Lección-juego** (planta 0 en adelante, cada unidad tiene al menos una y la abre): se juega primero; la explicación y los ejercicios usan las cifras de tu partida; en el repaso, los ejercicios usan cifras nuevas (`params`). Campo `game` y `order: 0` en el JSON de la lección.
- Cada unidad termina con **Jefe final** (≥80 %) y una tarjeta **"Dónde verás esto"**.
- Una vez por semana, **Encargo del jefe** sobre el caso hilo (8–10 min, varios pasos).
- Cada planta y cada rama terminan con **Comité de inversión** + diploma PDF local para tu Despacho.
- **Orden de producción:** primero la planta 0 rehecha como lecciones-juego (una unidad cada vez, con revisor y revisión de Javier). Después, la planta 1 y el resto del troncal, adelantando lo que coincida con la carrera en cada cuatrimestre. Las ramas Pro, empezando por Investment Banking y Equity Research/Buy-side, en cuanto su nivel de desbloqueo esté publicado (ver `FASES.md`).
- **Presupuesto realista:** apuntar en `CONTENIDO-QA.md` las horas reales de revisión por unidad para ajustar el ritmo; es preferible un temario más corto y correcto que uno completo con errores.

### Hilos transversales (en todos los niveles)
- **🧮 Mates del mercado:** la herramienta matemática que necesita el nivel siguiente.
- **🏛 Hacienda:** cada producto con cómo tributa en España (`verificarAntesDe`).
- **🧠 Mente:** un sesgo conductual por unidad.
- **📊 Excel:** funciones de hoja de cálculo practicadas en `spreadsheet`.
- **⚖️ Ética:** un caso por nivel con los Estándares de Conducta de CFA Institute y la normativa española (conflictos de interés, información privilegiada, idoneidad); el Nivel 9 los integra.
- **📄 Documento real:** al menos una lección por nivel trabaja con un fragmento de un documento público real (cuentas anuales, folleto, KID de un fondo, nota de prensa del BCE) con el ejercicio `document_read`.

---

## 2. Año troncal

Cada bloque lleva su nivel de contenido (N1, N3…), que es el prefijo de sus IDs.

**Planta 0 · Becario — Mercados en vivo (N1, sem. 1–6)**
Empresa y acción · mercado primario/secundario, OPV · BME, mercado continuo, IBEX 35, **BME Growth**, índices mundiales · formación de precios, horquilla, liquidez · órdenes y subastas · cómo abrir un bróker en España · dividendos, **scrip dividend**, ampliaciones y **derechos de suscripción**, splits, recompras · **OPAs** (cómo funcionan en España) · capitalización y free float · OTC.
🧮 rentabilidad total, rentabilidad por dividendo · 🏛 ganancias patrimoniales, dividendos, venta de derechos · 🧠 FOMO y efecto manada · 📊 porcentajes, VF, VA · 📄 anuncio de una OPA en la CNMV.
**Unidades de la planta 0 y su juego** (IDs de siempre; cambia el orden): 1. La empresa y la acción (`n1-u1`) → **Tus primeras acciones** (`n1-u1-l6`, hecho: noticias de Naranjas, capitalización y free float) · 2. Precios, órdenes y subastas (`n1-u4`) → **La compra grande** (`n1-u4-l7`, hecho) y **La subasta de apertura** (`n1-u4-l8`, hecho) · 3. Bolsas e índices (`n1-u3`) → **¿Quién mueve el índice?** (`n1-u3-l6`, hecho) · 4. Operar en España: bróker, dividendos y fiscalidad (`n1-u5`) → **El primer dividendo** (`n1-u5-l7`, hecho) · 5. Mercado primario y secundario (`n1-u2`) · 6. Operaciones corporativas y OPAs (`n1-u6`) → *rumor de OPA*. Psicología (FOMO, manada, exceso de confianza → *El trader impulsivo*) va dentro de las unidades 2 y 4 hasta que tenga unidad propia.

**Planta 1 · Analista Junior — Leer una empresa (N3, sem. 7–16)**
Balance, PyG, flujos de caja y cómo se conectan · **PGC español vs NIIF/IFRS** · **consolidación** (minoritarios, puesta en equivalencia), **fondo de comercio y deterioros** (amortización en 10 años en PGC frente a test de deterioro en NIIF), provisiones, **arrendamientos (IFRS 16)**, **reconocimiento de ingresos (NIIF 15)**, **impuestos diferidos (NIC 12)** · estado de flujos por el método indirecto construido desde dos balances · ratios y análisis: árbol DuPont, ROIC frente a WACC, conversión de beneficio en caja · **circulante y ciclo de caja** · **financiación de la empresa:** préstamo bancario y sindicado, leasing, renting, factoring, confirming, emisión de bonos · estructura de capital (Modigliani-Miller intuitivo) · **coste de capital: CAPM, beta apalancada y desapalancada (Hamada), coste de la deuda después de impuestos y WACC** · política de dividendos · presupuesto de capital (VAN, TIR) · múltiplos · DCF paso a paso (FCFF, mitad de año, valor terminal por Gordon y por múltiplo) · trampas contables.
🧮 VAN, TIR, crecimiento compuesto · 🏛 impuesto de sociedades · 🧠 anclaje · 📊 VNA, TIR, modelo de 3 estados · 📄 cuentas anuales de una cotizada española.

**Planta 2 · Analista — Tipos, bonos y productos (N2, sem. 17–22)**
**Renta fija:** cupón, precio vs tipos, precio limpio y sucio (cupón corrido, convención de días), TIR, curva de tipos, **curva cupón cero** (bootstrapping) y tipos forward, duración y **convexidad**, rating y **spread de crédito**, Letras y Bonos del Tesoro · **mercado monetario y repo** · **cédulas hipotecarias y titulizaciones** · fondos, TER y traspasos · ETFs · planes de pensiones · inmobiliario: SOCIMIs, REITs · materias primas · divisas · cripto (MiCA) · introducción a derivados · productos complejos y avisos de la CNMV.
🧮 estadística básica: media, desviación típica, normal, colas gordas · 🏛 fondos, ETFs, pensiones, cripto · 🧠 ilusión de control · 📊 PROMEDIO, DESVEST, gráficos · 📄 KID (documento de datos fundamentales) de un fondo.

**Planta 3 · Asociado — Macro que mueve precios (N4, sem. 23–29)**
PIB, IPC, paro, PMI · calendario macro · BCE, Fed, Banco de España, QE/QT · curva de tipos e inversión · ciclo y rotación sectorial · política fiscal, deuda pública, prima de riesgo · **finanzas internacionales:** balanza de pagos, paridad del poder adquisitivo, paridad de tipos de interés, mercados emergentes · **banca por dentro:** margen de intereses, solvencia (CET1), Basilea, liquidez (LCR, NSFR), test de estrés · **riesgo de crédito básico:** PD, LGD, EAD, morosidad, provisiones IFRS 9 (intuición) · **supervisión:** Unión Bancaria, MUS, FROB, resolución · **valorar bancos** (P/VTC, ROTE).
🧮 tasas interanuales, índices, correlación · 🏛 deuda pública en el IRPF · 🧠 sesgo de narrativa · 📊 series temporales · 📄 nota de prensa de política monetaria del BCE.

**Planta 4 · VP — Trading y microestructura (N5, sem. 30–33)**
Libro de órdenes · market makers, HFT, dark pools · subastas · costes reales de operar · cortos y préstamo de valores · análisis técnico con mirada crítica (evidencia y por qué la mayoría del minorista pierde) · eficiencia de mercado (formas débil, semifuerte y fuerte) y anomalías · gestión del riesgo de una operación (stop, tamaño de posición).
🧮 probabilidad, valor esperado, contraste de hipótesis, p-valor e intervalos de confianza · 🏛 regla de los dos meses, compensación de pérdidas · 🧠 exceso de confianza, aversión a la pérdida · 📊 SI, BUSCARX · 📄 informe de la CNMV sobre resultados de inversores minoristas en CFD (o equivalente vigente).

**Planta 5 · Director — Carteras, riesgo y alternativos (N6, sem. 34–38)**
Rentabilidad simple/log, TWR vs MWR · volatilidad, correlación, diversificación · Markowitz · CAPM y beta (estimación por regresión, beta ajustada y errores típicos; amplía lo visto en N3) · Sharpe, Sortino, ratio de información y tracking error, drawdown · VaR y CVaR · factores · pasiva vs activa, atribución de resultados (Brinson-Fachler) · **alternativos como inversión:** private equity, hedge funds, deuda privada, infraestructuras · ESG y SFDR · asset allocation (media-varianza, Black-Litterman y paridad de riesgo a nivel intuitivo) y rebalanceo · **Monte Carlo** y **trampas del backtesting** · efecto compuesto de las comisiones.
🧮 covarianza, regresión (coeficientes, t, R² y sus trampas), simulación · 🏛 optimización fiscal legal de una cartera · 🧠 contabilidad mental · 📊 matriz de correlaciones · 📄 informe periódico de un fondo.

**Planta 6 · Director Sénior — Derivados (N7, sem. 39–42)**
Futuros y forwards (precio por coste de financiación, base, liquidación diaria de márgenes) · opciones · payoffs · **paridad put-call** · valor intrínseco y temporal · **modelo binomial** de uno y dos pasos (réplica y probabilidad neutral al riesgo) · Black-Scholes con números · griegas · estrategias · swaps de tipos y divisa · CDS · apalancamiento y margin call · coberturas en empresas (caso hilo).
🧮 árboles binomiales, volatilidad implícita (intuición) · 🏛 tributación de derivados · 🧠 sesgo de resultado · 📊 tablas de payoff · 📄 folleto de un producto estructurado.

**Planta 7 · Managing Director — Finanzas profesionales y fintech (N8, sem. 43–45)**
Mapa del sector (banca comercial, de inversión, asset management, PE, VC, hedge funds, research, trading, riesgos, compliance) · OPV, M&A, LBO y VC **a nivel de intuición** (los modelos se construyen en las ramas Pro) · **panorama fintech:** pagos, neobancos, open banking, euro digital, tokenización, IA en finanzas · CFA, EFPA, FRM · prácticas en banca en España.
🧮 TIR de un LBO · 🏛 fiscalidad de M&A (intuición) · 🧠 pensamiento de grupo · 📊 LBO simplificado, sensibilidades · 📄 folleto de una OPV española.

**Planta 8 · Partner — Historia, regulación, ética y fiscalidad (N9, sem. 46–48)**
Burbujas y crisis: tulipanes, 1929, puntocom, 2008, **burbuja inmobiliaria española**, **crisis de las cajas y Bankia**, deuda europea 2012, **resolución del Banco Popular (2017)**, COVID, SVB 2023 · fraudes (Ponzi, Madoff, Enron, Wirecard, pump and dump, chiringuitos) · regulación: CNMV, ESMA, MiFID II, idoneidad y conveniencia, abuso de mercado · **prevención del blanqueo y KYC** · protección del cliente bancario y reclamaciones al Banco de España · fiscalidad avanzada: 720/721, doble imposición, **Patrimonio y Sucesiones** (ejemplo: Comunidad Valenciana) · ética y conflictos de interés · repaso integrador.

**Planta 9 · Leyenda · Despacho de socios:** examen final del año (N10).

**Base (opcional, N0) — El dinero**
Inflación y poder adquisitivo · interés simple y **compuesto** (lección fundacional), regla del 72 · TIN vs TAE · presupuesto y fondo de emergencia · deuda, préstamos, hipotecas (fijo, variable, Euríbor), alquilar vs comprar · cómo funciona un banco y cómo se crea el dinero · depósitos y Fondo de Garantía de Depósitos · seguros básicos · **pensiones públicas en España** (Seguridad Social y los tres pilares) · riesgo y rentabilidad.
🧮 porcentajes, tasas, valor temporal del dinero · 🏛 intereses en el IRPF · 🧠 sesgo del presente · 📊 celdas, SUMA, referencias · 📄 ficha de información precontractual de un depósito.
No es una planta: está en Practicar y el Camino no la exige. Sus ideas aparecen dentro de los juegos (la inflación es la línea que tu cartera tiene que batir en La Mesa; el interés compuesto, la curva de tu cartera).

---

## 3. Itinerario Pro

Cada rama: Comité final, diploma, juego propio (JUEGOS.md §4), caso hilo propio dentro de Albufera Partners y un **banco de preguntas de entrevista** (técnicas y de comportamiento) que alimenta el juego **Superday**.

**Formatos exclusivos del nivel Pro**
- **Modelo por piezas:** un modelo completo (3 estados, DCF, LBO, fusión) se construye a lo largo de 5–8 lecciones con `spreadsheet` y `build_statement`; cada lección parte del estado que dejó la anterior y el resultado final se compara con el **modelo de referencia** (skill `modelo-referencia`). Los modelos viven en `/content/shared/models/` (hipótesis, resultados y tests de cuadre; ya existen 3 estados, DCF, LBO y merger de Naranjas del Turia). Cada ejercicio cita su origen con `modelRef` y `content:validate` comprueba que la cifra coincide. Pendientes, por orden: comps y precedentes (5 cotizadas ficticias del sector alimentario en `companies.json`), modelo de resultados trimestral, banco ficticio (balance, IFRS 9, capital), cascada de un fondo de PE y cap table de una startup ficticia.
- **Deal room:** `case_step` de varios días que simula un proceso real (p. ej. venta de una empresa: teaser → NDA → CIM → ofertas no vinculantes → due diligence → oferta vinculante → firma).
- **Pitch al comité:** defender una tesis (compra/venta/pasa) con `best_argument` + `self_explain` y rúbrica: tesis, valoración, catalizadores, riesgos, qué te haría cambiar de opinión.
- **Superday:** rondas cronometradas de preguntas técnicas tipo entrevista ("walk me through a DCF", "¿qué pasa con los tres estados si la depreciación sube 10?", "¿por qué un LBO funciona?").
- **Leer como un profesional:** fragmentos de folletos de OPV, informes de fairness, notas de research y comunicados de OPA reales de la CNMV con `document_read`.

**🏛 Investment Banking** — desbloquea al aprobar N3 · 12 semanas
1. **Contabilidad para banqueros:** ajustes no recurrentes, EBITDA ajustado, del equity value al enterprise value (EV bridge: deuda neta, minoritarios, asociadas, preferentes, arrendamientos IFRS 16), dilución por opciones (treasury stock method).
2. **Comparables cotizados:** selección del grupo, calendarización de ejercicios, múltiplos LTM y forward, outliers. *Entregable:* tabla de comps.
3. **Transacciones precedentes:** prima de control, sinergias implícitas. *Entregable:* tabla de precedentes.
4. **DCF de banco de inversión:** FCFF, convención de mitad de año, periodos stub, valor terminal por Gordon y por múltiplo (y cómo se contradicen), WACC con beta desapalancada y reapalancada. *Entregable:* DCF + football field con el LBO como suelo de valoración.
5. **Modelo de 3 estados completo** con calendarios (circulante, activo fijo, deuda, patrimonio) y su comprobación.
6. **M&A:** estructura de la operación, contraprestación en efectivo/acciones, acreción/dilución, asignación del precio de compra (PPA) y fondo de comercio, sinergias, fairness opinion. *Entregable:* merger model.
7. **LBO:** fuentes y usos, tramos de deuda (senior, TLB, high yield, mezzanine), calendario de deuda, cash sweep, covenants, TIR y MOIC, recapitalización por dividendo, límites fiscales de la deuda de adquisición en España (art. 16 LIS) y fusión apalancada. *Entregable:* LBO completo.
8. **Proceso de venta y compra:** teaser, CIM, lista de compradores, process letter, IOI y LOI, data room, due diligence financiera (calidad del beneficio, EBITDA y capital circulante normalizados, deuda financiera neta), SPA con *locked box* frente a *completion accounts*, earn-out, W&I. *Entregables:* teaser, buyer list, process letter, puente de EBITDA ajustado.
9. **ECM:** OPV (bookbuilding, greenshoe, lock-up, estabilización), colocaciones aceleradas, ampliaciones con derechos en España, OPAs y su regulación (CNMV): precio equitativo, OPA de exclusión, venta y compra forzosas, control de inversiones extranjeras.
10. **DCM y financiación apalancada:** emisiones de bonos, ratings, covenants, high yield, préstamos sindicados, TLB, CLOs.
11. **Reestructuraciones:** cascada de prelación, quitas y esperas, canje de deuda por capital, clases de acreedores, arrastre entre clases y regla de prioridad absoluta, **planes de reestructuración del TRLC (reforma 2022)**.
12. **El oficio:** pitch book, estructura de un equipo, horarios, cómo se revisa un modelo (`audit-xls`), errores típicos de analista. *Skills de referencia (financial-services):* `comps-analysis`, `dcf-model`, `3-statement-model`, `merger-model`, `lbo-model`, `teaser`, `cim-builder`, `buyer-list`, `process-letter`, `strip-profile`, `pitch-deck`, `audit-xls`.

**📊 Equity Research y Buy-side (inversión en renta variable)** — desbloquea al aprobar N3 · 10 semanas
1. **Cómo piensa un inversor profesional:** tesis en menos de 200 palabras, percepción diferencial (variant perception), catalizadores, margen de seguridad, horizonte, círculo de competencia, foso y ROIC frente a WACC, equipo directivo y asignación de capital, pensar al revés (pre-mortem) y tasas base. *Entregable:* checklist de inversión con filtro de calidad (ROE medio, flujo libre acumulado, cobertura de intereses, margen bruto, flujo operativo / beneficio, margen neto, dilución).
2. **Modelo de resultados:** del guidance al modelo, consenso, sorpresas, revisiones de estimaciones. *Entregable:* earnings model.
3. **Valoración avanzada:** FCFF vs FCFE, renta residual, suma de partes, valoración por sectores (bancos con P/VTC y ROTE, aseguradoras, utilities reguladas, inmobiliarias con NAV, tecnológicas con unit economics).
4. **Calidad del beneficio:** conversión a caja, ajustes agresivos, señales de alerta contable (casos Wirecard, Enron, Pescanova).
5. **Análisis de resultados en vivo:** qué mirar el día de resultados. *Entregables:* earnings preview y earnings update.
6. **Initiating coverage:** estructura de un informe completo y recomendación. *Entregable:* informe de inicio de cobertura.
7. **Análisis sectorial y cadena de valor.** *Entregable:* sector overview.
8. **Del análisis a la cartera:** tamaño de posición, convicción, seguimiento de tesis, cuándo vender (me equivoqué, cambió el negocio o hay algo mejor) con supuestos clave y líneas rojas escritas antes de comprar, catalyst calendar. *Entregables:* thesis tracker y calendario de catalizadores.
9. **Estrategias de hedge funds:** long/short, event-driven y merger arbitrage, activismo, macro, crédito, cuantitativas; atribución de resultados (repasa el Brinson de N6) y exposición a factores.
10. **Ventas en corto como inversor:** tesis bajista, coste del préstamo, short squeeze, informes de short sellers. *Skills de referencia:* `earnings-analysis`, `earnings-preview`, `initiating-coverage`, `model-update`, `morning-note`, `sector-overview`, `thesis-tracker`, `catalyst-calendar`, `idea-generation`.

**💼 Private Equity y Venture Capital** — desbloquea al terminar la unidad de LBO de Investment Banking · 8 semanas
1. Cómo funciona un fondo: GP/LP, comisiones (2/20), carry, waterfall, hurdle, vintage, J-curve, TVPI/DPI/IRR.
2. Originación y screening de operaciones. *Entregables:* deal sourcing y deal screening.
3. Due diligence comercial, financiera y legal. *Entregable:* checklist de DD.
4. Memo para el comité de inversión. *Entregable:* IC memo.
5. Plan de creación de valor y seguimiento de KPIs de la participada. *Entregables:* value creation plan y portfolio monitoring.
6. Salidas: venta a industrial, secundario, OPV; análisis de retornos. *Entregable:* returns analysis.
7. Venture capital: rondas, valoración pre/post-money, cap table, preferencias de liquidación, antidilución, SAFE y notas convertibles; unit economics (CAC, LTV, payback, cohortes). *Entregable:* unit economics.
8. Private credit y secundarios. *Skills de referencia:* `deal-sourcing`, `deal-screening`, `dd-checklist`, `ic-memo`, `value-creation-plan`, `portfolio-monitoring`, `returns-analysis`, `unit-economics`.

**🏦 Banca y riesgos** — desbloquea al aprobar N4 · 8 semanas
Productos de activo y pasivo para particulares y empresas · riesgo de crédito avanzado (scoring, rating interno, modelos IRB a nivel intuitivo, precio de un préstamo con RAROC) · **IFRS 9 completo:** clasificación (modelo de negocio y prueba SPPI), fases y aumento significativo del riesgo, pérdida esperada a 12 meses y a toda la vida ponderada por escenarios, matriz de provisiones · ALM e IRRBB (valor económico y margen) · liquidez y financiación (LCR, NSFR) · riesgo de mercado y operacional (método estándar) · **capital con Basilea III final (CRR3):** APR estándar frente a IRB, suelo de resultados, ratio de apalancamiento, colchones (conservación, anticíclico, sistémicos), Pilar 2 (P2R, P2G) y SREP, MREL; cifras vigentes siempre con fuente y `verificarAntesDe` · gestión de dudosos y titulizaciones con transferencia de riesgo · test de estrés · banca privada y asesoramiento bajo MiFID · prevención del blanqueo avanzada · caso: un año en el comité de riesgos.

**📈 Mercados, Sales & Trading** — desbloquea al aprobar N5 · 10 semanas
Renta fija avanzada (inmunización, carry y roll-down, posicionamiento en curva, crédito y CDS, swaps y curva swap) · derivados avanzados (griegas de cartera, volatilidad implícita, sonrisa y superficie, estructurados y exóticos básicos) · divisas y materias primas · market making e inventario · ejecución y algoritmos (VWAP, TWAP, implementation shortfall) · cómo funciona una mesa (sales, trading, structuring, research) · riesgo de mesa (VaR, límites, P&L explain) · caso: un trimestre como trader junior.

**⚙️ Fintech y cuantitativo** — desbloquea al aprobar N6 · 8 semanas
Medios de pago y su infraestructura · open banking (PSD2/PSD3) · euro digital · cripto, DeFi y tokenización bajo MiCA · regtech · IA en finanzas · **Python para finanzas** en el navegador (Pyodide) · series temporales · modelos de factores · Monte Carlo y backtesting rigurosos (sesgos de supervivencia y look-ahead, walk-forward, contraste múltiple y Sharpe deflactado) · volatilidad EWMA y GARCH · regresión con errores robustos · caso: lanzar un producto fintech en Albufera Partners.

**Orden por defecto:** Investment Banking → Equity Research y Buy-side → Private Equity y VC → Banca y riesgos → Mercados → Fintech. Se puede cambiar en Ajustes.

---

## 3b. Cobertura CFA y bibliografía de referencia

**Mapa CFA.** Cada lección lleva el campo `cfa` con el bloque al que pertenece (Ethics, Quantitative Methods, Economics, Financial Statement Analysis, Corporate Issuers, Equity, Fixed Income, Derivatives, Alternative Investments, Portfolio Management). `content:check` genera un informe de cobertura por bloque. Objetivo: el troncal cubre los 10 bloques del Nivel I; las ramas Pro profundizan hasta partes del Nivel II (valoración de renta variable con FCFF/FCFE y renta residual, análisis de crédito, valoración de derivados, inversiones intersocietarias) y del III (construcción de carteras). Los bloques se verifican contra el temario publicado por CFA Institute en la fecha de producción.

**Bibliografía base** (para generar y verificar contenido; se cita, no se copia):
- Valoración y banca de inversión: Rosenbaum y Pearl, *Investment Banking: Valuation, LBOs, M&A and IPOs*; Koller, Goedhart y Wessels (McKinsey), *Valuation*; Damodaran, *Investment Valuation* y sus datos públicos (betas, primas de riesgo por país).
- Finanzas corporativas e inversiones: Berk y DeMarzo, *Corporate Finance*; Bodie, Kane y Marcus, *Investments*.
- Análisis de estados financieros: Penman, *Financial Statement Analysis and Security Valuation*; PGC y NIIF-UE (BOE, EFRAG).
- Renta fija y derivados: Fabozzi, *Bond Markets, Analysis and Strategies*; Hull, *Options, Futures and Other Derivatives*.
- Inversión: Graham, *The Intelligent Investor*; Greenwald, *Value Investing*; memorandos de Howard Marks.
- España: CNMV (folletos, OPAs, guías), Banco de España (Memoria de Supervisión, Informe de Estabilidad Financiera), TRLC, AEAT.

Regla: cada unidad Pro indica en `sources` la referencia concreta (libro y capítulo o documento oficial) que respalda cada concepto no trivial.

---

## 4. Mapa de conceptos y dominio

- `/content/shared/concepts.json`: cada concepto con `id`, nombre, nivel, y **prerrequisitos** (p. ej. `wacc` requiere `coste-deuda`, `coste-capital`, `estructura-capital`).
- Cada ejercicio declara los conceptos que evalúa (`concepts: [...]`).
- El dominio se mide **por concepto** (proyección de eventos). Si fallas un concepto de forma repetida, el repaso incluye también sus prerrequisitos débiles.
- La pantalla "Cartera de conocimiento" muestra el mapa de conceptos como una constelación que se ilumina al dominarlos.
- `content:validate` comprueba que no hay ciclos en el mapa y que ningún ejercicio usa un concepto antes de su nivel.
- El repaso califica con tres niveles de FSRS: fallo (Again), acierto con pista o con más del doble del tiempo mediano (Hard) y acierto limpio (Good). Si el concepto tiene variantes o el ejercicio es paramétrico, el repaso muestra otra variante.

---

## 5. Tests de salto

- Cada unidad tiene un **test de salto** de 8 preguntas (sacadas de un banco propio de 12 por unidad, etiquetado por concepto y revisado como el resto, para que la segunda fase tenga preguntas nuevas) con al menos una pregunta por objetivo y ≥50 % de tipo producir. Con 7 u 8 aciertos la unidad queda dominada; con 6 se ofrecen 4 preguntas más y hay que acertar 3. Los conceptos saltados entran en el repaso con una primera comprobación a los 7 días.
- **Saltar nivel completo:** encadena los tests de salto de todas sus unidades.
- No hay test de nivel inicial largo: el onboarding lleva a la primera lección en menos de 60 s.

---

## 6. Tipos de ejercicio

**Cómo se cuenta la mezcla.** La categoría depende del tipo: reconocer = tipos 1–4; producir = 5–11; aplicar y argumentar = 12–19. El **Bloom** se declara en cada ejercicio y es independiente del tipo (un `fill_blank` puede ser "recordar"; un `multiple_choice` puede ser "analizar"). Para los Niveles 0–2 se exige a la vez: ≤40 % reconocer, ≥40 % producir y ≥50 % del total con Bloom recordar/entender. Ejemplo válido de 10 ejercicios: 3 reconocer (recordar) + 5 producir (2 recordar, 3 aplicar) + 2 aplicar (entender).

**Reconocer (máx. 40 % por lección)**
1. `multiple_choice` · 2. `multi_select` · 3. `true_false_swipe` (con botones alternativos) · 4. `match_pairs`

**Producir (mín. 40 % por lección)**
5. `fill_blank` (escritura libre en niveles altos) · 6. `order_steps` · 7. `numeric_input` (tolerancia %, calculadora financiera, `formula` testeada) · 8. `categorize` · 9. `build_statement` (rellenar balance, PyG o flujos hasta que cuadren) · 10. `spreadsheet` (mini hoja de cálculo con evaluador propio) · 11. `code` (solo rama Fintech: Python en Pyodide con tests ocultos)

**Aplicar y argumentar**
12. `chart_read` (gráfico con semilla) · 13. `scenario` · 14. `spot_the_error` · 15. `slider_estimate` · 16. `case_step` (caso en varios pasos) · 17. `document_read` (fragmento de documento público real con preguntas; fuente y fecha obligatorias) · 18. `best_argument` (elige el mejor razonamiento y por qué fallan los demás) · 19. `self_explain` (escribe tu explicación, compárala con una respuesta modelo y autoevalúate con una rúbrica de 3 criterios; XP reducido)

Campos comunes: `explanation`, `wrongExplanations` por opción, `hint`, `difficulty` (1–5), `bloom`, `tags`, `concepts`, `cfa` (bloque CFA, a nivel de lección), `character` (opcional), `interview` (true si sirve como pregunta de entrevista para Superday).

**Ejercicios paramétricos.** Los `numeric_input`, `spreadsheet` y `build_statement` de cálculo pueden declarar `params` (rango y paso de cada dato) en lugar de cifras fijas. En el repaso se generan cifras nuevas con semilla (ejercicio + fecha) y la respuesta sale de `formula`; el test de fórmulas prueba 100 semillas por ejercicio. La primera aparición usa las cifras del enunciado.

---

## 7. Esquema JSON de lección

Ruta: `/content/es/levels/{nivel}/{unidad}/{leccion}.json` (ramas: `/content/es/tracks/{rama}/{unidad}/{leccion}.json`).

```json
{
  "id": "n1-u4-l2",
  "version": 1,
  "status": "published",
  "reviewedBy": ["subagente", "humano"],
  "level": 1,
  "unit": 4,
  "title": "La orden limitada",
  "estimatedMinutes": 4,
  "objectives": ["Distinguir orden de mercado y limitada"],
  "concepts": ["orden-limitada", "orden-mercado"],
  "intro": [
    { "type": "card", "text": "Una orden limitada fija el precio máximo al que compras o mínimo al que vendes." },
    { "type": "visual", "component": "OrderBookDiagram", "props": { "highlight": "limit" } },
    { "type": "example", "text": "Naranjas del Turia cotiza a 10,20 €. Limitada a 10,00 €: solo compras si baja a 10,00 € o menos." }
  ],
  "exercises": [
    {
      "id": "n1-u4-l2-e1",
      "type": "multiple_choice",
      "difficulty": 2,
      "bloom": "entender",
      "tags": ["ordenes"],
      "concepts": ["orden-limitada"],
      "character": "mentora",
      "prompt": "¿Qué orden garantiza el precio pero no la ejecución?",
      "options": ["De mercado", "Limitada", "Stop", "Ninguna"],
      "answer": 1,
      "explanation": "La limitada fija el precio; si el mercado no llega, no se ejecuta.",
      "wrongExplanations": {
        "0": "La de mercado garantiza ejecución, no precio.",
        "2": "La stop se activa al tocar un precio y después ejecuta a mercado.",
        "3": "La limitada sí lo garantiza."
      }
    },
    {
      "id": "n1-u4-l2-e2",
      "type": "numeric_input",
      "difficulty": 3,
      "bloom": "aplicar",
      "tags": ["ordenes", "comisiones"],
      "concepts": ["comisiones"],
      "prompt": "Compras 100 acciones a 10,00 € con una comisión del 0,1 %. ¿Cuánto pagas en total?",
      "answer": 1001,
      "unit": "€",
      "tolerance": 0,
      "formula": "100 * 10 * (1 + 0.001)",
      "explanation": "1.000 € de acciones + 1 € de comisión = 1.001 €."
    }
  ],
  "realWorld": "En la ficha de cualquier bróker verás 'limitada' y 'a mercado' al lanzar una orden.",
  "sources": [],
  "verificarAntesDe": null,
  "lastReviewed": "2026-10-13"
}
```

Reglas para `document_read`: fragmentos breves de documentos públicos oficiales (CNMV, BCE, Banco de España, emisores), con `source` (URL) y `documentDate`; las empresas reales solo aparecen aquí y en lecciones históricas, nunca como recomendación.

---

## 8. Control de calidad (`CONTENIDO-QA.md`)

1. **Generación** (`draft`) siguiendo temario, mezcla de tipos, Bloom y mapa de conceptos.
2. **Validación automática:** esquema Zod · tests que recalculan cada `formula` · cuentas de `companies.json` que cuadran · mezcla ≥40 % producir · 6–10 ejercicios por lección · conceptos existentes y sin usar antes de su nivel · empresas reales solo en `document_read` e históricas · `published` exige `reviewedBy` con `"humano"`.
3. **Subagente revisor** independiente: una sola respuesta correcta, sin ambigüedad, explicación correcta, nivel adecuado, ortografía, coherencia con el caso hilo, y que cada dato no trivial tenga fuente.
4. **Revisión de Javier** (`reviewed` → `published`): lectura completa, comprobación de las fuentes y contraste con los apuntes de la carrera cuando el tema coincida.
5. **Seguimiento:** ejercicios que fallas de forma repetida o que reportas entran en la cola de revisión (exportable para Claude Code).
6. **Corrección y retirada:** el `id` nunca cambia; corregir sube `version`; retirar pone `retired` (sus tarjetas de repaso se archivan).
7. **Análisis de ítems:** ejercicios con >60 % de fallos a la primera, 100 % de aciertos con más de 20 intentos o un distractor que nadie elige entran en la cola de revisión.
8. **Validez del Jefe final:** tabla objetivo × ejercicio, con al menos un ejercicio de producir por objetivo.

Estados válidos: `draft` → `reviewed` → `published` → (`retired`).
