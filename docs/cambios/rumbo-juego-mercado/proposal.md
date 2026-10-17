# Propuesta: juego primero, mercado vivo y directo a mercados

**Fecha:** 2026-10-17 · **Pedido por:** Javier («mucha teoría», «la inflación es demasiado básica», «quiero aprender a base de juegos», «el temario no me sirve»). Decisiones suyas: lecciones-juego **y** mercado vivo; empezar **directo en mercados**; colores a criterio aplicando las skills (hecho: papel claro por defecto).

## Por qué
La app es hoy un cuestionario con explicadores: se lee, se pulsa «avanzar la animación» y se contestan preguntas tipo test. No se aprende mercado *haciendo*. Javier quiere entrar a la carrera sabiendo operar, leer noticias y valorar, no repasando ESO.

## Qué cambia

### 1. El mercado vivo: «La Mesa» (pieza central)
- Una cartera ficticia de **10.000 €** sobre las empresas cotizadas del universo (Naranjas del Turia, Pirineo Energía, Mediterránea de Navieras, Albufera Partners, Tramuntana Retail, Azahar Calderona).
- **Cada sesión juegas días de mercado.** Abres con el teletipo del día (resultados, BCE, rumores de OPA, regulación…), compras o vendes con horquilla y comisión reales, y cierras el día. Las velas se forman en directo y la mesa explica **por qué** se movió cada valor (concepto del temario enlazado).
- Comparas tu cartera con el **Índice Compuesto** y con la **inflación**: la inflación deja de ser una lección de «100 → 103» y pasa a ser la línea que tu cartera tiene que batir.
- Hasta **5 días de mercado por día real** (una semana de mercado por sesión). Todo determinista por semilla, local y sin API.
- XP por **proceso, no por suerte**: cerrar días, diversificar y leer la explicación. Ganar dinero por azar no da más XP (sesgo de resultado, CLAUDE.md §8).
- Las lecciones **desbloquean herramientas** de la mesa: órdenes limitadas, stop, ventas en corto, bonos, ETF, opciones… En la v1 solo hay órdenes a mercado.

### 2. Lección-juego
Una lección deja de ser «3 tarjetas + 8 preguntas» y pasa a:
1. **Jugar** (2–3 min): una situación de mercado con objetivo (p. ej. «compra 50 acciones antes de que salgan los resultados sin pagar más de 520 €»).
2. **Explicación** de lo que te ha pasado (máx. 60 palabras por tarjeta), con tus propias cifras.
3. **3–5 ejercicios de producir** con las cifras de tu partida (ejercicios paramétricos, tarea 2.9).

Los minijuegos actuales (campana, mesa de órdenes, ¿sube o baja?, trader impulsivo…) se reutilizan como rondas dentro de las lecciones.

### 3. Temario: directo a mercados
- El **Nivel 0 actual (finanzas personales) deja de ser obligatorio**: sus conceptos (inflación, interés compuesto, TAE) pasan a ser mecánicas de La Mesa y de las lecciones-juego, y sus lecciones quedan como «Base» opcional en Practicar. No se borra nada (los IDs no cambian; las lecciones siguen disponibles).
- **El camino empieza en Mercados** (el N1 actual, rehecho como lecciones-juego): la acción, el libro de órdenes, horquilla y liquidez, noticias y precio, rentabilidad total, dividendos y OPAs.
- Después: valoración (N3) y renta fija (N2) adelantadas en el orden, con juegos propios (DCF Express, Curva de tipos), y el resto del itinerario según TEMARIO con las 10 mejoras ya aprobadas.
- 🛑 El nuevo orden detallado del temario (qué unidades, qué juego en cada una) se propone aparte para que Javier lo apruebe antes de reescribir contenido.

## Fuera de alcance de este primer paso
Reescribir todo el contenido; ventas en corto, bonos y opciones en La Mesa; sincronización.

## Restricciones de CLAUDE.md que afectan
§2 (coste 0, offline, empresas ficticias, nunca dinero en la tarjeta compartible: la cartera es ficticia y no se comparte), §3b (eventos inmutables y proyecciones: las órdenes son eventos), §6 (motion), §8 (pedagogía: pasa a «juego primero» con práctica de recuperación después), §10 (accesibilidad: todo jugable con teclado y sin animación).

## Cambios en CLAUDE.md que implica (se aplican cuando se apruebe el temario nuevo)
- §8: «Lección = juego (2–3 min) → explicación → 3–5 ejercicios de producir con tus cifras».
- §7: La Mesa como parte del larp (la mesa de Albufera Partners).
- §8b: el caso hilo empieza en bolsa (Naranjas del Turia cotizando), no en el ahorro de su dueña.

## Riesgos
- Que La Mesa premie apostar → XP por proceso, cartera ficticia sin valor y explicación tras cada cierre.
- Que el contenido nuevo tenga errores → mismas reglas: revisor-financiero, fuentes y revisión de Javier.
