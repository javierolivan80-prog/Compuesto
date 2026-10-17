# docs/JUEGOS.md — Diseño de juegos de Compuesto

> Colócalo en `docs/JUEGOS.md`. Define cómo se **sienten** y cómo se **ven** los minijuegos. `CLAUDE.md` manda en marca y motion; este documento manda en game feel. Los juegos enseñan finanzas **jugando**: si un juego se puede ganar sin entender el concepto, está mal diseñado.

---

## 1. Principios

1. **Se entiende en 5 segundos sin leer.** La primera jugada es el tutorial: una mano animada muestra el gesto, el usuario lo repite y ya está jugando. Nada de pantallas de instrucciones.
2. **El concepto es la mecánica.** En "Cuadra el balance" lo que cuadra es el balance; en "Mesa de bonos" mover los tipos mueve los precios. La lección se aprende por las manos.
3. **Cada acción responde en menos de 100 ms** con algo visual, sonoro y háptico.
4. **Partidas de 60–120 s.** Rejugables con semilla distinta cada día y una "partida del día" con semilla diaria para batir tus récords y los de los rivales simulados.
5. **Fallar es divertido.** El error se ve (el balance se tambalea, el precio se desploma), se explica en una frase y se puede reintentar al instante.
6. **Estética de terminal, no de casino.** Lujo silencioso: nada de tragaperras, luces parpadeantes ni monedas cayendo. La emoción viene del movimiento y del ritmo, no del ruido.

## 2. Kit de game feel (compartido por todos los juegos)

Se construye una vez en `/src/features/games/kit` y lo usan todos. Las animaciones siguen CLAUDE.md §6, las reglas de juego de `docs/ANIMACIONES.md §6` y las skills `game-feel`, `animate`, `emil-design-eng`, `apple-design` y `animation-performance`. Cada juego nuevo se crea con la skill propia `nuevo-juego`.

| Pieza | Qué hace | Especificación |
|---|---|---|
| **Pop de número** | Cifra que sale del punto de acción (+120 XP, −3,2 %) | Sube 24 px y se desvanece en 600 ms, ease-out, mono tabular, verde/rojo con ▲▼ |
| **Medidor de combo** | ×2, ×3, ×4 al encadenar aciertos | Escala 1 → 1,15 → 1 en 180 ms; al romperse, se vacía en 250 ms con un tic grave |
| **Hit-stop** | Micro pausa en aciertos importantes | 40–60 ms de congelación antes de la animación de premio |
| **Sacudida** | Error grave | Traslación horizontal 4–6 px, 2 ciclos, 180 ms (solo transform) |
| **Partículas** | Celebración y aciertos críticos | Canvas, 20–40 partículas doradas o del color del tema, 700 ms, gravedad suave; desactivadas con reduced-motion |
| **Contadores** | Saldo, cartera, precio | Interpolación 400–600 ms con cifras tabulares (no bailan) |
| **Brillo de acierto** | Elemento correcto | Borde que se ilumina en el color bull y se apaga en 300 ms |
| **Anticipación** | Antes de revelar un resultado | 150 ms de "carga" (el elemento se encoge un 3 %) antes del rebote de salida |
| **Ticker de fondo** | Ambiente terminal | Cinta lenta con cifras ficticias al 30 % de opacidad; se pausa en momentos clave |
| **Sonido** | Feedback sonoro | Banco propio y corto: tic de acierto, tono grave de fallo, campana de inicio y fin, "caja registradora" sutil para combos altos. Silenciable. Nunca más de un sonido a la vez |
| **Háptica** | Móvil | 10 ms en acierto, 30 ms en fallo, patrón corto en récord (si el dispositivo lo admite) |
| **Pantalla de resultado** | Fin de partida | Rating de crédito como nota: **AAA, AA, A, BBB, BB, B**. La nota se "estampa" con escala 1,4 → 1 y un golpe seco. Debajo: qué has aprendido en una frase, tu récord y botón "Otra" |

**Rendimiento:** solo `transform` y `opacity` en el DOM; tableros con muchos elementos (libros de órdenes, partículas, gráficos en vivo) en **Canvas 2D**, o en **PixiJS** si un benchmark en la tarea 2.4 demuestra que Canvas no llega a 60 fps (la decisión se anota en DECISIONES.md). Objetivo: 60 fps con la CPU ralentizada 4× en Chrome DevTools.

**Accesibilidad:** todo juego tiene modo sin tiempo (para quien lo necesite), es jugable con teclado, anuncia los resultados al lector de pantalla y, con reduced-motion, sustituye movimientos por fundidos sin perder información.

## 3. Estructura común de una partida

1. **Entrada** (400 ms): transición a "modo terminal": la UI normal se oscurece, aparece la rejilla y el título del juego en serif.
2. **Tutorial jugable** (solo la primera vez): mano animada + una jugada guiada.
3. **Partida** con dificultad creciente cada 20–30 s.
4. **Final**: rating de crédito, la frase de aprendizaje, un dato de tu partida ("Has diversificado un 40 % más que ayer") y compartir.
5. **Repaso**: si fallaste un concepto, crea una tarjeta de repaso ligada al concepto (TEMARIO §4).

## 4. Catálogo de juegos

Cada juego indica: concepto que enseña · núcleo jugable · cómo se ve · momentos de "juice" · cuándo aparece.

### Troncal

**1. Campana de apertura** — conceptos de cualquier unidad · Niveles 0–9
- Núcleo: tarjetas que caen; desliza a la derecha (verdadero) o a la izquierda (falso) antes de que toquen el suelo. 60 s.
- Visual: tarjetas tipo teletipo sobre el parqué; la velocidad sube con el combo.
- Juice: la tarjeta acertada sale despedida con estela verde; el combo enciende el ticker de fondo; al ×5 suena la campana.

**2. Cuadra el balance** — estructura del balance · Niveles 0–3 (en N0 se juega como **Cuadra tu presupuesto**: ingresos, gastos y ahorro; el balance completo se activa en N3)
- Núcleo: partidas que llegan por una cinta; arrástralas a Activo, Pasivo o Patrimonio. Una balanza en el centro se inclina según cuadre.
- Visual: balanza de latón dibujada en línea fina; cada partida pesa visualmente según su importe.
- Juice: la balanza oscila con física amortiguada al recibir peso; cuando cuadra, se nivela con un "clic" y un brillo dorado.

**3. Mesa de órdenes** — tipos de órdenes y libro · Niveles 1, 5
- Núcleo: llegan clientes con peticiones ("compra ya", "solo si baja a 10 €"); eliges el tipo de orden y la lanzas al libro, que se mueve en vivo.
- Visual: libro de órdenes en dos columnas (compras verdes, ventas rojas) con barras de profundidad; tu orden aparece resaltada y la ves ejecutarse o esperar.
- Juice: al cruzarse, las dos barras chocan y se funden con un destello; los clientes satisfechos suben tu rating en la esquina.

**4. ¿Sube o baja?** — reacción del mercado a noticias · Niveles 1–4
- Núcleo: aparece un titular ficticio; predices y eliges el motivo; luego ves la vela formarse.
- Visual: portada de periódico ficticio que se pliega y deja ver un gráfico de velas.
- Juice: la vela crece en tiempo real con anticipación; acierto doble (dirección + motivo) dispara hit-stop y partículas.

**5. Gestor por un año** — diversificación, riesgo y comisiones · Nivel 6
- Núcleo: 10.000 € virtuales y 6 activos ficticios; un año pasa en 2 minutos; reequilibras cuando quieres.
- Visual: gráfico de área de tu cartera frente a un índice; burbujas de activos que crecen o encogen.
- Juice: los crashes oscurecen la pantalla un instante; al final, tu curva se superpone a la de "indexarse y no tocar nada".

**6. Máquina del tiempo** — crisis históricas · Niveles 6, 9
- Núcleo: vives 2000, 2008, 2012 (España) y 2020 en puntos de decisión: mantener, vender, comprar más.
- Visual: estética de archivo de cada época (tipografía y titulares de la época recreados de forma original); curvas aproximadas marcadas como tales.
- Juice: transición de "rebobinado" entre épocas; el resultado se compara con quien no hizo nada.

**7. Constructor de payoff** — opciones · Nivel 7
- Núcleo: arrastra calls y puts a una mesa; el gráfico de beneficio se redibuja en vivo. Retos: "construye una cobertura", "gana si el precio se queda quieto".
- Visual: fichas de opción como piezas; gráfico de payoff con zona verde y roja.
- Juice: el gráfico se transforma con interpolación suave al añadir piezas; reto superado → la forma se ilumina en dorado.

**8. DCF Express** — valoración · Nivel 3
- Núcleo: sliders de crecimiento, margen y WACC sobre Naranjas del Turia; el valor por acción se mueve; objetivo: caer en el rango del comité.
- Visual: cascada de flujos que crece y encoge; valor terminal como un bloque grande que muestra cuánto pesa.
- Juice: el valor por acción es un contador grande en serif; cuando entra en rango, el comité "aprueba" con un sello.

**9. Caza el chiringuito** — fraude financiero · Niveles 1, 9
- Núcleo: anuncios ficticios de inversión; toca las señales de fraude antes de que el tiempo se acabe.
- Visual: anuncios con estética de redes sociales ficticia; las señales encontradas se rodean con trazo rojo dibujado.
- Juice: encontrar todas → el anuncio se "precinta" con cinta de la CNMV ficticia.

**10. La magia del compuesto** — interés compuesto, inflación, comisiones · Nivel 0 (juego insignia)
- Núcleo: decides aportación y años; la curva crece; activa comisiones e inflación y mira cómo se come el resultado.
- Visual: la curva exponencial de la marca dibujándose en dorado; monedas apiladas que forman la curva.
- Juice: al llegar a 30 años la curva despega con zoom; cada palanca muestra un pop de "−42.000 € por comisiones".

**11. El trader impulsivo** — costes y sesgos al operar · Nivel 5
- Núcleo: tienes un botón de comprar/vender y noticias tentadoras; el juego registra cada operación y sus costes.
- Visual: dos curvas a la vez: la tuya y la de tu "gemelo paciente" que no tocó nada.
- Juice: cada operación deja una marca de coste que se va acumulando como una mancha; al final, comparación brutal.

**12. Stress test** — capital y liquidez de un banco · Nivel 4
- Núcleo: diriges Albufera Partners en una crisis; decides capital, liquidez y préstamos para sobrevivir 4 trimestres.
- Visual: indicadores tipo panel de control (CET1, LCR) como agujas analógicas.
- Juice: si una aguja entra en rojo, alarma visual sobria y las paredes del despacho "tiemblan".

**13. Curva de tipos** — renta fija · Nivel 2
- Núcleo: arrastra la curva de tipos (subir, bajar, empinar, aplanar) y mira cómo cambian los precios de 5 bonos; responde retos ("haz que el bono largo caiga más del 10 %").
- Visual: curva elástica que se deforma con el dedo; bonos como barras que suben y bajan.
- Juice: la curva tiene física de cuerda; los bonos largos reaccionan más que los cortos y se ve al instante.

**14. Ciclo de caja** — circulante · Nivel 3
- Núcleo: gestionas una fábrica de Naranjas del Turia: plazos de cobro, pago y stock; si la caja llega a cero, quiebras aunque ganes dinero.
- Visual: circuito animado de dinero → stock → ventas → cobros, con una caja que se llena y vacía.
- Juice: la caja vacía parpadea; descubrir el factoring o el confirming la rescata con una animación de inyección.

### Ramas

**15. Comité de riesgos** (Banca y riesgos) — riesgo de crédito
- Núcleo: llegan solicitudes de préstamo con datos; apruebas, rechazas o pides garantías; meses después ves quién paga y quién entra en mora.
- Visual: expedientes que se deslizan por la mesa; tu cartera de préstamos como mosaico que se tiñe según la morosidad.
- Juice: el mosaico se actualiza trimestre a trimestre con un barrido; provisiones y beneficio en contadores grandes.

**16. Market maker** (Mercados) — horquilla, inventario y riesgo
- Núcleo: das precio de compra y venta; los clientes llegan; ganas la horquilla pero si acumulas inventario y el precio se mueve, pierdes.
- Visual: libro de órdenes en vivo con tu precio destacado; medidor de inventario.
- Juice: cada operación hace "tic"; inventario peligroso → el medidor vibra.

**17. Sala de M&A** (Investment Banking) — acreción/dilución y sinergias
- Núcleo: negocias la compra de una empresa ficticia: precio, mezcla de deuda y acciones; el BPA del comprador se recalcula en vivo.
- Visual: mesa de negociación con dos carpetas; barras de BPA antes y después.
- Juice: cerrar el acuerdo → apretón de manos animado de forma sobria y "tombstone" conmemorativo para el Despacho.

**18. La trampa del backtest** (Fintech y cuantitativo) — sobreajuste
- Núcleo: ajustas una estrategia hasta que el histórico es perfecto; luego llega el periodo fuera de muestra.
- Visual: gráfico de la estrategia que se ve perfecto en gris y se desmorona en color al pasar al futuro.
- Juice: el momento de la revelación con hit-stop y zoom; lección: "lo que funciona en el pasado por casualidad, falla en el futuro".

**19. Superday** (todas las ramas Pro) — preguntas técnicas de entrevista
- Núcleo: 4 rondas de 3 minutos con entrevistadores ficticios distintos (contabilidad, valoración, LBO/M&A, mercados y "por qué banca"); preguntas de las lecciones marcadas `interview: true`, mezcla de tipo test, numéricas rápidas y `best_argument`.
- Visual: sala de reuniones de Albufera Partners vista desde la mesa; reloj analógico que corre; cara del entrevistador que reacciona (gesto neutro, asiente, frunce el ceño).
- Juice: respuesta perfecta → el entrevistador apunta algo con trazo dorado; al final, "oferta" o "rechazo" en una carta con membrete y la lista de preguntas que fallaste convertidas en tarjetas de repaso.

**20. Subasta de venta** (Investment Banking) — proceso de venta
- Núcleo: vendes una empresa ficticia; eliges a quién invitar (industriales y fondos), gestionas rondas de ofertas, das acceso al data room y negocias; tensión entre precio, certeza de cierre y plazos.
- Visual: tablero tipo pizarra de deal con los compradores como fichas; ofertas que aparecen como sobres sellados que se abren.
- Juice: subir el precio en la última ronda dispara anticipación + revelado; firma final con pluma estilográfica y "tombstone" para el Despacho.

## 5. Criterios de aceptación de cualquier juego

- Se empieza a jugar en ≤ 5 s sin leer instrucciones (lo compruebas tú la primera vez que lo abres, 🛑).
- No se puede sacar AAA sin dominar el concepto (test: un jugador que responde al azar saca ≤ B).
- 60 fps con CPU ralentizada 4× (traza adjunta); sin tirones al entrar ni al salir.
- Jugable con teclado; modo sin tiempo; reduced-motion probado.
- La misma semilla produce la misma partida (test).
- Pasa `review-animations` y `/impeccable critique`.

## 6. Disponibilidad

Cada juego declara los conceptos que usa (`concepts`, ids de `concepts.json`). Solo entra en la sesión diaria si esos conceptos ya se han visto o saltado. En los Niveles 0–1 están disponibles: Campana de apertura, Cuadra tu presupuesto, Mesa de órdenes, ¿Sube o baja? y La magia del compuesto.
