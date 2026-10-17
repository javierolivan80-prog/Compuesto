# CLAUDE.md — Compuesto

> **Fuente de verdad del producto.** Claude Code lee este archivo en cada sesión.
> - Cómo ejecutar, verificar e informar: `EXECUTION.md` (leerlo antes de cualquier tarea).
> - Qué construir y en qué orden: `FASES.md`.
> - Contenido educativo: `docs/TEMARIO.md`.
> - Diseño y game feel de los minijuegos: `docs/JUEGOS.md`.
> - Catálogo de animaciones (explicadores, microinteracciones, secuencias): `docs/ANIMACIONES.md`.
> Si dos documentos se contradicen, manda este para el producto y `EXECUTION.md` para el proceso; la contradicción se anota en `DECISIONES.md`.

---

## 1. Qué es Compuesto

**Compuesto** es una app web **de uso personal** (PWA instalable) que enseña bolsa, inversión, contabilidad, macro, derivados y finanzas profesionales **como Duolingo**: lecciones de 3–5 min, minijuegos, rachas, rivales simulados y repaso espaciado.

- **Para quién:** un único usuario, Javier: va a empezar Finanzas y Contabilidad y su objetivo es la banca de inversión y las finanzas de inversores (buy-side), y **volverse experto en el mercado**. **No es un producto público ni comercial:** no hay usuarios externos, ingresos, marketing ni lanzamiento. Toda decisión se toma pensando en que la use bien una sola persona durante años.
- **Concepto del nombre:** el interés compuesto. Poco cada día se multiplica.
- **Promesa (ES):** *20 minutos al día. Se capitalizan.* Subtítulo: *Llega a la carrera sabiendo lo que otros aprenden en cuarto.*
- **Itinerario:** año troncal de 10 niveles (de cero a la amplitud del CFA Nivel I a nivel intuitivo, más lo específico de España) + **itinerario Pro de 6 ramas** (Investment Banking, Equity Research y Buy-side, Private Equity y VC, Banca y riesgos, Mercados, Fintech y cuantitativo) que lleva a **nivel técnico de entrevista y de primer año de analista**: construir los modelos y entregables reales (comps, DCF, LBO, merger model, CIM, informe de research, IC memo), no solo conocer los conceptos. Detalle en `docs/TEMARIO.md` §3.
- **Honestidad de la promesa:** Compuesto da conocimientos, vocabulario profesional, intuición y práctica técnica guiada a nivel de analista junior. No promete sustituir un título, un máster, el CFA ni experiencia profesional; nunca se afirma eso en la app.
- **Punto de partida:** nivel de entrada de primero de carrera; los tests de salto por unidad permiten saltarse lo que ya domine.
- **Diferencial:** lo que la carrera no enseña: fiscalidad práctica española, psicología y sesgos, leer cuentas reales en la CNMV, microestructura, fraudes, crisis históricas jugables, Excel financiero, entrevistas de banca.
- **Idioma y mercado:** español de España, contexto español (IBEX 35, CNMV, BME, Banco de España, BCE, Hacienda). El contenido en inglés queda **fuera de alcance**; la interfaz usa i18n desde el principio (todos los textos en archivos de idioma) para que añadirlo después no obligue a rehacer nada.
- **Sensación (larp):** abrir la app es entrar en una mesa de operaciones de élite. El usuario sube de rango en un banco, de **Becario** a **Leyenda**. Aspiracional, elegante, con estatus, divertido, nunca pretencioso. Las capturas deben merecer compartirse (p. ej. en su Instagram de progreso personal).

---

## 2. Restricciones innegociables

1. **Coste 0 €.** Sin pagos, anuncios ni servicios de pago.
2. **Coste de API = 0 €.** Prohibido llamar a APIs de IA o de datos de mercado de pago en ejecución. Contenido estático en JSON. Corrección, SRS, simuladores y gráficos corren en el navegador.
3. **Infra gratis:** Cloudflare Pages (o Vercel) para servir la app. Supabase Free **opcional**, solo para **sincronizar los dispositivos de Javier** (móvil y ordenador) y hacer copia de seguridad; un solo usuario, alta de nuevas cuentas desactivada. **Local-first**: la app funciona entera sin conexión ni cuenta. Si el proyecto de Supabase se pausa por inactividad, la app sigue funcionando y sincroniza al reactivarlo.
4. Fuentes auto-alojadas con `@fontsource`.
5. **Offline** tras la primera carga.
6. Sesión diseñada para **20 min**; al cumplirla, "Objetivo cumplido" sin presionar.
7. **Contenido educativo, no asesoramiento.** Empresas **ficticias** en ejemplos y juegos. La fiscalidad y la normativa llevan fuente oficial y fecha: si caducan, se marcan como pendientes de verificar. La tarjeta compartible muestra XP y progreso, **nunca** dinero.
8. **Privacidad:** solo hay datos de Javier. Sin analítica de terceros ni rastreo; las estadísticas son locales. La URL desplegada no se anuncia y Supabase solo admite su cuenta.
9. **Fuera de alcance (no construir):** ligas con otras personas, cuentas de terceros, moderación, analítica externa, landing, marketing, monetización, páginas legales públicas, contenido en inglés.
10. **Onboarding mínimo:** primera lección en menos de 60 s. El test de salto se ofrece en cada unidad, no como examen inicial largo.
11. **Navegación:** 5 pestañas: Inicio, Camino, Practicar (repaso + juegos), Rivales, Despacho. Glosario y Ajustes dentro de Despacho.

---

## 3. Stack y convenciones

- React 19 + Vite + TypeScript `strict` + Tailwind CSS v4 (tokens en CSS variables) + Radix/shadcn restyleado al 100 %.
- **Versiones fijadas con número exacto en `package.json`** tras comprobar compatibilidad en la tarea 0.1 (ver `DECISIONES.md`). Comprobado el 13/10/2026: `typescript@latest` es la 7.x, pero `typescript-eslint` solo admite TypeScript < 6.1 → usar **TypeScript 6.0.x** hasta que el lint soporte la 7. Vite 8 exige Node ≥ 20.19 o ≥ 22.12.
- Motion (ex Framer Motion) para la UI; **GSAP** (gratuito, con DrawSVG y MorphSVG) para los explicadores arrastrables, porque una línea de tiempo se controla directamente con un slider (se incorpora al construir el primer explicador que lo necesite y se anota en `DECISIONES.md`, comprobando su licencia vigente). Sonner (toasts), Vaul (bottom sheets). Confirmar con la skill `pick-ui-library`.
- Zustand, Dexie (+ `dexie-react-hooks`), Zod, **ts-fsrs** (FSRS mantenido; no se reimplementa el algoritmo). `lightweight-charts` (velas) + visx o Recharts. Tableros de juego en Canvas 2D (PixiJS solo si un benchmark lo justifica, ver JUEGOS.md §2). Pyodide (Python en el navegador, carga perezosa) solo para la rama Fintech. `html-to-image` (tarjetas compartibles). i18next (solo `es`; estructura lista para más idiomas). vite-plugin-pwa. Lucide o Phosphor (**nunca emojis como iconos**).
- Supabase (Fase 3, opcional): un único usuario con email y contraseña (sin email mágico: el correo por defecto de Supabase solo envía 2 mensajes por hora a miembros del proyecto, y no hace falta más), alta pública desactivada, RLS igualmente activo.
- Vitest + Testing Library; Playwright (flujos clave + capturas a 375/768/1440 px).
- Lógica pura en `/src/engine`, sin dependencias de React ni de IndexedDB, con tests de todas sus ramas.
- ESLint + Prettier + `tsc --noEmit` + build en CI desde la tarea 0.1.
- Evaluador de fórmulas de `spreadsheet`: **propio** (HyperFormula es GPL-3.0, incompatible con un proyecto que puede cerrarse o licenciarse distinto).
- Decisiones ante ambigüedad: la opción más simple que respete la sección 2, anotada en `DECISIONES.md`.
- Commits convencionales (`feat:`, `fix:`, `content:`, `design:`).

```
/src
  /app  /design (tokens.css, themes/, motion.ts, typography.css)
  /components
  /features  /lesson /exercises /games /srs /path /placement /session /rivals /profile /share /onboarding /report
  /engine  /store  /db  /lib  /stats
  /i18n/es.json
/content/es/       curriculum.json, glossary.json, levels/…, tracks/…
/content/shared/   companies.json, concepts.json
/docs/TEMARIO.md  /docs/JUEGOS.md  /docs/ANIMACIONES.md
/design-system/compuesto/  MASTER.md, pages/
/assets/banners/
/scripts  /tests  /e2e
PRODUCT.md  DESIGN.md  DECISIONES.md  CONTENIDO-QA.md
```

---

## 3b. Arquitectura de datos (decidida; no improvisar)

- **Registro de eventos local-first.** Toda acción del usuario es un evento inmutable en IndexedDB (`events`: `id` UUID, `type`, `payload`, `createdAt` ISO, `deviceId`, `schemaVersion`). XP, racha, progreso, tarjetas SRS y tu acción son **proyecciones** recalculables desde los eventos, cacheadas en tablas derivadas.
- **Sincronización** (Fase 3) = intercambiar entre los dispositivos de Javier los eventos que el otro no tiene, por `id`. Idempotente: la fusión es la unión de eventos y se recalcula la proyección. Los días (racha, objetivo, tu acción) se cuentan en la zona horaria del dispositivo, registrada en cada evento. Con un usuario el volumen es mínimo (lejos de los 500 MB del plan Free).
- **Dexie versionado desde el día 1** (`db.version(n)` con migraciones y test de migración). Nunca se elimina una tabla o campo sin migración.
- **IDs de contenido inmutables.** Un ejercicio publicado nunca cambia de `id`; si se corrige, sube `version`; si se retira, `status: "retired"` y sus tarjetas SRS se archivan sin romper.
- **Contenido empaquetado con la app.** La PWA avisa de nueva versión y actualiza al aceptar; nunca recarga a mitad de lección.
- **Que nunca se pierda el progreso:** pedir `navigator.storage.persist()`; exportar/importar en JSON desde Ajustes; recordatorio semanal de copia si no hay sincronización. En iPhone, Safari puede borrar los datos de una web que no se visita en 7 días si no está instalada: la app avisa y guía para instalarla en la pantalla de inicio.
- **Rivales simulados en lugar de ligas:** la competición es contra rivales ficticios del banco (los becarios de Albufera Partners, con ritmos de XP generados por semilla y dificultad que se adapta a la tuya) y contra **tu yo de la semana pasada**. Todo local; mismo atractivo de liga semanal (subes o bajas de división) sin servidor ni otras personas.
- **Service worker seguro:** versión mínima forzada e interruptor de emergencia que lo desregistra si una versión se rompe.
- **Nada falso en pantalla:** un botón sin funcionalidad no se muestra; lo que llega en una fase posterior se oculta o aparece como "Próximamente" de forma explícita.

---

## 4. Skills (uso obligatorio)

> La lista curada, con instalación y motivo, está en `SKILLS.md` (versión del 17/10/2026). Las skills de terceros se revisan antes de instalar; `EXECUTION.md` manda sobre el flujo de trabajo de cualquier skill.

Todas se instalan y se **verifican en el entorno real en la tarea 0.1**. Si alguna falla, se anota en `DECISIONES.md`, se aplican sus principios con estos documentos y se sigue: ninguna bloquea el proyecto. Las de terceros se revisan antes de instalar (son instrucciones que Claude seguirá). Desactivar la telemetría de Impeccable con `npx impeccable telemetry off`.

**Diseño y UI**
- **Impeccable** — `npx impeccable install` — lenguaje de diseño, 24 comandos y detector anti-"AI slop".
- **UI UX Pro Max** — `npx ui-ux-pro-max-cli init --ai claude` (requiere Python 3) — design system y `banner-design`.
- **Vercel agent-skills** — `npx skills add vercel-labs/agent-skills` — usar `web-design-guidelines` (auditoría de interfaz), `vercel-react-best-practices` (rendimiento React), `vercel-composition-patterns` (arquitectura de componentes) y `vercel-react-view-transitions` (transiciones entre pantallas).

**Animación y juego**
- **Emil Kowalski** — `npx skills@latest add emilkowalski/skills` — `emil-design-eng`, `animate`, `review-animations`, `improve-animations`, `find-animation-opportunities`, `animation-performance`, `animation-vocabulary`, `apple-design`, `mobile-native`, `break-ui`, `pick-ui-library`, `prototype`, `ask-sonner`.
- **LottieFiles motion-design** — `npx skills add lottiefiles/motion-design-skill --skill motion-design --agent claude-code` — principios de Disney aplicados a UI, capas primaria/secundaria/ambiental, personalidad de movimiento.
- **Animation principles (dylantarre)** — `npx skills add dylantarre/animation-principles --agent claude-code` — usar sus skills de educación/aprendizaje, visualización de datos, movimiento accesible, intuición física, ritmo, estados de carga y desarrollo de juegos.
- **Game feel** — `npx skills add gamedev-skills/awesome-gamedev-agent-skills --skill game-feel --agent claude-code` — "juice": hit-stop, sacudida, squash and stretch, feedback escalado a la importancia del evento.

**Calidad y proceso**
- **Anthropic skills** — `npx skills add anthropics/skills` — usar `webapp-testing` (pruebas con Playwright) y `skill-creator` (para crear las skills propias del proyecto). No usar su `frontend-design`: Impeccable ya parte de ella y se contradirían.
- **Skills propias del proyecto** (se crean en 0.1 con `skill-creator`, en `.claude/skills/`): `crear-unidad` (flujo completo de una unidad de contenido), `nuevo-explicador` (ficha de ANIMACIONES.md §2 → componente con estado final estático y test), `nuevo-juego` (ficha de JUEGOS.md → juego con el kit), `revisar-unidad` (llama al subagente revisor y aplica sus cambios).

| Momento | Skills |
|---|---|
| Inicio del proyecto | `/impeccable init` → `PRODUCT.md`; `ui-ux-pro-max` → design system, reconciliado con la §5 (este archivo manda) |
| Antes de cada pantalla | `/impeccable shape <pantalla>`, `vercel-composition-patterns` |
| Construyendo UI | `pick-ui-library`, `emil-design-eng`, `apple-design`, `mobile-native`, `ask-sonner`, `vercel-react-best-practices` |
| Animaciones | `motion-design` (qué y por qué) → `animate` (cómo) → `animation-vocabulary` (pedir con precisión); catálogo en `docs/ANIMACIONES.md` |
| Explicadores para aprender | `nuevo-explicador` + skills de educación y visualización de datos de animation-principles (ejes claros, sin decoración) |
| Transiciones entre pantallas | `vercel-react-view-transitions` |
| Minijuegos | `nuevo-juego`, `game-feel`, skill de juegos de animation-principles, kit de `docs/JUEGOS.md` §2 |
| Piezas clave | `prototype` (3 variantes con selector) |
| Cerrar cada pantalla | `/impeccable critique` → `/impeccable audit` → `web-design-guidelines` → `/impeccable polish` |
| Cerrar cada fase | `review-animations`, `animation-performance`, `break-ui`, `/impeccable harden`, `webapp-testing` |
| Placer | `/impeccable delight`, `find-animation-opportunities` |
| Tarjeta compartible | `banner-design` |
| Contenido | `crear-unidad`, `revisar-unidad` |
| CI | `npx impeccable detect src/` en cada PR |

Una pantalla **no está terminada** sin pasar critique + audit + polish. Si el detector marca una decisión deliberada de este documento (p. ej. el glow sutil del tema Tokio), se registra como excepción con motivo en `.impeccable/config.json`; nunca se ignora una regla entera.

---

## 5. Dirección visual — "Old Money × Trading Terminal"

Banca privada suiza (calma, papel, latón, serif) + terminal de trading (datos densos, mono, verde/rojo, ticker). Lujo silencioso, no casino.

**Motivo de marca:** la **curva exponencial del interés compuesto**. Es el logo (una curva que despega, trazo fino dorado), aparece en el anillo de progreso, en el gráfico "Tu conocimiento compuesto" y en las transiciones de subida de rango.

### Anti-patrones prohibidos
Degradados morado-azul/rosa de IA · negro o gris puros (todo neutro tintado) · tarjetas dentro de tarjetas · texto gris sobre color · Inter/Arial/sistema como única fuente · rebote/elástico en UI normal · `ease-in` en entradas · glassmorphism generalizado · iconito en cuadrado redondeado sobre cada título · animar `width/height/top/left` · verde/rojo como única señal (siempre ▲▼, signo y texto).

### Tipografía
- Display: **Instrument Serif** (alt. Fraunces).
- UI: **Geist Sans** (alt. Hanken Grotesk), 16 px mínimo en móvil.
- Cifras y tickers: **Geist Mono** con `tabular-nums` en **todas** las cifras.
- Escala 1.25 · `text-wrap: balance` en títulos, `pretty` en párrafos · máx. 65 caracteres/línea.

### Temas (OKLCH, ajustar hasta contraste AA; bull/bear con mismo significado en todos)

**Wall Street Noche (por defecto)**
```css
--bg: oklch(0.16 0.020 255); --surface-1: oklch(0.20 0.022 255); --surface-2: oklch(0.245 0.025 255);
--line: oklch(0.34 0.020 255 / 0.6); --text: oklch(0.95 0.010 85); --text-2: oklch(0.74 0.020 255);
--brand: oklch(0.80 0.120 85); --bull: oklch(0.76 0.170 155); --bear: oklch(0.66 0.200 25); --info: oklch(0.72 0.120 240);
```
**Mayfair (claro)**
```css
--bg: oklch(0.97 0.015 85); --surface-1: oklch(0.99 0.008 85); --surface-2: oklch(0.94 0.018 85);
--line: oklch(0.85 0.020 85); --text: oklch(0.22 0.030 160); --text-2: oklch(0.45 0.025 160);
--brand: oklch(0.42 0.090 160); --accent: oklch(0.68 0.120 75); --bull: oklch(0.52 0.140 155); --bear: oklch(0.55 0.190 27);
```
**Desbloqueables por rango:** Salmón (Analista, papel de prensa financiera, sin copiar marcas) · Ginebra (Asociado, marino + plata) · Monte Carlo (VP, verde carreras + oro) · Tokio 3 a.m. (Director, índigo con cian/magenta contenidos, único con glow sutil) · Platino (Managing Director, grafito + platino). Bloqueados visibles con candado y vista previa.

### Forma
Espaciado base 4 px · radios 10 / 16 / 999 px · sombras suaves semitransparentes y bordes de 1 px a baja opacidad · grano 2–3 % en fondos grandes · filete dorado fino en elementos de rango · densidad alta solo en pantallas "terminal".

### Mascota
**Bolsín**, toro pequeño original en SVG (línea + relleno plano con colores del tema). 6 estados: neutro, feliz, celebrando, pensando, ánimo, dormido (racha en riesgo). Animado con transform.

---

## 6. Motion y sensación nativa

- Curva base `cubic-bezier(0.23, 1, 0.32, 1)`. Entradas ease-out; salidas más rápidas que entradas. Todo interrumpible. Solo `transform` y `opacity`.
- Botón: `scale(0.97)` 100 ms · micro 120–180 ms · sheets 250–320 ms spring sin rebote · transición entre ejercicios 200 ms · contadores 600 ms con cifras tabulares.
- Acierto: hoja inferior 220 ms + check dibujado + háptico corto. Fallo: hoja + sacudida 4 px ×2 en 180 ms.
- Subida de rango (1,5 s): oscurecer → título en serif → la curva compuesta se dibuja en dorado → confeti dorado sobrio.
- Ticker con `transform`, pausado si la pestaña no es visible.
- `prefers-reduced-motion`: fundidos; sin marquee ni confeti.
- Nativo: `100dvh`, safe areas, sin tap highlight, inputs ≥16 px, hover solo con `(hover: hover)`, `touch-action: manipulation`, `theme-color` por tema, iconos y splash propios.
- Háptica con `navigator.vibrate` (si no existe, se omite). Sonidos propios cortos (campana de apertura/cierre, tic de acierto), silenciables.

---

## 7. El larp

1. **Rangos:** Becario → Analista Junior → Analista → Asociado → VP → Director → Director Sénior → Managing Director → Partner → **Leyenda**. Título en serif, insignia metálica, tema desbloqueado.
2. **Tu acción personal:** el perfil cotiza con ticker propio (iniciales, p. ej. `$JAV`) con velas diarias. Fórmula determinista en `/src/engine`: precio inicial 100; día con actividad `precio × (1 + 0,002 × min(XP_día, 100) / 10 × f)`, con `f` = factor de precisión entre 0,5 y 1,5; día sin actividad −1 %, con suelo en el 50 % del máximo histórico. Ajustable tras el primer mes de uso. Racha = tendencia; perderla = "corrección".
3. **Ticker en la home** con valores ficticios del universo Compuesto y tus récords y los de los rivales simulados.
4. **Briefing:** cada sesión abre con una mini portada de periódico financiero ficticio con el titular del reto del día.
5. **Tarjeta compartible** estilo captura de terminal (1080×1920 y 1080×1080): rango, racha, precisión, gráfico de tu acción y la curva compuesta. Generada en local. Solo XP, nunca dinero.
6. **Despacho** (perfil): diplomas, trofeos y una ventana con skyline que cambia según el rango.
7. **Vocabulario:** Abrir mercado (empezar) · Cierre (resumen) · Due diligence (repaso) · Comité de inversión (examen de nivel) · Cartera de conocimiento (stats).

---

## 8. Pedagogía

- **Práctica de recuperación:** máx. 60 palabras de teoría por tarjeta, máx. 3 tarjetas antes de la primera pregunta.
- **Explicadores visuales interactivos:** cada unidad usa al menos uno del catálogo de `docs/ANIMACIONES.md §2` (SVG + Motion o Canvas, sin vídeo ni API). El usuario los manipula (slider o arrastre), no solo los mira.
- **Repaso espaciado** (FSRS vía `ts-fsrs`, local) + **intercalado** de temas.
- **Dominio por concepto:** mapa de conceptos con prerrequisitos (TEMARIO §4); fallar un concepto refuerza también sus prerrequisitos débiles.
- **Argumentar sin IA:** ejercicios `best_argument` y `self_explain` con rúbrica (TEMARIO §6).
- **Documentos reales:** al menos una lección por nivel con un fragmento de documento público oficial (`document_read`).
- **Cálculo:** ejemplo resuelto → guiado (con pasos) → libre.
- **Mezcla obligatoria por lección:** máx. 40 % ejercicios de reconocer (tipo test, verdadero/falso, emparejar); mín. 40 % de producir (numérico, rellenar estados, hoja de cálculo, ordenar, categorizar); el resto, aplicar (escenarios, casos).
- **Lección:** 3–5 min, 6–10 ejercicios. Nunca más.
- **Dominio:** unidad cerrada con ≥80 % en el Jefe final.
- **Bloom por nivel:** niveles 0–2 con ≥50 % recordar/entender; niveles 3–6 con ≥50 % aplicar/analizar; niveles 7–9 con ≥30 % evaluar (trade-offs, decisiones con información incompleta).
- **Explicación específica** para cada opción incorrecta.
- **Dificultad adaptativa:** >90 % en 3 lecciones → modo experto; <60 % → refuerzo.
- **Transferencia:** cada unidad termina conectando con el mundo real ("Dónde verás esto": la web de la CNMV, el folleto de un fondo, una noticia tipo).

## 8b. La campaña: un año en Albufera Partners

El temario es una **historia**. El usuario entra como becario en **Albufera Partners**, banco ficticio con sede en Valencia. El **Camino** es el edificio: cada nivel es una planta (planta 0 recepción → planta 10 despacho de socios) y se sube en ascensor al cambiar de rango.

**Caso hilo: Naranjas del Turia S.A.** acompaña todo el año: su dueña ahorra e invierte (N0) → sale a bolsa (N1) → emite bonos (N2) → analizas sus cuentas y la valoras (N3) → la macro le afecta (N4) → su acción en el libro de órdenes (N5) → entra en tu cartera (N6) → cubre su riesgo de divisa con derivados (N7) → recibe una oferta de compra apalancada (N8) → una empresa rival del universo cae por fraude contable y aprendes a detectarlo (N9).

- **Personajes recurrentes** (texto + avatar SVG simple): tu mentora (Directora de Research), un compañero becario rival, el jefe de la mesa de trading, la compliance officer que salta con los avisos legales.
- **Encargo del jefe (semanal):** una vez por semana el Reto del día es un caso de 8–10 min en varios pasos sobre el caso hilo. Da más XP e insignia.
- Los nombres del universo ficticio se comprueban contra el registro de la CNMV para que no coincidan con empresas reales.

---

## 9. Reglas de contenido

- Esquema en `docs/TEMARIO.md`. Validación Zod al arrancar en desarrollo + `npm run content:validate`.
- Universo de **empresas ficticias** con estados financieros coherentes y reutilizados (Naranjas del Turia, Pirineo Energía, Mediterránea de Navieras, Albufera Partners…), definidos en `/content/shared/companies.json`, con 5 años de cuentas que cuadran (test automático: activo = pasivo + patrimonio, flujos que reconcilian la caja).
- **Revisión:** como Javier está aprendiendo, no puede ser la única garantía de exactitud. Cada unidad pasa por: (1) validación automática; (2) **subagente revisor** independiente (exactitud, ambigüedad, una sola respuesta correcta, nivel, ortografía); (3) **fuente obligatoria** para cada dato no trivial (manual de referencia, CNMV, Banco de España, BCE, AEAT, BOE); (4) revisión de Javier contrastando con sus apuntes de la carrera cuando el tema coincida. Los errores que encuentre al estudiar se reportan desde la app.
- Lo que caduca lleva `sources` oficiales (CNMV, AEAT, BOE, BCE, Banco de España) y `verificarAntesDe`. `npm run content:check` lista lo pendiente.
- El contenido se escribe **fuera de la app**; nunca se genera en ejecución.
- **Control de calidad** (ver `CONTENIDO-QA.md`): todo ejercicio pasa por revisión de exactitud (cálculos verificados con tests automáticos: cada `numeric_input` incluye la fórmula y un test que la recalcula), revisión de claridad y revisión de sesgos. Cada lección tiene `version` y `status` (`draft` | `reviewed` | `published` | `retired`); solo `published` llega a producción.
- **Botón "Reportar error"** en cada ejercicio: guarda el reporte en una lista local exportable como JSON, lista para pasársela a Claude Code y corregir el contenido.
- Contenido solo en español. Formatos con `Intl` (`1.234,56 €`). El esquema admite añadir otros idiomas más adelante sin cambiar IDs.

---

## 10. Accesibilidad

WCAG 2.1 AA: contraste, foco visible, navegación completa por teclado, ARIA, textos que se reajustan al 200 % de zoom, gráficos con descripción textual. **Todo gesto tiene alternativa**: swipe → botones; drag & drop → seleccionar y colocar con toque o teclado. Botones ≥48 px.

---

## 11. Estadísticas personales (sin analítica externa)

Todo se calcula en local a partir de los eventos y se muestra en Despacho: racha, días activos por semana, sesiones completadas, minutos reales por sesión, precisión por concepto, lecciones abandonadas y ejercicios más fallados (cola para revisar el contenido). Exportable a CSV. Sin servicios externos, sin identificadores.

Los errores de la app se guardan en un registro local (últimos 200) visible en un panel de diagnóstico dentro de Ajustes y exportable, para pasárselo a Claude Code.

---

## 12. Recordatorios

- Por defecto: recordatorio recurrente en el calendario (archivo .ics generado en local, hora elegida) y aviso dentro de la app.
- Opcional en la Fase 3: Web Push a sus propios dispositivos con Supabase (suscripción guardada + envío programado). En iPhone solo funciona con la app instalada en la pantalla de inicio (iOS 16.4+).
- Máx. 1 al día; tono amable ("Bolsín te guarda la racha").

---

## 13. Calidad y verificación

La definición de terminado, el protocolo de trabajo y el formato de informe están en `EXECUTION.md`.
