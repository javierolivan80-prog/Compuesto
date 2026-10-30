# docs/ANIMACIONES.md — Catálogo de animaciones de Compuesto

> Colócalo en `docs/ANIMACIONES.md`. Define **qué se anima, cómo y para qué**: explicadores visuales para aprender, microinteracciones de lección, secuencias clave, transiciones y animaciones de juego. `CLAUDE.md §6` fija curvas y duraciones base; `docs/JUEGOS.md` fija el game feel. Este documento manda en el detalle de cada animación.

---

## 1. Principios

1. **Toda animación enseña, orienta o recompensa.** Si no hace ninguna de las tres cosas, se quita.
2. **Tres capas** (de la skill `motion-design`):
   - **Primaria:** la que explica (la curva que crece, el balance que se nivela).
   - **Secundaria:** la que acompaña (números que cuentan, etiquetas que aparecen).
   - **Ambiental:** la que da vida sin distraer (ticker de fondo, respiración de Bolsín). Siempre al ≤ 30 % de protagonismo.
3. **Personalidad "Premium":** movimientos precisos, sin rebote en la UI, aceleraciones suaves. El rebote y las partículas se reservan para recompensas.
4. **El usuario controla el tiempo en los explicadores.** Cada explicador se puede **arrastrar** (slider o gesto) además de reproducir. Aprender es manipular, no mirar un vídeo.
5. **Rendimiento:** solo `transform` y `opacity` en el DOM. Más de 150 elementos animados → Canvas. 60 fps con la CPU ralentizada 4×.
6. **Accesibilidad:** con `prefers-reduced-motion`, cada animación tiene un estado final estático y una **descripción textual** equivalente. Ningún dato se transmite solo con movimiento ni solo con color.

### Tokens de motion (en `/src/design/motion.ts`)

| Token | Valor | Uso |
|---|---|---|
| `ease.out` | `cubic-bezier(0.23, 1, 0.32, 1)` | Entradas, casi todo |
| `ease.inOut` | `cubic-bezier(0.65, 0, 0.35, 1)` | Movimientos de A a B en pantalla (explicadores) |
| `ease.exit` | `cubic-bezier(0.4, 0, 1, 1)` | Salidas rápidas |
| `spring.ui` | stiffness 400, damping 40 (sin rebote) | Sheets, tarjetas, arrastres |
| `spring.reward` | stiffness 300, damping 18 (rebote leve) | Solo recompensas |
| `dur.micro` | 120 ms | Pulsar, toggles |
| `dur.short` | 200 ms | Transición entre ejercicios |
| `dur.medium` | 320 ms | Sheets, revelados |
| `dur.long` | 600 ms | Contadores, explicaciones de un paso |
| `dur.story` | 1.200–2.000 ms | Secuencias clave (rango, ascensor) |
| `stagger` | 40 ms | Listas y elementos en cadena |

---

## 2. Explicadores visuales (para aprender)

Componente común `<Explainer>` en `/src/features/lesson/explainers`:
- Botón ▶ para reproducir y slider o arrastre para recorrerlo a mano.
- Pasos numerados con texto sincronizado: cada paso resalta lo que se mueve.
- Botón "Otra vez", estado final estático y descripción para lector de pantalla.
- Mide si el usuario ha interactuado (evento `explainer_interacted`) para las estadísticas personales.

Se declaran en el JSON de la lección con `{ "type": "visual", "component": "<Nombre>", "props": {...} }`. Cada explicador recibe valores reales del ejercicio (importes, tipos) y nunca datos hardcodeados.

### Nivel 0 — El dinero
| Explicador | Concepto | Qué se mueve | Qué manipula el usuario |
|---|---|---|---|
| `CompoundCurve` | Interés compuesto | Monedas que se apilan año a año; cada pila genera monedas nuevas de otro color (intereses sobre intereses). La pila dibuja la curva dorada de la marca | Años, tipo y aportación |
| `InflationCart` | Inflación | Un carrito con 100 € de compra que pierde productos cada año | Tasa de inflación |
| `TinVsTae` | TIN vs TAE | Dos barras: la TAE crece al dividir el año en más periodos de liquidación | Frecuencia de liquidación |
| `Rule72` | Regla del 72 | Un contador de años hasta que la pila se duplica | Tipo de interés |
| `LoanAmortization` | Hipoteca | Cada cuota se parte en intereses (rojo) y capital (verde); al avanzar, el verde gana | Plazo y tipo; fijo vs variable con Euríbor que oscila |
| `MoneyCreation` | Cómo crea dinero un banco | Un depósito se presta, vuelve como depósito a otro banco y se multiplica en cadena | Coeficiente de reservas |

### Nivel 1 — Mercados
| Explicador | Concepto | Qué se mueve | Manipulación |
|---|---|---|---|
| `OrderBook` | Libro de órdenes y horquilla | Barras de compra y venta; una orden de mercado "come" niveles y el precio salta | Tamaño de la orden |
| `LimitVsMarket` | Tipos de orden | La misma orden ejecutada a mercado (al instante) y limitada (espera hasta que el precio toca la línea) | Precio límite |
| `OpeningAuction` | Subasta de apertura | Órdenes que se acumulan sin cruzarse y, al sonar la campana, se casan a un único precio | Ninguna (reproducir) |
| `ShareDilution` | Ampliación de capital | Una tarta que se divide en más porciones; tu porción encoge salvo que uses tus derechos | Acudir o no a la ampliación |
| `ExDividend` | Fecha ex-dividendo | El precio cae justo el importe del dividendo, que pasa a tu cuenta | Importe del dividendo |
| `StockSplit` | Split | Una acción se parte en N; el valor total no cambia | Ratio del split |

### Nivel 2 — Productos
| Explicador | Concepto | Qué se mueve | Manipulación |
|---|---|---|---|
| `BondSeesaw` | Precio y tipos | Un balancín: sube el tipo, baja el precio | Tipo de mercado |
| `Duration` | Duración | El balancín con bonos de distintos plazos: los largos se mueven más | Plazo del bono |
| `YieldCurve` | Curva de tipos | Curva elástica que se empina, aplana o invierte | Arrastrar la curva |
| `FundVsEtf` | Fondo vs ETF | Una cesta que cotiza en continuo frente a otra con precio una vez al día | Ninguna |
| `FuturePayoff` | Introducción a derivados | Dos rectas cruzadas: el resultado del comprador y del vendedor de un futuro frente al precio al vencer | Precio al vencimiento |
| `RepoFlow` | Repo | Bonos que van al prestamista y dinero que vuelve; al vencer, el camino inverso con intereses | Paso a paso |
| `FxEffect` | Efecto divisa | Dos barras: la subida de un activo en dólares, fija, y la misma subida en euros, que cambia con el EUR/USD | Tipo de cambio un año después |
| `TerDrain` | Comisiones (TER) | Dos curvas compuestas idénticas; una pierde un hilo dorado cada año por comisiones | TER |
| `NormalTails` | Distribución normal y colas gordas | Histograma que se construye con caídas de bolas; las colas reales pesan más que la campana | Número de días |

### Nivel 3 — Contabilidad y valoración
| Explicador | Concepto | Qué se mueve | Manipulación |
|---|---|---|---|
| `BalanceScale` | Balance | Balanza de latón: activo en un plato; pasivo y patrimonio en el otro | Añadir partidas |
| `PnlWaterfall` | Cuenta de resultados | Cascada que se construye barra a barra desde ventas hasta beneficio neto | Márgenes |
| `ThreeStatements` | Cómo se conectan los 3 estados | Una venta a crédito viaja: PyG → clientes en balance → flujo de caja (no entra caja todavía) | Tipo de operación |
| `CashFlowPipes` | Flujos de caja | Tuberías de explotación, inversión y financiación que llenan o vacían el depósito de caja | Grifos de cada flujo |
| `CashCycle` | Ciclo de caja | Circuito dinero → stock → ventas → cobros con un reloj de días | Días de cobro, pago y stock |
| `DcfTimeTravel` | Descuento de flujos | Los flujos futuros viajan hacia hoy y **encogen** según el WACC; se suman en el valor actual | WACC y crecimiento |
| `EvBridge` | Valor de empresa | Barras en cascada: capitalización + deuda financiera − caja = valor de empresa; entre el EBITDA, el múltiplo | Paso a paso |
| `WaccMix` | WACC | Barras de coste de deuda y de capital que se mezclan según su peso | Peso de la deuda |
| `Leverage` | Apalancamiento financiero | Mismo beneficio operativo; más deuda amplifica el ROE hacia arriba y hacia abajo | Deuda |

### Nivel 4 — Macro y banca
| Explicador | Concepto | Qué se mueve | Manipulación |
|---|---|---|---|
| `DataSurprise` | Sorpresa de un dato macro | El dato cae por debajo, en línea o por encima del consenso y la rentabilidad a 2 años baja, no se mueve o sube | Paso a paso (dato) |
| `RateTransmission` | Transmisión de la política monetaria | El BCE sube el tipo y se encadenan Euríbor → hipotecas → consumo → precios | Tipo oficial |
| `RiskPremiumGap` | Prima de riesgo | Dos barras, Bund alemán y bono español a 10 años; el hueco es la prima en pb y se ensancha 100 pb con su coste en intereses de la deuda nueva | Paso a paso (prima) |
| `QeBalance` | QE/QT | El balance del banco central se infla comprando bonos y baja los tipos largos | Compras |
| `BankBalance` | Margen de intereses | Depósitos que entran a un tipo y préstamos que salen a otro; la diferencia se acumula | Tipos |
| `Cet1Cushion` | Solvencia (CET1) | El ratio CET1 como barra frente al pilar 1 (4,5 %) y al 7 % con el colchón de conservación; lo que sobra es el colchón que absorbe pérdidas | Paso a paso (capital) |
| `BankRun` | Liquidez y pánico bancario | Cola de depositantes que retiran dinero; el LCR aguanta o no | Velocidad de retirada |
| `CreditRisk` | Pérdida esperada | PD × LGD × EAD como tres capas que se multiplican; al final, esperada (precio y provisiones) frente a inesperada (capital) | Paso a paso (las tres variables) |
| `BankMultiple` | Valorar bancos (P/VTC y ROTE) | La recta del P/VTC justificado = (ROTE − g) / (Ke − g): cruza el 1 cuando el ROTE iguala al Ke; un ROTE alto merece cotizar por encima del valor tangible y uno bajo, por debajo | Paso a paso (ROTE) |
| `FxParity` | Paridad de tipos de interés cubierta | Dos divisas en un balancín con los tipos de interés como pesos; invertir en euros o en dólares con el cambio fijado da lo mismo y de ahí sale el forward | Paso a paso (tipos) |

### Nivel 5 — Trading
| Explicador | Concepto | Qué se mueve | Manipulación |
|---|---|---|---|
| `MarketImpact` | Impacto de mercado | Una orden cada vez más grande barre el libro de ventas; el precio medio y el impacto en pb sobre el punto medio crecen más que el tamaño | Paso a paso (tamaño) |
| `CostStack` | Costes reales de operar | La barra de costes de una compra se apila capa a capa: comisión e impuesto sobre las transacciones financieras (explícitos, en el extracto), media horquilla y coste de impacto (implícitos, en el precio) | Paso a paso (capas) |
| `ShortSelling` | Venta en corto | Pides prestada una acción, la vendes, recompras más barata y la devuelves (o más cara y pierdes); al final, la asimetría: la ganancia tiene techo y la pérdida no | Paso a paso (precio de recompra) |
| `ExpectedValue` | Valor esperado y ley de los grandes números | La media de 1, 10, 100 y 1.000 operaciones con su banda de ±2 errores típicos, que se estrecha alrededor del valor esperado | Paso a paso (número de operaciones) |
| `PositionSizing` | Tamaño de posición | Cuenta que sobrevive o se vacía tras una racha de pérdidas según el % arriesgado | % por operación |

### Nivel 6 — Carteras y riesgo
| Explicador | Concepto | Qué se mueve | Manipulación |
|---|---|---|---|
| `Diversification` | Diversificación | Líneas de activos que zigzaguean; al combinarse, la línea total se suaviza | Correlación |
| `EfficientFrontier` | Markowitz | Nube de carteras que se forma punto a punto; la frontera se dibuja en dorado | Pesos |
| `SecurityMarketLine` | CAPM | Activos en un gráfico beta-rentabilidad; los que quedan sobre la línea brillan | Beta |
| `VarTail` | VaR y CVaR | Histograma de pérdidas con la cola sombreada al 5 % | Nivel de confianza |
| `MonteCarloPaths` | Monte Carlo | Cientos de caminos que se abren en abanico (Canvas); bandas de percentiles | Volatilidad y años |
| `BacktestTrap` | Sobreajuste | Estrategia perfecta en gris que se desmorona al cruzar al periodo fuera de muestra | Número de parámetros |

### Nivel 7 — Derivados
| Explicador | Concepto | Qué se mueve | Manipulación |
|---|---|---|---|
| `PayoffHockey` | Payoff de una opción | El "palo de hockey" que se dibuja al mover el precio del subyacente | Strike, prima, call/put |
| `TimeValueMelt` | Valor temporal | La prima se derrite al acercarse el vencimiento (theta) | Días al vencimiento |
| `BinomialTree` | Valoración binomial | Árbol de un paso; la cartera réplica se construye y da el precio | Subida/bajada |
| `DeltaSlope` | Delta | Tangente a la curva del precio de la opción que gira | Precio del subyacente |
| `SwapFlows` | Swap de tipos | Flechas de pagos fijos y variables que se cruzan cada periodo | Euríbor |
| `MarginCall` | Apalancamiento | La garantía baja con el precio hasta la línea de margin call | Apalancamiento |

### Nivel 8–9 — Profesional e historia
| Explicador | Concepto | Qué se mueve | Manipulación |
|---|---|---|---|
| `LboStairs` | LBO | Escalera de deuda que se paga año a año mientras el valor del capital crece | Deuda inicial y múltiplo de salida |
| `AccretionDilution` | M&A | BPA del comprador antes y después según la forma de pago | Mezcla de acciones y deuda |
| `IpoBook` | Libro de una OPV | Demanda de inversores que se acumula y fija el precio de salida | Precio |
| `BubbleAnatomy` | Burbujas | Fases de una burbuja (desplazamiento, euforia, pánico) sobre una curva histórica aproximada | Recorrer la línea temporal |
| `Contagion2008` | Crisis financiera | Dominó de entidades conectadas que caen | Retirar una ficha |
| `PonziPyramid` | Esquema Ponzi | Pirámide que necesita cada vez más base hasta derrumbarse | Ritmo de nuevos inversores |

**Regla de producción:** cada unidad de contenido usa al menos un explicador. Si no existe el que necesita, la tarea de contenido (FASES 1.9 / 4.1 / 6.2) lo crea siguiendo esta ficha (concepto, qué se mueve, manipulación, estado final estático y descripción textual).

---

## 3. Microinteracciones de lección

| Momento | Animación |
|---|---|
| Tarjeta de teoría | Entra desde abajo 16 px + fundido (`dur.medium`, `ease.out`); el término clave se subraya con un trazo dorado que se dibuja de izquierda a derecha |
| Término del glosario | Al tocarlo: bottom sheet (`spring.ui`) con la definición y, si existe, un mini explicador |
| Cálculo guiado | Cada número del enunciado "vuela" a su hueco en la fórmula (FLIP, 400 ms, `ease.inOut`, stagger 80 ms); el resultado se cuenta con un contador |
| Seleccionar opción | `scale(0.97)` al pulsar; borde del color de marca que aparece en 120 ms |
| Comprobar · acierto | Hoja inferior sube (220 ms); check dibujado (stroke, 300 ms); pop de "+10 XP"; Bolsín asiente; háptico 10 ms |
| Comprobar · fallo | Hoja inferior; sacudida 4 px ×2 (180 ms); la opción correcta se ilumina en 300 ms; Bolsín en modo "ánimo"; explicación específica de la opción elegida |
| Ordenar / arrastrar | El elemento se eleva (sombra + `scale(1.03)`); los demás se apartan con `spring.ui`; al soltar encaja con un "clic" |
| Balance o PyG que cuadra | Las cifras de los totales se igualan con contador; filete dorado que recorre el estado |
| Hoja de cálculo | La celda se ilumina al evaluar; las dependencias se marcan con una línea fina hacia la celda resultado |
| Barra de progreso de lección | Crece con `ease.out`; en el último ejercicio se convierte en la curva compuesta |
| Racha | La vela de la racha crece cada día (gráfico de velas en miniatura); al romperse, "corrección" sobria en rojo, sin castigo |
| Repaso que vuelve | Etiqueta "Due diligence · Repaso" con un ligero brillo para distinguirlo del contenido nuevo |

---

## 4. Secuencias clave (storyboards)

**Subida de rango (1.800 ms)**
1. 0–200 ms: la UI se atenúa al 30 %.
2. 200–700 ms: se dibuja la curva compuesta dorada de izquierda a derecha.
3. 700–1.100 ms: el nuevo rango aparece en Instrument Serif (escala 1,1 → 1 + fundido).
4. 1.100–1.500 ms: insignia metálica con reflejo que la recorre; tema desbloqueado en vista previa.
5. 1.500–1.800 ms: confeti dorado sobrio (Canvas, 30 partículas) y campana. Botón "Continuar".

**Ascensor entre plantas (1.400 ms)**
1. Puertas que se cierran desde los lados (300 ms).
2. Indicador de planta que cuenta hacia arriba con cifras tabulares (600 ms) y ligera vibración de la cabina (2 px).
3. "Ding" y puertas que se abren a la planta nueva con su ilustración (500 ms).

**Cierre de sesión ("Cierre")**
Resumen que se construye en cascada (stagger 60 ms): minutos, XP, precisión, conceptos reforzados → la vela del día de tu acción se forma → botón de compartir.

**Comité de inversión aprobado**
Expediente en la mesa → tres firmas que se dibujan → sello "APROBADO" que se estampa (escala 1,4 → 1 con golpe seco y sacudida de 3 px) → diploma que vuela al Despacho.

**Cierre semanal de rivales**
Clasificación que se reordena con FLIP (cada fila se desliza a su nueva posición, stagger 40 ms); línea de ascenso y descenso que se ilumina; tu fila se destaca.

**Tarjeta compartible**
Vista previa que se "imprime" de arriba abajo como un ticket de terminal (600 ms) antes de mostrar los botones de compartir.

---

## 5. Transiciones entre pantallas

- **View Transitions API** (skill `vercel-react-view-transitions`) con fallback a Motion cuando el navegador no la soporte.
- Pestañas: fundido cruzado de 160 ms (sin deslizar, para no marear).
- Camino → lección: el nodo de la lección crece hasta ocupar la pantalla (transición compartida de elemento).
- Entrar en un juego: la UI se oscurece y aparece la rejilla de terminal (400 ms).
- Volver atrás: la animación inversa, más rápida (70 % de la duración).

---

## 6. Animaciones de juego

Se rigen por el kit de `docs/JUEGOS.md §2`, ampliado con la skill `game-feel`:
- **Escalar el feedback a la importancia del evento:** acierto normal = brillo + tic; combo = pop + medidor; récord = hit-stop + partículas + sonido especial. Nunca el máximo efecto para algo rutinario.
- **El efecto va fuera de la simulación:** la lógica del juego no espera a que acaben las animaciones; los efectos se pueden cortar sin cambiar el resultado.
- **Sacudidas sin temblores:** amplitud y duración decrecientes, nunca aleatorias por frame.
- **Hit-stop que siempre se reanuda:** con temporizador de seguridad.
- **Anticipación antes de revelar resultados** (150 ms) en ¿Sube o baja?, Máquina del tiempo y Trampa del backtest.
- **Squash and stretch** solo en piezas que se arrastran y se sueltan (fichas de opciones, partidas del balance), con un máximo del 6 %.

## 7. Sonido

| Evento | Sonido | Duración |
|---|---|---|
| Abrir mercado | Campana de apertura | 0,8 s |
| Acierto | "Tic" seco y agudo | 0,1 s |
| Fallo | Tono grave suave | 0,2 s |
| Combo ×3 o más | Tic doble ascendente | 0,2 s |
| Subida de rango | Campana + acorde | 1,5 s |
| Ascensor | "Ding" | 0,4 s |
| Sello del comité | Golpe seco | 0,2 s |
| Cierre de sesión | Campana de cierre | 0,8 s |

Sonidos propios generados o de licencia libre (CC0), en `/public/sounds`, normalizados al mismo volumen, precargados y silenciables. Nunca más de uno a la vez.

## 8. Verificación

- Cada explicador y cada secuencia tiene una historia en `/styleguide` o `/games-lab`, con controles para forzar reduced-motion.
- Test de que con reduced-motion el estado final y la descripción están presentes.
- Traza de rendimiento a 60 fps con CPU 4× para explicadores con Canvas y secuencias clave.
- Revisión con `review-animations` al cerrar cada fase y 🛑 visto bueno de Javier en el móvil.
