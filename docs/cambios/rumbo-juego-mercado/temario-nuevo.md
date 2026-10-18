# Propuesta 🛑: orden nuevo del temario «directo a mercados»

**Estado:** aprobada por Javier el 17/10/2026 y aplicada el 18/10/2026 (TEMARIO §0–§2, CLAUDE.md §8 y §8b, `curriculum.json`, `src/engine/floors.ts`; ver DECISIONES.md). Diferencias con la tabla: «Subastas» y «Psicología» viven por ahora dentro de `n1-u4`.

**Idea:** cada unidad gira alrededor de **un juego** y de lo que pasa en **La Mesa**. La teoría llega después, explicando lo que te ha pasado. Las finanzas personales del N0 actual dejan de ser un nivel: sus ideas aparecen dentro de los juegos (la inflación es la línea que tu cartera tiene que batir en La Mesa; el interés compuesto, la curva de tu cartera). Las lecciones de N0 siguen disponibles como «Base» opcional en Practicar.

| Planta | Bloque | Unidades (cada una con su juego) | Qué desbloquea en La Mesa |
|---|---|---|---|
| 0 | **Mercados en vivo** (N1 actual, rehecho) | 1. La acción y la empresa → *¿Sube o baja?* con noticias del universo · 2. El libro de órdenes → **La compra grande** (hecho) y *Mesa de órdenes* · 3. Subastas y apertura → *Campana de apertura* · 4. Rentabilidad total y dividendos → tu primer dividendo en La Mesa · 5. Operaciones corporativas y OPAs → *rumor de OPA* · 6. Psicología: FOMO, manada y exceso de confianza → *El trader impulsivo* | Órdenes limitadas, dividendos, eventos corporativos |
| 1 | **Leer una empresa** (N3 adelantado: contabilidad y valoración) | Cuadra el balance · De la cuenta de resultados a la caja (*Ciclo de caja*) · Ratios y calidad del beneficio · Múltiplos (*¿cara o barata?*) · DCF Express · Coste de capital (CAPM y WACC) | Ficha de cada empresa con sus cuentas y su valoración |
| 2 | **Tipos y bonos** (N2 renta fija) | Precio y tipos (*Curva de tipos*) · TIR y duración · Crédito y rating · BCE y mercado monetario | Bonos del Estado y corporativos en La Mesa |
| 3 | **Macro que mueve precios** (N4) | Calendario macro y sorpresas · BCE y tipos · Ciclo y rotación sectorial · Bancos por dentro (*Stress test*) | Teletipo macro completo, sectores |
| 4 | **Trading y microestructura** (N5) | Costes reales · Cortos · Tamaño de posición y stop · Análisis técnico con mirada crítica · Eficiencia de mercado | Ventas en corto, stop |
| 5 | **Carteras y riesgo** (N6) | Diversificación (*Gestor por un año*) · Riesgo y rentabilidad · CAPM avanzado · Sharpe y drawdown · Monte Carlo y *La trampa del backtest* | Informe de tu cartera: volatilidad, Sharpe, drawdown |
| 6 | **Derivados** (N7) | Futuros · Opciones (*Constructor de payoff*) · Paridad put-call · Coberturas | Opciones sobre las empresas del universo |
| 7 | **Finanzas profesionales** (N8, puente) | Mapa del sector y elección de rama Pro | — |
| 8 | **Historia, regulación y ética** (N9) | *Máquina del tiempo* (crisis) · *Caza el chiringuito* · Regulación y fiscalidad | Crisis históricas jugables en La Mesa |

Después, las **ramas Pro** como en TEMARIO §3, con sus juegos (Sala de M&A, Subasta de venta, Market maker, Comité de riesgos, Superday) y los modelos de referencia.

**Qué haría falta cambiar si lo apruebas:**
1. `docs/TEMARIO.md` §0–§2: nuevo orden y «Base» opcional. CLAUDE.md §8 («lección = juego → explicación → ejercicios con tus cifras») y §8b (el caso hilo empieza en bolsa).
2. `curriculum.json`: plantas nuevas. Los IDs de las lecciones existentes no cambian; solo cambia el orden en que se presentan.
3. Rehacer las unidades de la planta 0 como lecciones-juego, una por conversación, con revisor y tu revisión.
