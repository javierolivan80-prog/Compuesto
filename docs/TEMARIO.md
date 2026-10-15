# docs/TEMARIO.md — Contenido de Compuesto

> Colócalo en `docs/TEMARIO.md`. Define el itinerario completo (año troncal + 4 ramas), el mapa de conceptos, los tipos de ejercicio, el test de nivel, el esquema JSON y el control de calidad. Los minijuegos se diseñan en `docs/JUEGOS.md`.

---

## 0. A dónde lleva

| Tramo | Duración | Nivel de conocimientos al terminar |
|---|---|---|
| Niveles 0–2 | Semanas 1–16 | Finanzas personales sólidas + bases de bachillerato y 1.º de carrera |
| Niveles 3–5 | Semanas 17–36 | Contenidos de 2.º–4.º de ADE/Finanzas: contabilidad española, valoración, macro, banca, mercados |
| Niveles 6–9 | Semanas 37–52 | Amplitud equivalente al **CFA Nivel I** a nivel intuitivo + lo específico de España |
| Ramas | 8 semanas cada una | Profundidad de **analista junior** en el área; prioridad: Banca y riesgos |

Promesa honesta: de cero a **nivel de conocimientos de analista junior** (vocabulario, conceptos, cálculo e intuición). No sustituye la experiencia profesional ni un título oficial.

---

## 1. Estructura

Nivel (= rango = planta de Albufera Partners) → Unidad → Lección → Ejercicios.
- **Año troncal:** 10 niveles, 52 semanas, ~700 lecciones.
- **Ramas:** 4 especializaciones de ~8 semanas (~110 lecciones cada una). Se desbloquean al aprobar el nivel indicado y se pueden hacer en paralelo al troncal (a costa de avanzar más despacio) o al terminarlo.
- 4–8 unidades por nivel · 4–6 lecciones por unidad · **6–10 ejercicios por lección (3–5 min)**.
- Cada unidad termina con **Jefe final** (≥80 %) y una tarjeta **"Dónde verás esto"**.
- Una vez por semana, **Encargo del jefe** sobre el caso hilo (8–10 min, varios pasos).
- Cada nivel y cada rama terminan con **Comité de inversión** + diploma PDF local para tu Despacho.
- **Orden de producción:** primero Niveles 0 y 1 completos (prueba personal de 4 semanas). Después, el resto del troncal, adelantando lo que coincida con la carrera en cada cuatrimestre. Las ramas, empezando por Banca y riesgos, cuando su nivel de desbloqueo esté publicado (ver `FASES.md`).
- **Presupuesto realista:** apuntar en `CONTENIDO-QA.md` las horas reales de revisión por unidad para ajustar el ritmo; es preferible un temario más corto y correcto que uno completo con errores.

### Hilos transversales (en todos los niveles)
- **🧮 Mates del mercado:** la herramienta matemática que necesita el nivel siguiente.
- **🏛 Hacienda:** cada producto con cómo tributa en España (`verificarAntesDe`).
- **🧠 Mente:** un sesgo conductual por unidad.
- **📊 Excel:** funciones de hoja de cálculo practicadas en `spreadsheet`.
- **📄 Documento real:** al menos una lección por nivel trabaja con un fragmento de un documento público real (cuentas anuales, folleto, KID de un fondo, nota de prensa del BCE) con el ejercicio `document_read`.

---

## 2. Año troncal

**Nivel 0 · Becario · Planta 0 — El dinero (sem. 1–4)**
Inflación y poder adquisitivo · interés simple y **compuesto** (lección fundacional), regla del 72 · TIN vs TAE · presupuesto y fondo de emergencia · deuda, préstamos, hipotecas (fijo, variable, Euríbor), alquilar vs comprar · cómo funciona un banco y cómo se crea el dinero · depósitos y Fondo de Garantía de Depósitos · seguros básicos · **pensiones públicas en España** (Seguridad Social y los tres pilares) · riesgo y rentabilidad.
🧮 porcentajes, tasas, valor temporal del dinero · 🏛 intereses en el IRPF · 🧠 sesgo del presente · 📊 celdas, SUMA, referencias · 📄 ficha de información precontractual de un depósito.

**Nivel 1 · Analista Junior · Planta 1 — Mercados 101 (sem. 5–10)**
Empresa y acción · mercado primario/secundario, OPV · BME, mercado continuo, IBEX 35, **BME Growth**, índices mundiales · formación de precios, horquilla, liquidez · órdenes y subastas · cómo abrir un bróker en España · dividendos, **scrip dividend**, ampliaciones y **derechos de suscripción**, splits, recompras · **OPAs** (cómo funcionan en España) · capitalización y free float · OTC.
🧮 rentabilidad total, rentabilidad por dividendo · 🏛 ganancias patrimoniales, dividendos, venta de derechos · 🧠 FOMO y efecto manada · 📊 porcentajes, VF, VA · 📄 anuncio de una OPA en la CNMV.

**Nivel 2 · Analista · Planta 2 — Productos (sem. 11–16)**
**Renta fija:** cupón, precio vs tipos, TIR, curva de tipos y **curva cupón cero**, duración y **convexidad**, rating y **spread de crédito**, Letras y Bonos del Tesoro · **mercado monetario y repo** · **cédulas hipotecarias y titulizaciones** · fondos, TER y traspasos · ETFs · planes de pensiones · inmobiliario: SOCIMIs, REITs · materias primas · divisas · **introducción a alternativos** · cripto (MiCA) · introducción a derivados · productos complejos y avisos de la CNMV.
🧮 estadística básica: media, desviación típica, normal, colas gordas · 🏛 fondos, ETFs, pensiones, cripto · 🧠 ilusión de control · 📊 PROMEDIO, DESVEST, gráficos · 📄 KID (documento de datos fundamentales) de un fondo.

**Nivel 3 · Asociado · Planta 3 — Contabilidad, finanzas corporativas y valoración (sem. 17–25)**
Balance, PyG, flujos de caja y cómo se conectan · **PGC español vs NIIF/IFRS** · **consolidación**, **fondo de comercio y deterioros**, provisiones, **arrendamientos (IFRS 16)** · ratios y análisis · **circulante y ciclo de caja** · **financiación de la empresa:** préstamo bancario y sindicado, leasing, renting, factoring, confirming, emisión de bonos · estructura de capital (Modigliani-Miller intuitivo) · política de dividendos · presupuesto de capital (VAN, TIR) · múltiplos · DCF paso a paso · trampas contables.
🧮 VAN, TIR, crecimiento compuesto · 🏛 impuesto de sociedades · 🧠 anclaje · 📊 VNA, TIR, modelo de 3 estados · 📄 cuentas anuales de una cotizada española.

**Nivel 4 · VP · Planta 4 — Macro, finanzas internacionales y banca (sem. 26–32)**
PIB, IPC, paro, PMI · calendario macro · BCE, Fed, Banco de España, QE/QT · curva de tipos e inversión · ciclo y rotación sectorial · política fiscal, deuda pública, prima de riesgo · **finanzas internacionales:** balanza de pagos, paridad del poder adquisitivo, paridad de tipos de interés, mercados emergentes · **banca por dentro:** margen de intereses, solvencia (CET1), Basilea, liquidez (LCR, NSFR), test de estrés · **riesgo de crédito básico:** PD, LGD, EAD, morosidad, provisiones IFRS 9 (intuición) · **supervisión:** Unión Bancaria, MUS, FROB, resolución · **valorar bancos** (P/VTC, ROTE).
🧮 tasas interanuales, índices, correlación · 🏛 deuda pública en el IRPF · 🧠 sesgo de narrativa · 📊 series temporales · 📄 nota de prensa de política monetaria del BCE.

**Nivel 5 · Director · Planta 5 — Trading y microestructura (sem. 33–36)**
Libro de órdenes · market makers, HFT, dark pools · subastas · costes reales de operar · cortos y préstamo de valores · análisis técnico con mirada crítica (evidencia y por qué la mayoría del minorista pierde) · gestión del riesgo de una operación (stop, tamaño de posición).
🧮 probabilidad y valor esperado · 🏛 regla de los dos meses, compensación de pérdidas · 🧠 exceso de confianza, aversión a la pérdida · 📊 SI, BUSCARX · 📄 informe de la CNMV sobre resultados de inversores minoristas en CFD (o equivalente vigente).

**Nivel 6 · Director Sénior · Planta 6 — Carteras, riesgo y alternativos (sem. 37–41)**
Rentabilidad simple/log, TWR vs MWR · volatilidad, correlación, diversificación · Markowitz · CAPM y beta · Sharpe, Sortino, drawdown · VaR y CVaR · factores · pasiva vs activa · **alternativos como inversión:** private equity, hedge funds, deuda privada, infraestructuras · ESG y SFDR · asset allocation y rebalanceo · **Monte Carlo** y **trampas del backtesting** · efecto compuesto de las comisiones.
🧮 covarianza, regresión intuitiva, simulación · 🏛 optimización fiscal legal de una cartera · 🧠 contabilidad mental · 📊 matriz de correlaciones · 📄 informe periódico de un fondo.

**Nivel 7 · Managing Director · Planta 7 — Derivados (sem. 42–45)**
Futuros y forwards · opciones · payoffs · valor intrínseco y temporal · **modelo binomial de un paso** (valoración por réplica) · Black-Scholes intuitivo · griegas · estrategias · swaps de tipos y divisa · CDS · apalancamiento y margin call · coberturas en empresas (caso hilo).
🧮 árboles binomiales, volatilidad implícita (intuición) · 🏛 tributación de derivados · 🧠 sesgo de resultado · 📊 tablas de payoff · 📄 folleto de un producto estructurado.

**Nivel 8 · Partner · Planta 8 — Finanzas profesionales y fintech (sem. 46–49)**
Mapa del sector (banca comercial, de inversión, asset management, PE, VC, hedge funds, research, trading, riesgos, compliance) · OPV y emisiones · M&A y sinergias · LBO · VC y rondas · **panorama fintech:** pagos, neobancos, open banking, euro digital, tokenización, IA en finanzas · informe de research · preparación de entrevistas · CFA, EFPA, FRM · prácticas en banca en España.
🧮 TIR de un LBO · 🏛 fiscalidad de M&A (intuición) · 🧠 pensamiento de grupo · 📊 LBO simplificado, sensibilidades · 📄 folleto de una OPV española.

**Nivel 9 · Leyenda · Planta 9 — Historia, regulación, ética y fiscalidad (sem. 50–52)**
Burbujas y crisis: tulipanes, 1929, puntocom, 2008, **burbuja inmobiliaria española**, **crisis de las cajas y Bankia**, deuda europea 2012, **resolución del Banco Popular (2017)**, COVID, SVB 2023 · fraudes (Ponzi, Madoff, Enron, Wirecard, pump and dump, chiringuitos) · regulación: CNMV, ESMA, MiFID II, idoneidad y conveniencia, abuso de mercado · **prevención del blanqueo y KYC** · protección del cliente bancario y reclamaciones al Banco de España · fiscalidad avanzada: 720/721, doble imposición, **Patrimonio y Sucesiones** (ejemplo: Comunidad Valenciana) · ética y conflictos de interés · repaso integrador.
**Planta 10 · Despacho de socios:** examen final del año.

---

## 3. Ramas de especialización

Cada rama: 8 semanas, Comité final, certificado, un juego propio (JUEGOS.md §4) y su propio caso hilo dentro de Albufera Partners.

**🏦 Banca y riesgos** — desbloquea al aprobar el Nivel 4
Productos de activo y pasivo para particulares y empresas · riesgo de crédito avanzado: scoring, rating interno, modelos IRB (intuición) · IFRS 9: fases y pérdida esperada · gestión de activos y pasivos (ALM) y riesgo de tipo de interés · liquidez y financiación · riesgo de mercado y operacional · capital: Pilares 1, 2 y 3 · test de estrés · banca privada y asesoramiento bajo MiFID · prevención del blanqueo avanzada · caso: un año en el comité de riesgos.

**📈 Mercados y trading** — desbloquea al aprobar el Nivel 5
Renta fija avanzada: inmunización, carry y roll-down, posicionamiento en curva · derivados avanzados: griegas de una cartera, volatilidad implícita y sonrisa, introducción a exóticos · divisas y materias primas · cómo funciona una mesa (ventas, trading, research) · ejecución algorítmica · riesgo de mesa: VaR, límites, P&L · caso: un trimestre como trader junior.

**🏢 Corporate y valoración** — desbloquea al aprobar el Nivel 3
Modelo de 3 estados completo · DCF avanzado · comparables y transacciones precedentes · suma de partes · valorar sectores especiales: bancos, aseguradoras, inmobiliarias · M&A completo (acreción/dilución, due diligence) · LBO completo · reestructuraciones y **concurso de acreedores en España** · private equity y venture capital desde dentro · cómo se hace un pitch book · caso: la venta de Naranjas del Turia.

**⚙️ Fintech y cuantitativo** — desbloquea al aprobar el Nivel 6
Medios de pago y su infraestructura · open banking (PSD2/PSD3) · euro digital · cripto, DeFi y tokenización bajo MiCA · regtech · IA en finanzas: usos y sesgos · **Python para finanzas** en el navegador (Pyodide, sin servidor) · series temporales · modelos de factores · Monte Carlo y backtesting rigurosos · caso: lanzar un producto fintech en Albufera Partners.

---

## 4. Mapa de conceptos y dominio

- `/content/shared/concepts.json`: cada concepto con `id`, nombre, nivel, y **prerrequisitos** (p. ej. `wacc` requiere `coste-deuda`, `coste-capital`, `estructura-capital`).
- Cada ejercicio declara los conceptos que evalúa (`concepts: [...]`).
- El dominio se mide **por concepto** (proyección de eventos). Si fallas un concepto de forma repetida, el repaso incluye también sus prerrequisitos débiles.
- La pantalla "Cartera de conocimiento" muestra el mapa de conceptos como una constelación que se ilumina al dominarlos.
- `content:validate` comprueba que no hay ciclos en el mapa y que ningún ejercicio usa un concepto antes de su nivel.

---

## 5. Tests de salto

- Cada unidad tiene un **test de salto** de 8 preguntas (banco propio, etiquetado por concepto, revisado como el resto). Con ≥80 % la unidad queda dominada y sus conceptos entran en el repaso espaciado como vistos.
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

Campos comunes: `explanation`, `wrongExplanations` por opción, `hint`, `difficulty` (1–5), `bloom`, `tags`, `concepts`, `character` (opcional).

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

Estados válidos: `draft` → `reviewed` → `published` → (`retired`).
