# DECISIONES.md

## 2026-10-15 — Tarea 0.1: versiones fijadas (comprobadas con `npm view`)

Todas con número exacto en `package.json`. Node 22.22 (Vite 8 exige ≥ 22.12; `.nvmrc` = 22.12).

| Paquete | Versión | Nota |
|---|---|---|
| react / react-dom | 19.3.1 | |
| vite | 8.3.4 | |
| @vitejs/plugin-react | 6.1.2 | peer `vite ^8` |
| tailwindcss + @tailwindcss/vite | 4.3.3 | |
| typescript | **6.0.3** | `latest` es 7.0.2, pero typescript-eslint 8.71.2 exige `<6.1.0` |
| typescript-eslint | 8.71.2 | |
| eslint / @eslint/js | 10.12.0 / 10.0.1 | |
| eslint-plugin-react-hooks | 7.1.1 | |
| vitest | 5.0.4 | peer `@types/node ^22 \|\| >=24` |
| @types/node | 22.20.5 | alineado con Node 22 |
| jsdom | 30.1.2 | |
| @testing-library/react / dom / jest-dom | 16.3.3 / 10.4.2 / 7.0.1 | `dom` es peer de `react` |
| @playwright/test | 1.64.1 | |
| vite-plugin-pwa | 2.0.0 | peer `workbox-build` y `workbox-window` 7.4.1 (instalados) |
| motion | 14.2.0 | |
| sonner / vaul | 2.0.8 / 1.1.2 | |
| dexie | 4.4.6 | |
| ts-fsrs | 5.4.2 | |
| prettier | 3.9.10 | |

Alternativas descartadas: TypeScript 7 (rompe el lint).
No instaladas todavía (se añaden cuando se usen, para no meter dependencias sin código): Zustand, Zod, i18next, lightweight-charts, visx/Recharts, html-to-image, Supabase.

## 2026-10-15 — Playwright en este entorno

Chromium viene preinstalado en `/opt/pw-browsers`; no se ejecuta `playwright install`. `playwright.config.ts` acepta `PLAYWRIGHT_CHROMIUM_PATH` para apuntar al binario. En CI se instala con `npx playwright install --with-deps chromium`.

## 2026-10-15 — Estado de las skills (CLAUDE.md §4)

| Skill | Estado |
|---|---|
| Impeccable | **No funciona**: `npx impeccable install` falla (el proxy del entorno no alcanza `impeccable.style`). El CLI sí arranca (`impeccable detect` disponible). `telemetry off` no existe como comando en la versión actual (`impeccable --help` no lo lista); se anota y se revisa al instalarlo. Alternativa: aplicar sus principios con PRODUCT.md/DESIGN.md y reintentar desde un entorno con red. |
| UI UX Pro Max | Funciona (instalada en `.claude/skills/ui-ux-pro-max`, `design-system`, `banner-design`, etc.). |
| Vercel agent-skills | Funciona (`web-design-guidelines`, `vercel-react-best-practices`, `vercel-composition-patterns`, `vercel-react-view-transitions`). |
| Emil Kowalski | Funciona (`emil-design-eng`, `animate`, `review-animations`, etc.). |
| LottieFiles motion-design | Funciona (`motion-design`). |
| dylantarre animation-principles | Funciona; instala muchas skills (≈70). Se usarán las de educación, visualización de datos, movimiento accesible, ritmo, estados de carga y juegos. |
| game-feel | Funciona. |
| Anthropic skills | Funciona (`webapp-testing`, `skill-creator`). Se eliminó `frontend-design` por contradecir a Impeccable (CLAUDE.md §4). |

Las skills de terceros ejecutan con permisos del agente: **pendiente revisión humana** de su contenido antes de confiar en ellas (`skills-lock.json` fija las fuentes).

## 2026-10-15 — Skills propias y subagente

Creados a mano en `.claude/skills/` (`crear-unidad`, `nuevo-explicador`, `nuevo-juego`, `revisar-unidad`) y `.claude/agents/revisor-financiero.md`, basados en TEMARIO §8, ANIMACIONES §2 y JUEGOS §2–§5. No se usó el flujo de evals de `skill-creator` (sobredimensionado para instrucciones de proceso de 6 pasos); se pueden afinar con él más adelante.
Un subagente nuevo solo se registra al reiniciar Claude Code, así que la prueba en esta sesión se hizo cargando sus instrucciones en un agente de solo lectura (ver informe).

## 2026-10-15 — Tarea 0.2: PRODUCT.md y DESIGN.md manuales
`/impeccable init` no está disponible (Impeccable no se pudo instalar, ver 0.1), así que `PRODUCT.md` y `DESIGN.md` se escribieron a mano desde CLAUDE.md §1, §2, §5–§8b. UI UX Pro Max sí generó `design-system/compuesto/MASTER.md`; orientado a landing SaaS, se reconcilió al final del propio archivo (lista de propuestas descartadas y motivo).

## 2026-10-15 — Tarea 0.3: tokens, temas, tipografía y motion
- Fuente única de los colores: `src/design/themes/themes.css`. El test `tests/contrast.test.ts` lee ese mismo CSS, convierte OKLCH → sRGB (`src/engine/color.ts`) y comprueba 11 pares por tema (texto, texto-2, brand, bull, bear, info sobre fondo/superficies) ≥ 4,5:1 en los 7 temas. Pasó a la primera con los valores de abajo; no hubo que ajustar ninguno.
- CLAUDE.md §5 solo da valores completos para Noche y Mayfair. Los de Salmón, Ginebra, Monte Carlo, Tokio y Platino los he definido yo siguiendo la descripción (papel de prensa, marino + plata, verde carreras + oro, índigo con cian/magenta, grafito + platino). **Pendiente de tu validación visual** en 0.6.
- Añadidos a los dos temas base los roles que faltaban: `--accent` en Noche (= info) y `--info` en Mayfair (`oklch(0.5 0.12 245)`).
- Glow solo en Tokio (`--glow`), la excepción documentada en CLAUDE.md §4.
- Tailwind v4: colores/fuentes expuestos con `@theme inline` apuntando a las variables, así cambian con `data-theme` sin recompilar.
- Reduced-motion: en CSS las duraciones pasan a ~0; en JS `transition()` sustituye el movimiento por un fundido de 120 ms.
- Página de prueba `#tokens` (`TokensDemo`), solo en desarrollo; la sustituye `/styleguide` en 0.5.
- Escala tipográfica: `--text-xs` y `--text-sm` valen lo mismo (0,8 rem); se separarán cuando haga falta.

## 2026-10-15 — Tarea 0.4: marca
- Logo (`src/brand/Logo.tsx`): curva del interés compuesto en trazo dorado fino + wordmark en Instrument Serif; usa variables del tema. Bolsín (6 estados, respiración y parpadeo con transform, desactivados con reduced-motion) y 4 avatares (Elena Marqués, Hugo Ferrer, Ramón Climent, Pilar Soler; nombres inventados, **pendiente de comprobar contra el registro de la CNMV** como pide CLAUDE.md §8b). Todos originales y planos; nada que imite un personaje o marca.
- Iconos PWA desde `assets/brand/*.svg` con `scripts/build-icons.mjs` (192, 512, maskable 512 con zona segura, apple-touch 180, favicon 32 + SVG). Colores fijos del tema Noche (los iconos no pueden cambiar de tema). Un test comprueba los tamaños exactos.
- Bug encontrado por el e2e: el minificador de CSS reescribe `oklch(0.16 0.02 255)` como `oklch(16% .02 255)`, y el parser fallaba en producción (la app no arrancaba). Corregido en `parseOklch`, con test, y el e2e ahora comprueba que no hay errores de página y que `theme-color` se sincroniza.
- Pendiente de tu criterio visual (0.6): el tono de piel de los avatares usa `--text-2` y en temas claros queda oscuro/verdoso.

## 2026-10-15 — Tarea 0.5: componentes base y /styleguide
- `/styleguide` existe solo con `import.meta.env.DEV` (en producción no se monta; un e2e lo comprueba). Por eso Playwright tiene dos proyectos: `prod` (build + preview, :4173) y `dev` (vite, :5174).
- lightweight-charts no entiende OKLCH: `CandleChart` convierte los tokens a hex con `oklchToHex`. El canvas va `inert` y el resumen textual (primera/última cotización, variación, "datos de ejemplo") hace de descripción accesible. La librería muestra su logotipo de atribución de TradingView (lo exige su licencia Apache-2.0 con NOTICE); no se oculta.
- Contador (`AnimatedNumber`): el valor final va en texto solo para lector de pantalla y el animado en `aria-hidden`, para que no anuncie cada fotograma.
- Axe se ejecuta con reduced-motion activado (estado final de las animaciones); con opacidades a medias da falsos positivos de contraste.
- Detector de diseño (`npx impeccable detect src/`): un hallazgo (`border-accent-on-rounded` en la hoja de feedback), corregido quitando el radio (la hoja va de borde a borde). Ahora sin hallazgos.
- Secuencias implementadas: subida de rango, ascensor, comité aprobado, cierre semanal (FLIP con `layout`), impresión de la tarjeta. **Sin sonido** (campana, ding): el banco de sonidos no entra en 0.5. Confeti en Canvas 2D, apagado con reduced-motion. Transiciones entre pantallas: View Transitions (fundido 160 ms) con fallback de Motion (`AnimatePresence`) cuando el navegador no las soporta; en Chromium se ve la rama nativa, la de fallback no se ha ejercitado en navegador.
- Fuera de lo pedido y no hecho: "ordenar/arrastrar", "cálculo guiado" (FLIP de números a la fórmula), "hoja de cálculo" y "balance que cuadra" de ANIMACIONES §3; pertenecen a los ejercicios de la Fase 1.

## 2026-10-15 — Tarea 0.6: elecciones de diseño
- **Elegido por Claude, no por Javier.** Javier respondió "Sigue" sin elegir y había pedido no parar entre pasos; para no bloquear se aplicó la recomendación de Claude. **Es revertible**: las variantes descartadas están en el commit `design: prototipos con 3 variantes…` (`git show` de `src/prototypes/Prototypes.tsx` y `docs/prototipos/`). Si prefieres otra, dilo y se cambia.
  - Tarjeta de ejercicio → **B** (pregunta en serif grande, opciones en píldoras): escala a enunciados y opciones largas en móvil y es la más coherente con "Old Money".
  - Home → **A** (portada de periódico + ticker): es el "briefing" de CLAUDE.md §7.4 y el ticker de §7.3.
  - Camino → **A** (corte del edificio): lista robusta para 10 plantas + ramas; el ascensor ya existe como secuencia entre plantas.
- Aplicado como `ExercisePrompt`, `Briefing` y `Building` (visibles en `/styleguide`); eliminados `/prototypes` y sus capturas.
- Revisión de cierre sobre `/styleguide`: critique visual (capturas 375 px), `web-design-guidelines` (reglas de Vercel descargadas y aplicadas: inputs con `autocomplete="off"` y `spellcheck` desactivado, placeholders con "…", estado de carga con "…", `overscroll-behavior: contain` en el sheet, enlace "Saltar al contenido"), audit (axe, 7 temas, 0 violaciones) y detector de Impeccable limpio. Reglas de copy en inglés de esa guía (Title Case, etc.) no se aplican: la interfaz es en español.
- `/impeccable critique|audit|polish` como comandos no se pudieron ejecutar (Impeccable sin instalar); se sustituyeron por lo anterior.

## 2026-10-15 — Tarea 1.1: datos local-first
- **Eventos** (`src/engine/events.ts`, Zod 4): `lesson_started`, `exercise_answered`, `lesson_completed`, `unit_skipped`, `settings_changed`. Campos de CLAUDE.md §3b + `tz` (zona IANA del dispositivo, por defecto Europe/Madrid) para contar los días en la zona del evento. Se añaden tipos nuevos añadiendo variantes, sin tocar los existentes.
- **Día = fecha natural en la zona del evento** (`Intl.DateTimeFormat`), así el cambio de hora de marzo (23 h) y octubre (25 h) funciona sin aritmética de horas; la suma de días es de calendario. Tests: medianoche de Madrid en invierno y verano, los dos cambios de hora, zona distinta.
- **Racha:** día activo = con XP > 0 (responder mal no cuenta). Congeladores: se gana 1 cada 7 días de racha (máx. 2) y se consume solo al perder un día; hoy no cuenta como fallo hasta que termina. **Regla inventada por mí** (CLAUDE.md solo dice "congeladores"): ajustable tras la prueba personal.
- **Rangos por XP** (Becario 0 · Analista Junior 500 · Analista 1.500 · Asociado 3.500 · VP 7.000 · Director 12.000 · Director Sénior 19.000 · MD 28.000 · Partner 40.000 · Leyenda 55.000): umbrales **provisionales**, a calibrar con la velocidad real de XP.
- **Planta** = nivel más alto con alguna lección completada (`PROVISIONAL(tarea 1.9)`; se afinará cuando exista el curriculum, 1.2).
- **Objetivo diario** medido en XP (ajuste `dailyGoalXp`, 60 por defecto); la sesión de 20 min en tiempo llega con 2.2.
- **Dexie v1** con `events`, `progress`, `stats`, `srs_cards` (vacía hasta 2.1, `PROVISIONAL(tarea 2.1)`), `settings`, `content_reports`. El test de migración abre con la clase actual una base creada con el esquema v1; hoy no hay v2, así que prueba que el v1 sigue siendo legible y es la plantilla para cuando se añada la primera migración real.
- **Proyecciones:** el repositorio recalcula todas desde los eventos en cada escritura (con un solo usuario son pocos miles de eventos); más simple y a prueba de divergencias que el incremental. Si el volumen lo exigiera se optimiza después. `summary()` recalcula si cambió el día.
- Los ajustes `device.*` (id de dispositivo) no son proyección y la reconstrucción no los toca.
- **Copia de seguridad:** JSON `compuesto-backup` v1 con eventos y reportes (las proyecciones se recalculan al importar); valida con Zod **antes** de tocar nada; modos `replace` (por defecto) y `merge` (unión por id). `requestPersistence()` envuelve `navigator.storage.persist()`.
- Sin UI en esta tarea (la excluye el prompt). Todavía nada llama a `requestPersistence()` ni a `Repository`: se conectan en el onboarding/sesión (1.5+).

## 2026-10-15 — Tarea 1.2: infraestructura de contenido
- **Esquemas Zod** (`src/content/schemas.ts`) de lección, los **19 tipos de ejercicio** (un test acepta un ejemplo válido de cada uno), glosario, test de salto (exactamente 8 preguntas), curriculum, conceptos y empresas. Reparto de tipos 4 reconocer + 7 producir + 8 aplicar (TEMARIO §6). Los campos propios de cada tipo (p. ej. `chart.seed`, `rubric` de 3 criterios, `hiddenTests`) los he definido yo a partir de la descripción; se ajustarán al construir cada componente (2.3, 6.1) sin romper ids.
- **Evaluador de fórmulas propio** (`src/engine/expr.ts`, sin `eval`): aritmética, comparaciones, referencias de celda y rangos, y funciones en inglés y español (SUMA, PROMEDIO, SI, VF, VA, VNA…). Lo usa `content:validate` para `numeric_input` y `spreadsheet`, y lo reutilizará el ejercicio `spreadsheet` (tarea posterior).
- **Tolerancia** de `numeric_input` = % relativo; con 0 el margen es 1e-6 relativo. Una respuesta redondeada necesita `tolerance > 0` para pasar (obliga al autor a decirlo).
- **content:validate** (`npm run content:validate`, ahora con `tsx`): esquema, ids únicos, **ids estables** (`content/shared/ids-lock.json`: lo reviewed/published no puede desaparecer, se marca `retired`; se actualiza con `-- --update-lock`), conceptos existentes/sin ciclos/sin prerrequisitos de nivel posterior, concepto no usado antes de su nivel, 6–10 ejercicios, ≤40 % reconocer y ≥40 % producir, `published` exige `humano` y `reviewed` exige `subagente`, empresas reales prohibidas fuera de `document_read` y lecciones `historical` (lista en `real-companies-blocklist.json`), fiscalidad/normativa exige fuente y `verificarAntesDe`, y comprobaciones semánticas por tipo (índices, huecos, categorías, balance que cuadra…). Las explicaciones por opción incorrecta son error en `reviewed/published` y aviso en `draft`.
- **Bloom por nivel:** se calcula sobre lecciones reviewed/published; es **error con ≥4 lecciones** del nivel y aviso con menos (con 1–3 lecciones la distribución no es representativa).
- **content:check:** lista `verificarAntesDe` vencido (sale con código 1) o dentro de 30 días.
- **Mapa de conceptos** (`content/shared/concepts.json`, 253): detalle completo (descripción y unidad) en N0 (28) y N1 (30); esqueleto id/nombre/prerrequisitos en N2–N9 y en las 4 ramas. Nombres y prerrequisitos de N2+ salen de las listas del TEMARIO y son una **primera propuesta a revisar** al producir cada nivel. `curriculum.json` define las 6 unidades de N0 y las 6 de N1 (nombres míos agrupando los temas del TEMARIO).
- **companies.json:** Naranjas del Turia, Pirineo Energía, Mediterránea de Navieras, Albufera Partners y Tramuntana Retail, 2021–2025, en miles de €. Generadas con un modelo (ingresos, márgenes, circulante, capex, deuda, dividendos) que **cuadra por construcción** y se verifica con tests: activo = pasivo + patrimonio, caja reconcilia, reservas = previas + resultado − dividendos, inmovilizado = previo + inversión − amortización, flujo operativo = resultado + amortización − Δcirculante. El primer año (2021) se genera a partir de un 2020 no publicado, por eso solo sus identidades internas se comprueban. Albufera Partners se modela como empresa de servicios (no como banco) para usar un único esquema. **Pendiente:** comprobar los 5 nombres contra el registro de la CNMV (CLAUDE.md §8b) y el de los 4 personajes.
- Fixtures: `tests/fixtures/content/` (una lección válida; dos inválidas, con 10 errores distintos). La lección válida NO está en `/content` para que no cuente como contenido publicable.
- Sin lecciones reales todavía (lo excluye el prompt): `content:validate` da 0 lecciones; el glosario está vacío y el `ids-lock` también.

## 2026-10-15 — Tarea 1.3: ejercicios de reconocer y producir básicos
- **Corrección pura** en `src/engine/grading.ts` (8 tipos) + `number-parse.ts`. `grade()` devuelve `{correct, empty, wrongChoice, wrongItems, parsed}`; "vacío" no es fallo (el botón Comprobar queda deshabilitado). `feedbackText()` antepone la `wrongExplanation` de la opción elegida a la general.
- **Números es/en:** con dos separadores el último es el decimal; con uno repetido es de miles; con uno solo y 3 dígitos detrás se lee como miles en el idioma que lo usa así ("1.234" en español = 1234, "1,234" en español = 1,234); en cualquier otro caso es decimal. Cubierto con 38 casos (incluye "1.001,00 €", "12,5 %", signo menos tipográfico). Limitación conocida: en español "1,500" se lee como 1,5; si un ejercicio pide miles escritos así, se tendría que indicar el formato.
- **fill_blank** ignora mayúsculas, tildes, espacios y puntuación final y acepta variantes (`answers[i]` es una lista).
- **order_steps:** arrastrar (Reorder de Motion) **y** botones Subir/Bajar; el barajado es determinista por id y nunca deja la solución hecha. **categorize** y **match_pairs** se contestan tocando (elemento → categoría/pareja), sin arrastrar: en móvil es más fiable y es la alternativa accesible; el arrastre queda como mejora opcional (nota para 1.10). **true_false_swipe:** deslizar (±80 px) o botones Falso/Verdadero.
- **ExerciseRunner:** respuesta → Comprobar (Enter también) → hoja de feedback → Continuar. Un número ilegible no gasta intento: muestra "Error: escribe un número…". Acierto y fallo se indican con texto además de color (✓ Correcta / ✗ Incorrecta, "✗ era Activo").
- `ExerciseCard` admite `multi` (role checkbox). `/exercises-lab?type=…` (solo desarrollo) muestra un ejemplo de cada tipo (`samples.ts`, `PROVISIONAL(tarea 1.4)`).
- **Sonidos opcionales: no hechos** (el banco de sonidos llega con el kit de juegos, 2.4). La háptica ya estaba en `FeedbackSheet`.
- Verificación: 305 tests (corrección por tipo con aciertos, fallos, vacíos y coma decimal; componentes completados solo con teclado) y 8 e2e en Chromium real que completan cada tipo **solo con teclado** y pasan axe en reposo y con feedback, más 375 px sin scroll horizontal.

## 2026-10-15 — Tarea 1.4: rebanada vertical (Unidad 1 del Nivel 0)
- **Reorganización de unidades de N0** (concepts.json, curriculum.json): `FASES.md` pide que la Unidad 1 sea el interés compuesto, así que n0-u1 pasa a ser "El dinero en el tiempo: inflación e interés compuesto" (inflación, tipo real, interés simple y compuesto, regla del 72, valor temporal) y las demás se renumeran (u2 TIN/TAE/préstamos, u3 presupuesto y Excel, u4 bancos y depósitos, u5 seguros, pensiones y riesgo).
- **Contenido:** 5 lecciones (4 + Jefe final), 41 ejercicios con tipos 1–8, `reviewed` tras 2 rondas del subagente (detalle en `CONTENIDO-QA.md`). El revisor encontró 4 problemas mayores que no había visto yo: un ejercicio con fórmula aún no enseñada, logaritmos en el nivel 0, un valor actual sin ejemplo resuelto y un orden con dos soluciones válidas. Regla para el resto del contenido: **no pedir en un ejercicio nada que la intro de esa lección no haya enseñado; en `order_steps`, cada paso debe depender del anterior (sin pasos intercambiables); tolerancias lo más estrechas que admita el redondeo del enunciado.**
- **Validador ampliado:** máx. 3 tarjetas de teoría, ≤ 60 palabras por tarjeta, el explicador debe existir (`explainer-names.ts`) y sus props se validan con Zod (`explainer-props.ts`): los explicadores reciben los valores de la lección, nunca datos fijos.
- **Explicadores** (`src/features/lesson/explainers/`): componente común `Explainer` + `CompoundCurve`, `InflationCart`, `Rule72`. Nacen en su **estado final** (con reduced-motion no hay nada que esperar); ▶ reproduce desde 0 (6 s) y el deslizador recorre el tiempo a mano (interrumpe la animación); con reduced-motion el botón pasa a "Avanzar la animación" paso a paso. Pasos numerados sincronizados, descripción textual y evento `explainer_interacted` (nuevo tipo de evento) una vez por explicador. Hechos a mano siguiendo `nuevo-explicador`; no se ejecutaron `review-animations` ni `/impeccable critique` (no disponible la segunda).
- **Pantalla de lección** (`LessonScreen`): teoría → ejercicios → Cierre. Los fallos vuelven al final **una sola vez** (si se falla también el repaso, la lección sigue sin XP: no bloquear). **XP:** 10 por acierto a la primera, 5 al acertar el repaso, 0 al fallar; bonificación de cierre 20 si la precisión ≥ 80 %, si no 10 (`lesson-session.ts`, probado). Reglas mías, ajustables tras la prueba personal. Si guardar el progreso falla, se avisa y se deja terminar.
- **Home mínima** (`HomeMinimal`, `PROVISIONAL(tarea 1.7)`) y ruta por hash `#/leccion/<id>`. El contenido se empaqueta con la app (`import.meta.glob`): en producción solo se juega `reviewed`/`published`; en desarrollo también `draft`.
- **Ejercicio de verdadero/falso:** el título pasó a ser "Verdadero o falso" y el enunciado va en la tarjeta (antes salía duplicado).
- **Verificación:** 328 tests; e2e de producción que juega las 5 lecciones con las respuestas leídas de los JSON, falla a propósito un ejercicio (vuelve al final, 5 XP, precisión 88 %), comprueba 95 XP tras L1 y **515 XP / rango Analista Junior** al final, y que tras **recargar** siguen XP, racha y lecciones completadas; axe sin errores en Home, teoría con explicador y feedback. Capturas a 375 px en `docs/capturas/1.4/`.
- **No verificado:** los explicadores con movimiento real (los e2e usan reduced-motion para determinismo; la reproducción se probó solo en tests unitarios del componente y a mano en la captura del estado final); revisión visual de calidad y pedagógica (decisión humana).

## 2026-10-15 — Tarea 1.5: build_statement y spreadsheet
- **Evaluador de fórmulas** (`src/engine/expr.ts`, ampliado): `TIR`/`IRR`, `VNA`/`NPV`, `SI`, separador `;` con coma decimal (`=SUMA(1,5; 2,5)`, como Excel en español) o `,` con punto, y **códigos de error tipo Excel** con mensaje en español: `#DIV/0!`, `#REF!`, `#NAME?`, `#NUM!`, `#VALUE!`, `#SYNTAX!` (fórmula inválida) y `#CIRC!`.
- **TIR: método y fiabilidad.** No uso Newton (puede divergir según la estimación inicial): se busca un cambio de signo del VAN en una malla de tasas (de −99 % a 10.000 %) y se refina por **bisección** en cada intervalo, así que siempre converge si hay solución. Con varias TIR devuelve la más cercana a la estimación (como Excel); sin cambio de signo (todos los flujos del mismo signo) da `#NUM!`. Verificada contra 8 casos de referencia calculados aparte con aritmética decimal de 50 dígitos (error < 1e-9), incluida una TIR negativa, una del 65 %, una con 11 flujos y el caso de dos TIR (10 % y 20 %). **No fue necesario parar**: la convergencia es fiable.
- **Hoja** (`src/engine/sheet.ts`): evalúa celdas con dependencias encadenadas, propaga errores a las celdas que dependen de ellas, detecta ciclos y calcula los precedentes de una fórmula (se resaltan al enfocar una celda).
- **Corrección de `spreadsheet` por resultado, no por texto** (`gradeSpreadsheet`): se evalúa la hoja con lo escrito y se compara el valor de `target`. Tres salvaguardas nuevas en el esquema: `requireFormula` (un número tecleado a mano no vale, por defecto sí se exige fórmula), `hiddenCases` (se cambian las entradas y la fórmula debe seguir dando el valor correcto: rechaza `=1000*1.05`) y `editable` (solo cuentan las celdas permitidas: no se puede cambiar un dato). El validador evalúa la solución de referencia con esos casos.
- **`build_statement`:** totales en vivo mientras se rellena (activo vs pasivo + patrimonio con ✓/✗ "cuadra", resultado de la PyG, variación de caja) y corrección por hueco con la cifra correcta al fallar. Con más de un hueco no hay una única respuesta por identidad contable, así que se exige coincidir con cada cifra (tolerancia 0,005).
- **Accesibilidad:** la hoja es una tabla real (`th scope`, `caption`), cada celda editable es un `input` con nombre "Celda B3"; los resultados en vivo van en `aria-live` (no en `role=status`, que ya usa la hoja de feedback). En móvil la hoja se desplaza en horizontal dentro de su contenedor (sin scroll de página).
- Los 10 ejemplos de `/exercises-lab` pasan la validación semántica del contenido (el balance del ejemplo cuadra: 37.926 = 14.195 + 23.731).
- Verificación: 369 tests (evaluador, hoja, corrección de ambos tipos, totales, componentes con teclado) y e2e de **cada uno de los 10 tipos** completado solo con teclado + axe en reposo y con feedback.
- **No hecho / siguiente:** no hay todavía contenido real que use estos tipos (llega con N1+); celdas con formato (moneda, %) y la línea fina de dependencias hacia el resultado de ANIMACIONES §3 (solo se resaltan los precedentes).

## 2026-10-15 — Tarea 1.6: onboarding y tests de salto
- **Onboarding de 3 pantallas** (carta de Elena Marqués y Albufera Partners → minutos al día [5/10/15/20, 20 por defecto] → iniciales para el ticker `$JAV` [2–4 letras]) y termina **directamente en la primera lección**. Guarda 4 eventos `settings_changed` (`dailyMinutes`, `dailyGoalXp`, `tickerInitials`, `onboarded`). Minutos → objetivo de XP: 5→20, 10→40, 15→60, 20→80 (tabla mía). Medido en e2e de producción: **0,7 s** de carga a primera lección (límite: 60 s). Si el almacenamiento falla no se bloquea al usuario: se avisa y se puede empezar.
- **Test de salto** (`engine/placement.ts`, pura): 8 preguntas, **≥ 80 % domina** → con 8 preguntas eso es 7 de 8 (87,5 %); 6 de 8 (75 %) no. Lo no contestado cuenta como fallo. Sin ayudas ni solución inmediata (`showFeedback=false` en el runner); la solución se ve al estudiar la unidad. Cada respuesta es un `exercise_answered` **sin XP**: el test no infla XP ni racha. Aprobar guarda `unit_skipped`; la unidad queda "Dominada por test de salto" y su botón se desactiva.
- **Conceptos vistos:** `projectSeenConcepts` = conceptos de los ejercicios respondidos ∪ conceptos de las unidades saltadas (curriculum). Es la entrada del repaso espaciado (2.1); probado con test unitario y de integración.
- **Saltar nivel completo** (`LevelSkip`): cadena de los tests de las unidades en orden; **se detiene en la primera unidad suspendida** (las anteriores quedan saltadas, esa se estudia). Es una decisión mía (el prompt dice solo "encadena"): evita que se sigan haciendo tests de unidades que probablemente no domina. El nivel solo se considera saltado si se superan todas. Disponible para N0 y N1 desde la Home.
- **Bancos**: 11 unidades × 8 = 88 preguntas (`content/es/placement/`), `reviewed` tras 2 rondas del revisor (ver `CONTENIDO-QA.md`). El validador exige que cada banco cubra todos los conceptos de su unidad, que ninguna pregunta evalúe un concepto ajeno, ids `salto-<unidad>-qN`, y los incluye en `ids-lock`/`content:check`.
- Regla para el resto de bancos: evitar V/F con afirmaciones absolutas o matizables ("garantiza", "siempre") y multi_select de criterio subjetivo; que la opción correcta no sea la única con paréntesis/matiz.
- Home: sección "¿Ya sabes algo de esto?" con "Test de salto" por unidad y "Saltar el Nivel 0/1" (`PROVISIONAL(tarea 1.7)`, la Home se rehace con las 5 pestañas).
- Verificación: 391 tests; 30 e2e de producción (onboarding, test aprobado/suspendido, 7/8 como mínimo, nivel 0 completo, cadena que se detiene, persistencia tras recarga, axe en onboarding y test).
- **🛑 Pendiente:** tu revisión de las 88 preguntas antes de `published`.

## 2026-10-15 — Tarea 1.7: pantallas principales
- **Navegación de 5 pestañas** (`TabBar`, `routes.ts`): Inicio, Camino, Practicar, Rivales, Despacho, con enlaces reales por hash (teclado, Cmd/Ctrl+clic) y `aria-current`. Glosario, Ajustes y Reportes cuelgan de Despacho (con enlace "← Despacho"). Lecciones y tests de salto van a **pantalla completa** (sin barra). Iconos con `lucide-react` (sin emojis).
- **Inicio:** cinta del universo ficticio (precios deterministas por empresa y día, rotulados "Cifras ficticias"), anillo de objetivo diario, racha (con aviso si está en riesgo), XP y rango con lo que falta para el siguiente, y la siguiente lección ("Abrir mercado"/"Continuar") hasta que exista la sesión de 2.2. Mi ticker `$JAV` **no se muestra con precio**: su fórmula llega en 2.6 y no se inventa un dato.
- **Camino** (variante A elegida en 0.6): 11 plantas, la más alta arriba; cada una con sus unidades y su estado real (completada / en curso / disponible / próximamente), tests de salto y "Saltar el Nivel N". Sin candados falsos: lo que no tiene contenido dice "Próximamente". **El ascensor no se activa todavía** (la secuencia existe en `/styleguide`; se integra cuando haya subida de rango real, 2.6).
- **Practicar / Rivales:** "Próximamente" explícito y sin controles falsos; Practicar permite **repetir lecciones completadas**, que sí funciona.
- **Despacho:** estadísticas personales reales calculadas desde los eventos (`engine/stats.ts`, CLAUDE.md §11), ejercicios más fallados (cola para revisar contenido) y exportación a CSV. Faltan las del §11 que dependen de funciones futuras (minutos reales por sesión, precisión por concepto con dominio).
- **Glosario** (`content/es/glossary.json`, 11 términos de la Unidad 1, `reviewed` por el subagente; aplicadas sus correcciones: quitó los alias `real` y `nominal` por falsos positivos, añadió variables en las fórmulas y la nota de que la regla del 72 es aproximada). Los términos salen **subrayados en la teoría** de las lecciones (`linkGlossary`: primera aparición, palabra completa, el término más largo gana) y abren su definición en una hoja inferior. Buscador sin tildes.
- **Ajustes:** tema (los 5 desbloqueables aparecen con candado y "se desbloquea como <rango>", sin control, como pide CLAUDE.md §5), minutos al día, **háptica** (ajuste real que `haptic()` respeta), **recordatorio diario .ics** (evento recurrente con hora flotante y alarma, generado en local), exportar/importar copia (el archivo se valida **antes** de pedir confirmación y reemplaza solo tras confirmar), **borrar todos los datos** (con confirmación explícita), proteger almacenamiento y **diagnóstico** (registro de errores, ver abajo). **Sonido: rotulado "próximamente", sin interruptor** (no hay sonidos todavía; no se muestra un control que no hace nada).
- **Registro de errores** (`lib/error-log.ts`): captura `error`, promesas rechazadas y `console.error`, guarda los últimos 200 en `localStorage` (no depende de IndexedDB, que suele ser justo lo que falla), exportable y vaciable. Esto adelanta parte de 2.7 que el prompt de 1.7 ya pedía.
- **Reportar error:** botón en cada ejercicio de lecciones y tests de salto → hoja con texto → lista local en Despacho → Reportes (exportable a JSON con el enunciado, y con "Deshacer" al borrar).
- **Estados por pantalla:** carga, error con "Reintentar", vacío y **offline** (banner "Sin conexión… funciona igual", porque la app es local-first). Con IndexedDB bloqueado se muestra el error sin romper la barra de pestañas (e2e).
- **Test que garantiza "ningún botón sin acción"** (e2e): en cada una de las 8 pantallas, recarga y pulsa **cada** botón, enlace y desplegable visible, y exige un efecto observable (cambio de DOM, de formulario, de tema, de ruta o una descarga/selector de archivos). Encontró un control "muerto" legítimo —pulsar de nuevo la opción ya elegida—, que se excluye por `aria-pressed="true"` (comportamiento de grupo de opciones). También detectó un `<dl>` inválido en Inicio, corregido.
- **Sin `/impeccable shape|critique|audit|polish`** (Impeccable sigue sin instalar): sustituidos por axe en 8 pantallas × 2 temas (Noche y Mayfair), revisión visual de capturas a 375/768/1440 px (`docs/capturas/1.7/`), `web-design-guidelines` aplicado en 0.6 y el detector de diseño.
- Quitada la Home mínima de la 1.4 (`HomeMinimal`).

## 2026-10-15 — Tarea 1.8: PWA, offline y protección del progreso
- **Precaché = toda la app, incluidos todos los niveles.** El contenido va dentro del bundle (`import.meta.glob`), así que "app + nivel actual y siguiente" no tiene sentido separarlos: el SW precachea 27 archivos (≈1,3 MB: JS, CSS, HTML, fuentes woff2, iconos). Por eso **no hay botón "descargar todo para offline"** (sería un control sin función, CLAUDE.md §3b); en su lugar Ajustes muestra el estado real: "Lista para usar sin conexión" solo cuando `serviceWorker.ready` se cumple. Si algún día el contenido pasa a cargarse bajo demanda (Fase 2+), se reabre.
- **Aviso de versión** (`registerType: 'prompt'`, `src/pwa/usePwa.ts`): el SW nuevo queda en espera y la app muestra "Nueva versión disponible" con "Actualizar" / "Más tarde". **Nunca aparece ni recarga con una lección, un test de salto o una cadena de niveles abiertos** (`busy`); al volver a una pantalla normal el aviso sigue ahí.
- **Versión mínima forzada e interruptor de emergencia:** `public/sw-control.json` `{ "kill": false, "minVersion": "0.1.0" }`, pedido a la red con `cache: 'no-store'` y excluido del precaché y de `navigateFallback`. `kill: true` desregistra todos los SW y vacía las cachés (recarga una sola vez, con guarda en `sessionStorage` contra bucles; si un registro nace después, `onRegisteredSW` lo desregistra). `minVersion` mayor que `__APP_VERSION__` (de `package.json`, ahora `0.1.0`) marca la actualización como obligatoria: se aplica sola en cuanto no hay lección en curso y el aviso pierde "Más tarde". Lógica pura y probada en `engine/pwa.ts`. Datos raros o sin red → no se hace nada.
- **Protección del progreso:** `navigator.storage.persist()` se pide automáticamente en cuanto hay XP (antes solo con botón); el estado se ve en Ajustes. **Recordatorio semanal de copia:** banner en Inicio si hay progreso y la última copia (`lastBackupAt`, guardada al exportar desde Ajustes o desde el propio aviso) tiene ≥7 días o no existe; "Recordármelo más tarde" lo silencia 7 días (`backupReminderDismissedAt`).
- **Instalación:** `InstallGuide` en Ajustes: Chrome/Android con botón nativo (`beforeinstallprompt`) o pista de menú; iPhone/iPad con los 3 pasos de "Añadir a pantalla de inicio" y el aviso de que Safari puede borrar los datos tras 7 días sin visitar la web si no está instalada; "Instalada" si ya está en standalone. El manifest gana `id` y `description`; `theme-color` por tema ya existía (ThemeProvider).
- **i18n:** `i18next` 26.4.5 fijado, `src/i18n/{index.ts,es.json}` con `t()`. Todo lo nuevo de la 1.8 usa `t()`. **Migración del resto: parcial, declarada.** `tests/i18n.test.ts` recorre los `.tsx` con la API de TypeScript y falla si un archivo **nuevo** tiene texto fijo en JSX o en `aria-label/title/placeholder/alt/label`; los 39 archivos antiguos están en `tests/i18n-legacy.json` y el test falla también si uno se limpia sin quitarlo de la lista (trinquete: solo puede encogerse). Los textos de contenido (JSON) ya son datos. `PROVISIONAL(1.10)`: migrar los 39 archivos.
- **Pruebas:** `e2e/pwa.spec.ts` con servidor propio sobre `dist/` (permite cambiar `sw.js` y `sw-control.json` a mitad de test): manifest e iconos, **lección completa sin conexión tras la primera carga** (recarga offline incluida; XP guardado en local), aviso de versión (ausente en lección, presente al volver, sin recarga hasta pulsar), "Más tarde", interruptor de emergencia, panel de Ajustes y guía iPhone con captura (`docs/capturas/1.8`).
- **No verificado:** instalación real en Chrome Android y Safari iOS (no hay dispositivos aquí): solo el flujo con el User-Agent de iPhone en Chromium y la validez del manifest. Probar `beforeinstallprompt` y el comportamiento standalone en los dispositivos de Javier.

## 2026-10-15 — Tarea 1.9 (en curso): Nivel 0 completo
- **Unidades 1–5 del Nivel 0 en `reviewed`** (30 lecciones, 2 rondas de revisor cada una; ver `CONTENIDO-QA.md`). Nuevos explicadores `TinVsTae`, `LoanAmortization`, `MoneyCreation`; motor `finance.ts` ampliado (TAE, cuota francesa, cuadro de amortización, cadena de depósitos) con tests.
- Reglas aprendidas que el validador ahora vigila: tarjeta ≤ 60 palabras; el `term` de una tarjeta no puede repetir el título de la lección (dos encabezados iguales rompían el e2e); `numeric_input` con tolerancia que no acepte la respuesta conceptualmente errónea (p. ej. el TIN como TAE).
- Criterios de contenido fijados: pautas (50/30/20, 3–6 meses, tramos) siempre como «orientación»; cifras fiscales y regulatorias con `sources` y `verificarAntesDe`; supuestos ilustrativos declarados; sin cuantías de pensión; conceptos solo en su nivel.
- **Pendiente de producto:** el tipo `document_read` aún no existe en la app, así que el 📄 del Nivel 0 (ficha precontractual de un depósito) queda aplazado. **Pendiente humano 🛑:** revisión de Javier de las 5 unidades (más glosario) antes de `published`; contrastar fuentes con las webs oficiales (no accesibles desde este entorno).

## 2026-10-15 — Tarea 1.10: cierre de la Fase 1 (endurecimiento)
- **Bug real encontrado con las pruebas límite:** el fondo oscuro de los sheets (`--z-overlay: 80`) quedaba **por encima** del propio sheet (`--z-sheet: 40`) y interceptaba los toques: los botones de los sheets (Guardar reporte, Reemplazar mi progreso, Sí, borrar todo…) no se podían pulsar con ratón o dedo (sí con teclado, que es lo que probaban los e2e anteriores). Corregido (`--z-overlay: 30`); los nuevos e2e pulsan con ratón.
- **Bug real 2:** las opciones de `multiple_choice`/`multi_select` no se barajaban (la correcta era la primera en 47 de 54 ejercicios). Corregido en 1.9 con test.
- **Rendimiento (Lighthouse móvil, build de producción en este entorno):** de 66 a **83–89** en Rendimiento; Accesibilidad **100**, Buenas prácticas **100**, SEO **100**. Cambios: pantallas con `React.lazy` y contenido completo en un trozo aparte (índice ligero generado al compilar con un módulo virtual de Vite, ver `vite.config.ts`/`src/content/meta.ts`), universo de empresas y Sonner cargados tras el primer pintado, solo el subconjunto latino de las fuentes, `AnimatedNumber` sin el motor de animación, LazyMotion, `robots.txt` y `meta description`. **No se alcanza de forma estable el 90 de Rendimiento** (la medición varía ±3 entre ejecuciones): el arranque pesa ≈215 KB gz de JS (React-DOM, Motion, Dexie, Zod e i18next) y el FCP simulado (Slow 4G) ronda 2,6 s. Palancas pendientes (deuda): `zod/mini` o validar eventos sin Zod en el camino de arranque, i18n propio mínimo en lugar de i18next, partir Motion para que `m`/`LazyMotion` no arrastre el motor, y medir en el despliegue real (CDN con Brotli/HTTP2), donde el resultado será mejor que en este entorno.
- **Robustez sin conexión:** al cargar pantallas en trozos aparte, un trozo ausente de la caché (primera visita sin esperar al service worker) dejaba la pantalla en blanco. Ahora `RouteBoundary` muestra un error con «Reintentar» (test). El precaché incluye todos los trozos y el e2e espera a `serviceWorker.ready` antes de cortar la red.
- **Pruebas añadidas (`e2e/hardening.spec.ts`, `pwa.spec.ts`, `tests/route-boundary.test.tsx`):** iniciales de 1 y 40 caracteres, racha de 0 y de 999 días con 99.900 XP (copia sintética importada) sin desbordar a 375 px en Inicio, Despacho, Camino y Ajustes; almacenamiento lleno (toda escritura lanza `QuotaExceededError`: la lección sigue y avisa); texto largo en inglés en un reporte y en el buscador del glosario; y el flujo completo **onboarding → 3 lecciones sin conexión → recarga → progreso intacto**.
- **Detector:** `npx impeccable detect src/` limpio (0 hallazgos) y añadido a CI. **axe:** sin errores en todas las pantallas probadas (e2e existente + los nuevos).
- **Skills:** `review-animations`, `mobile-native`, `break-ui` e `/impeccable harden` **no se han invocado como skills**; se aplicaron sus criterios con las pruebas de arriba (movimiento solo con transform/opacity, reduced-motion, tamaños táctiles ≥ 48 px, safe areas, datos extremos). Pendiente pasarlas formalmente.
- **Deuda de la Fase 1 (lista para el informe):** (1) Rendimiento < 90 estable (arriba); (2) migrar a `t()` los 40+ archivos con texto fijo (`tests/i18n-legacy.json`); (3) `document_read` y la fiscalidad de derechos de suscripción pendientes de implementar el tipo de ejercicio; (4) fuentes con enlaces genéricos y fechas de consulta por sustituir por la página exacta, y hechos que caducan con `verificarAntesDe`; (5) 🛑 revisión humana de las 11 unidades (N0–N1), 88 preguntas de test de salto y el glosario (≈ 80 términos); (6) instalación real en Chrome Android y Safari iOS sin verificar; (7) Impeccable `install` y skills de terceros sin revisar/instalar; (8) tono de piel del avatar en temas claros, sonido y precio `$JAV` (2.6), ascensor sin integrar; (9) `valid-source-maps` de Lighthouse (sin mapas en producción: decisión deliberada).

## 2026-10-15 — Tarea 2.1: repaso espaciado y Practicar
- **SRS = proyección de eventos** (`src/engine/srs.ts`, pura): una tarjeta FSRS (ts-fsrs 5.4.2) por ejercicio a partir de `exercise_answered`. Parámetros: sin fuzz (determinista), sin pasos de aprendizaje de minutos (`enable_short_term: false`, `learning_steps: []`): se agenda por **días**. Acierto → Good, fallo → Again. Fallar hoy → vuelve mañana; el primer acierto → +3 días; el segundo → +14 días (comprobado en test).
- **Reintentos de la misma sesión:** dos respuestas de una lección al mismo ejercicio con menos de 20 min cuentan como un solo repaso (el fallo y su reintento al final de la lección). Un repaso/práctica/examen **siempre cuenta**: `exercise_answered` gana `source: 'lesson' | 'review'` (por defecto `lesson`, compatible con copias antiguas).
- **Dominio por concepto:** precisión en los últimos 8 intentos (necesita ≥ 3; si no, «pocos datos»). «Concepto en dificultad» = ≥ 2 fallos en los últimos 3 intentos. Sus **prerrequisitos** (hasta 2 niveles, de `concepts.json`) flojos (< 70 %) o sin practicar se refuerzan: hasta la mitad de la sesión, con ejercicios ya respondidos primero.
- **Sesión de repaso:** refuerzo + vencidas (día de vencimiento ≤ hoy en la zona del dispositivo), **máx. 15**, **intercaladas** por lección (nunca dos seguidas de la misma si hay alternativa). Los ejercicios de lecciones retiradas se **archivan** (no vencen, siguen en el historial).
- **Practicar:** Due diligence (cuántas tocan hoy y próximo repaso), Mis errores (último intento fallado), Por tema (dominio por concepto, los 8 más flojos), Examen cronometrado (10 preguntas aleatorias —semilla de unidad y día— en 10 minutos, **sin ver la solución hasta el final**, lista de fallos al terminar) y repetir lecciones. Los repasos dan 5 XP por acierto, sin bonus de cierre.
- Los minijuegos siguen como «Próximamente» (2.5). **Provisional:** el examen no tiene aún aprobado/suspenso ni se guarda como intento propio (solo cuenta como respuestas); XP de repaso (5) y ventana de 20 min pendientes de calibrar con uso real.
- Verificación: 12 tests del motor con reloj simulado (un fallo reaparece al día siguiente, intervalos crecientes, reintentos, reconstrucción en cualquier orden e idempotencia, archivado, dominio, refuerzo de prerrequisitos, intercalado, Mis errores, Por tema) y 4 e2e (`e2e/practicar.spec.ts`).

## 2.2 — Sesión "Abrir mercado" (15/10/2026)

- **Orquestador puro** (`src/engine/session.ts`): orden fijo briefing → due diligence → lección 1 → repaso → lección 2 → reto/Encargo del jefe → cierre, ajustado a 5/10/15/20 min con costes por bloque (`COST`). Lo que sobra se reparte en repaso y reto sin huecos (máx. 15 por bloque). Los bloques se guardan en `session_started`, así reanudar usa el plan original.
- **El minijuego se sustituye por repaso** hasta la 2.5 (`review`, ya previsto en `blockSpec`).
- **Reanudar**: `session_block_completed` por bloque; Inicio muestra "Reanudar sesión" si hay sesión del día sin `session_completed`. Bloques vacíos (sin tarjetas ni lección ya completada) se saltan solos.
- **"Objetivo cumplido" sin presionar**: el cierre solo informa (XP de la sesión, racha, misiones, conceptos que cuestan); nada empuja a seguir.
- **Misiones diarias**: 3 por día, deterministas por fecha (`missions.ts`), calculadas desde eventos.
- **Provisional**: duración elegida guardada en el ajuste `sessionMinutes`; el botón de Inicio "Abrir mercado/Continuar" sigue empezando la siguiente lección (lo usan los e2e).
- Textos nuevos vía `t()` (`session.*` en `es.json`).

## 2.3 — Ejercicios de aplicar y argumentar (17/10/2026)

- Ocho tipos con corrección pura (`grading.ts`), componentes accesibles (`AppliedViews.tsx`) y e2e solo con teclado + axe: `chart_read`, `scenario`, `spot_the_error`, `slider_estimate`, `case_step`, `document_read`, `best_argument`, `self_explain`. `code` queda para la rama Fintech.
- **Gráficos con semilla** (`engine/charts.ts`): misma semilla → misma serie. `chart_read` lleva `truth` (métrica + valor) y el validador lo recalcula: si el generador cambiara, el contenido falla en vez de quedar mal. Descripción textual = `altText` + resumen generado + tabla de datos.
- **case_step**: estado puro (`engine/case-step.ts`); se guarda en `localStorage` para reanudar y se descarta si no es válido para esa versión del caso.
- **self_explain**: hay que escribir, ver el modelo y marcar la rúbrica; con 2 de 3 criterios cuenta como bueno y da **la mitad de XP** (`SELF_EXPLAIN_XP_FACTOR`).
- **best_argument**: al acertar se muestra por qué fallan los demás.
- Contenido: 5 ejercicios nuevos (`-e9`) añadidos como ejercicios nuevos, sin cambiar ids existentes, en n0-u1-l2/l3, n0-u3-l2/l4 y n1-u3-l3; cada lección sube a v2, revisada por el subagente (3 observaciones menores aplicadas). El XP de la Unidad 1 en e2e pasa de 515 a 535 por los dos ejercicios nuevos.
- **Provisional**: sin ejercicios `document_read` en el contenido: requieren un fragmento real de un documento oficial con fuente y fecha, y no puedo verificarlo sin conexión a esas fuentes. Queda para cuando se pueda contrastar.

## OpenSpec y BMAD-METHOD (17/10/2026)

- Revisados los README de `Fission-AI/OpenSpec` (MIT) y `bmad-code-org/BMAD-METHOD` (MIT). **No se han instalado** (`openspec init`, `npx bmad-method install`): no documentan qué archivos o scripts añaden, `CLAUDE.md` §4 exige revisar las skills de terceros antes de instalar, y traerían un segundo flujo (comandos propios, carpetas propias) que choca con `FASES.md`/`EXECUTION.md`.
- **Adoptado de OpenSpec:** specs vivas por capacidad con escenarios comprobables (`docs/specs/`) y carpeta por cambio con propuesta, diseño y tareas, archivada al terminar (`docs/cambios/`).
- **Adoptado de BMAD:** roles en orden (producto, arquitectura, UX, desarrollo, QA) y una revisión adversarial antes de dar algo por terminado.
- Todo reunido en la skill propia `.claude/skills/nuevo-cambio`. Specs retroactivas escritas para 2.2 y 2.3. Si más adelante se quisiera la herramienta real, se revisarían primero los archivos que genera.

## Sincronización con el plan completo del 17/10/2026 (PDF «Compuesto · Plan completo»)

- El PDF es la versión vigente del plan; el repo tenía la anterior (4 ramas, «analista junior»). Objetivo recordado y aplicado: **volverse experto en el mercado**, con salida a banca de inversión y buy-side, a **nivel técnico de entrevista y de primer año** (no solo conceptos).
- Actualizados: `CLAUDE.md` §1 (itinerario Pro, promesa, GSAP para explicadores) y §4 (remite a `SKILLS.md`); `docs/TEMARIO.md` (§0, §1, §3 Itinerario Pro con 6 ramas y entregables, §3b cobertura CFA y bibliografía, campos `cfa` e `interview`); `FASES.md` (Fase 6 con el orden Investment Banking → Equity Research y Buy-side → Private Equity y VC → Banca y riesgos → Mercados → Fintech, modelo de referencia, formatos Pro); `docs/JUEGOS.md` (+ Superday y Subasta de venta); nuevo `SKILLS.md`.
- Esquema de contenido: añadidos `cfa` (lección) e `interview` (ejercicio), ambos opcionales: no altera el contenido existente.
- **Pendiente:** informe de cobertura CFA en `content:check`; crear la skill `modelo-referencia`; revisar e instalar `financial-services` antes de la rama de Investment Banking (se abre con N3); GSAP se incorpora con el primer explicador que lo necesite, comprobando su licencia. El PDF también trae el anexo de auditorías (pp. 53–67), que ya estaba superado por las decisiones de uso personal; no se ha aplicado.
- El PDF menciona textos en `es` y `en` en la definición de terminado de `EXECUTION.md`; `CLAUDE.md` §1 mantiene el inglés fuera de alcance. Manda `CLAUDE.md`: solo español.

## 2.4 — Kit de game feel y motor de mercados (17/10/2026)

- **Canvas 2D, no PixiJS.** Benchmark en `scripts/bench/` (N elementos que se mueven y rotan, CPU 4×, Chromium sin cabeza con render por software): con 100–200 elementos Canvas 2D da 57–59 fps; con 500 baja a ~35 (Pixi ~46). Presupuesto: **≤ 200 elementos móviles por tablero**; los cinco primeros juegos quedan muy por debajo (libro de órdenes ~20 barras, partículas ≤ 120, velas con lightweight-charts). `pixi.js` **no** se añade como dependencia; se reconsidera si un juego futuro necesita más. Aviso: es render por software, no un móvil real; la comprobación en el móvil de Javier (🛑 de 2.5) manda.
- **Sonido sintetizado con Web Audio** en vez de archivos en `/public/sounds`: coste 0, sin descargas y funciona offline. Un solo sonido a la vez; ajuste «Sonido en los juegos» en Ajustes (`sound`, activado por defecto, como la háptica).
- **Motor de mercados** (`engine/market.ts`): movimiento geométrico con corrección de Itô, saltos y regímenes de Markov (calma, tendencia alcista, pánico); determinista por semilla.
- **Hit-stop basado en tiempo** (`engine/hit-stop.ts`), sin temporizadores que se puedan perder: siempre se reanuda.
- **Laboratorio** `/games-lab` (solo desarrollo) y compilación de medición con `VITE_LAB=1` (`npm run e2e:lab`, `dist-lab` ignorado por git/lint/prettier): la medida de fps se hace con el código minificado de producción, porque en desarrollo React dominaba el coste. Lección aprendida: un solo estado en la raíz del laboratorio re-renderizaba todo y daba 10–20 fps; cada sección tiene ahora su estado.
- **Ticker de fondo y axe:** la cinta (aria-hidden, 30 % de opacidad por diseño) se excluye de la comprobación de contraste de axe: es texto decorativo exento por WCAG 1.4.3.
- **Provisional:** «controles para forzar reduced-motion» del plan: se prueba con `emulateMedia` en Playwright, no con un conmutador dentro del laboratorio (el CSS depende de la media query del sistema). El criterio de 60 fps se cumple como media ≥ 55 en render por software (medido: 56,4 fps, p95 16,8 ms, un fotograma de 67 ms al crear el `AudioContext`).

## 2.5 — Juegos 1, 2 (versión presupuesto), 3, 4 y 10 (17/10/2026)

- **Puntuación corregida por azar** (`engine/games/common.ts`): cada decisión suma lo obtenido, lo que daría el azar y el máximo; la nota sale de `(obtenido − azar) / (máximo − azar)`. Así «jugar al azar saca ≤ B» es una propiedad del diseño, no de un umbral. Medido en tests (1.000 partidas al azar por juego): ≥ 95–97 % B, ≤ 1 % por encima de BB, nunca AAA ni AA. Para bajar la varianza hay 24 tarjetas (Campana), 12 clientes (Mesa), 8 titulares (¿Sube?), 4 rondas (Compuesto) y 3 presupuestos.
- **Datos de los juegos en `content/shared/games.json`** (partidas de presupuesto, peticiones de clientes, titulares), con esquema Zod y comprobación en `content:validate` (conceptos existentes, motivos distintos, 3 partidas por categoría). Revisados por el subagente revisor (ver `CONTENIDO-QA.md`).
- **Semillas deterministas entre motores:** una primera versión barajaba con `sort(() => rnd() - 0.5)` y daba orden distinto en Node y en Chromium; ahora Fisher–Yates con el PRNG y valores de referencia fijados en tests.
- **Campana de apertura** usa las afirmaciones V/F de lecciones ya completadas (o de unidades saltadas): no hay contenido nuevo que revisar.
- **Mesa de órdenes:** la subasta solo aparece si «subastas» se ha visto; el libro usa `orderbook.ts` (ya testeado).
- **¿Sube o baja?:** la vela sale de `marketPath` con deriva a favor del titular (12 pasos, σ pequeña): su dirección coincide siempre con el titular (test con 1.200 casos).
- **Mano animada y jugada guiada** (tutorial de la primera partida de cada juego): texto + mano que señala la jugada correcta; no es un tutorial interactivo con pasos.
- **Arrastrar:** la Campana admite deslizar la tarjeta; Cuadra tu presupuesto usa pulsar/teclas 1–3 en vez de arrastrar (alternativa accesible que CLAUDE.md §10 exige de todas formas). **Provisional:** el arrastre de partidas a la balanza no está.
- **XP:** 5–40 por partida según la nota, solo las 3 primeras del día (`GAME_XP`, `GAME_XP_PLAYS_PER_DAY`). Evento nuevo `game_played`.
- **Sesión:** el bloque «Minijuego» ya existe (`kind: 'game'`), rota entre los disponibles y no repite el último; si no hay ninguno, sigue siendo repaso.
- **Provisional / no hecho:** la tarjeta de repaso «ligada al concepto» tras un fallo es el botón «Practicar» del resultado (práctica por tema), no una tarjeta SRS nueva; el criterio «empezar a jugar en ≤ 5 s sin leer» lo comprobará Javier (🛑) y `review-animations`/`/impeccable critique` no se han pasado.

## 2.6 — Tu acción, el trader impulsivo y la tarjeta compartible (17/10/2026)

- **Tu acción** (`engine/stock.ts`): fórmula de CLAUDE.md §7.2 con `f = 0,5 + precisión del día` (lineal entre 0,5 y 1,5; neutra, 1,0, si ese día no hubo ejercicios corregidos). La precisión sale de los `exercise_answered` del día. Hoy no cuenta como corrección hasta que acaba el día (si no, la acción bajaría cada mañana antes de estudiar). Las mechas de las velas son deterministas por día. «Ajustable tras el primer mes de uso»: los parámetros son constantes exportadas.
- **Velas en Inicio (30 días) y Despacho (90)** con el mismo `CandleChart`; sus colores caen a un neutro si faltan los tokens (antes lanzaba en tests); en jsdom `lightweight-charts` se sustituye por un doble inerte (`tests/setup.ts`) y el dibujo real lo cubren los e2e.
- **El trader impulsivo** (sexto juego, `impulsivo`): se empieza invertido como el gemelo paciente; operar cambia entre invertido y efectivo pagando un 1 % (comisión + horquilla). La nota solo mide el coste (no operar = AAA); así «al azar = B» es estructural. Necesita «comisiones» y «FOMO» vistos (no esperó al Nivel 5 del temario: el concepto ya existe en N1).
- **html-to-image 1.11.13** (fijada) para la tarjeta; se renderiza una copia a tamaño real fuera de pantalla y la vista previa es otra copia escalada con `transform`. Con `document.fonts.ready` antes de dibujar. Medidas exactas comprobadas leyendo la cabecera del PNG; offline probado con `setOffline`.
- **Tres estilos:** Terminal (Wall Street Noche), Papel (Mayfair) y Carreras (verde y oro); paletas propias de la tarjeta con contraste AA comprobado (la del dorado de Papel se oscureció para llegar a 4,5).
- **Web Share API** con archivo si `navigator.canShare` lo admite; en escritorio, descarga. Sin el botón «Compartir» si no hay Web Share.
- **Delight sin fricción:** `RankUp` y `Elevator` se muestran dentro del cierre de la lección cuando cambian el rango o la planta (antes solo existían en el styleguide), sin añadir pasos ni botones; el cierre de la sesión imprime el ticket y enlaza a Compartir.
- **Provisional / no verificado:** Safari y Firefox no están disponibles en este entorno (solo Chromium): la tarjeta no se ha probado en ellos; `/impeccable delight` y `find-animation-opportunities` no se han pasado como skills (se aplicaron sus ideas a mano); el ascensor no tiene e2e (solo se ve en el styleguide y se dispara al subir de planta).

## 2.7 — Rivales simulados y estadísticas personales
- **Liga derivada de eventos, sin evento propio.** Las divisiones se recalculan jugando las semanas cerradas desde la primera con XP; así sobrevive a la sincronización (unión de eventos) y a importar copias. Coste: si cambian las constantes, el historial de divisiones cambia; las constantes están fijadas por tests y un snapshot.
- **Tu yo de la semana pasada** va fuera de la clasificación para no alterar ascensos y descensos.
- **No hay recompensa de XP por ascender** (evitar bucles de XP); el cierre solo se muestra y se puede repetir la animación.
- **Cierre animado:** la clasificación del jueves se reordena (FLIP de Motion, stagger 40 ms) hasta la final; con reduced-motion se muestra directamente el resultado.
- Registro de errores y panel de diagnóstico: ya hechos antes (Ajustes → Diagnóstico); no se duplican.
- No verificado: la animación FLIP no tiene comprobación visual automática (solo el resultado final en e2e).

## 2.8 — Despliegue (preparado; lo ejecuta Javier)
- **Cloudflare Pages** con `public/_headers` (CSP estricta sin `unsafe-eval`; `wasm-unsafe-eval` por Pyodide futuro; `style-src 'unsafe-inline'` por los estilos en línea de Motion y la tarjeta). Si en Fase 3 se añade Supabase, hay que ampliar `connect-src`.
- **No indexada:** `robots.txt` `Disallow: /`, meta `robots` y `X-Robots-Tag`. Consecuencia buscada: Lighthouse SEO baja a 63 (`is-crawlable`); no es un defecto.
- **Rendimiento Lighthouse móvil 79–83 (< 90):** criterio de aceptación **no cumplido**; es la deuda de la Fase 1 (arranque ≈215 KB gz). Medir en el despliegue real antes de decidir si merece la pena la palanca (zod/mini, i18n propio…).
- **Pasos de cuenta Cloudflare:** en `docs/DESPLIEGUE.md`; la checklist (copia, instalación en móvil, .ics) la marca Javier en su dispositivo.
- Pendiente de la revisión de cierre de fase (skills `review-animations`, `animation-performance`, `break-ui`, `/impeccable harden`): ver informe.

## 2.8 — break-ui de las pantallas nuevas de la Fase 2
Peor caso realista importado como copia (frontera de datos real, no el componente): 400 días con 380 XP/día, iniciales anchas de 6 letras (`WMWMWM`), conceptos de nombre largo fallados, sesiones de 60 min. Regresión fija en `e2e/peor-caso.spec.ts` a 320 px; capturas en `docs/capturas/2.8/`.
- **Arreglado (Broken):** Compartir desbordaba 24 px a 320 px (el contenedor de la vista previa medía su propio contenido: `min-width: auto` en un hijo de grid) → `min-w-0`.
- **Arreglado (Broken, nada falso en pantalla):** la descripción textual de tu acción decía «46.345,04 € … Datos de ejemplo»: euros y «ejemplo» eran falsos. `CandleChart` acepta formato y nota; tu acción se describe en «puntos» con «Puntos de estudio, no dinero».
- **Arreglado (Ugly):** el precio de la acción se partía por la mitad (`259.449,` / `98`) → la fila pasa a dos líneas y el precio nunca se corta.
- **Arreglado (Ugly):** «fallo(s)… intento(s)» → plurales reales. Personalidad de los rivales truncada sin forma de leerla → se ajusta a dos líneas.
- **Aguantó:** clasificación con XP de 4 cifras, «Tú» destacado, ▲▼ con texto, tarjeta 1080×1920 con Leyenda, racha 400 y XP de 6 cifras (revisada a ojo), estadísticas con nombres de concepto de 47 caracteres.
- **Decisión para Javier:** con un ritmo alto pero **constante** la liga te estabiliza en Oro/Platino (los rivales siguen tu media): la liga premia mejorar respecto a ti, no el volumen absoluto. Si prefieres que un ritmo alto sostenido lleve a Wall Street, el cambio es fijar la media con un techo (p. ej. 700 XP/semana).
- No hecho: el interruptor visual «Demo / Peor caso» que propone la skill; se sustituye por la copia de peor caso en e2e (misma frontera de datos, y queda como test de regresión).

## Skills de nicho (finanzas, mercados y ciencia del aprendizaje) — 17/10/2026
Fuentes clonadas en `~/.compuesto-skills-src/` (fuera del repo). Revisión previa: SKILL.md y scripts de cada skill (búsqueda de red, claves, `subprocess`, escrituras fuera de su carpeta e instrucciones de inyección). Ninguna API ni clave configurada; ningún conector de pago autenticado. Los plugins están en **ámbito de usuario** (`~/.claude`): en una sesión en la nube nueva pueden no estar (ver incidencias del informe).

| # | Repo y commit | Instalado | No instalado y por qué |
|---|---|---|---|
| 1 | [anthropics/financial-services](https://github.com/anthropics/financial-services) `574ed3624aebd0418c7e96cd101262f30210ab26` | Plugins `financial-analysis` 0.1.1, `investment-banking` 0.2.1, `equity-research` 0.1.2, `private-equity` 0.1.2 (marketplace `claude-for-financial-services`) | `fund-admin`, `operations` y plugins de agente: fuera del encargo. Su `.mcp.json` declara conectores de pago (Daloopa, Morningstar, S&P, FactSet, Moody's, LSEG, PitchBook…): **no se autentican ni configuran** |
| 2 | [anthropics/claude-cookbooks](https://github.com/anthropics/claude-cookbooks) `a162e0184e71b60290808a43961a6cbc8060123c` | `.claude/skills/creating-financial-models` (scripts solo numpy/pandas) | Resto del cookbook |
| 3 | [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) `33eeda1e8fd856455b05479d13a0f85b5f803744` | Plugin `finance@knowledge-work-plugins` 1.3.0 (cierre contable, conciliaciones, asientos, SOX, varianzas) | Sus conectores (Snowflake, Databricks, BigQuery, Slack, Gmail, Calendar) quedan sin configurar |
| 4 | [xbtlin/ai-berkshire](https://github.com/xbtlin/ai-berkshire) `d5ff30d1d5285bcbc12053a3c5ee73016b91e62c` | Comandos en `.claude/commands/`: `investment-research`, `investment-checklist`, `quality-screen`, `industry-research`, `earnings-review`, `thesis-tracker` (en `skills/` son `.md` con `$ARGUMENTS`, es decir, comandos) | Script de instalación (no ejecutado) y `tools/`: los comandos llaman a `tools/financial_rigor.py`, `terminal_value.py` y `report_audit.py` (cálculo puro, sin red) que **no se copiaron**; esos pasos fallarán hasta copiarlos. Contenido en chino, sin traducir |
| 5 | [alirezarezvani/claude-skills](https://github.com/alirezarezvani/claude-skills) `19392f7a08264ed00486a251f5b2098321771f94` | `financial-analyst`, `stock-analysis` (están en `finance/skills/`, no en `finance/`) | Resto |
| 6 | [himself65/finance-skills](https://github.com/himself65/finance-skills) `cedadc4b9f0f25c072576331a151863c8632a2d6` | `company-valuation`, `earnings-preview`, `earnings-recap`, `estimate-analysis`, `options-payoff`, `stock-correlation`, `startup-analysis` con `npx skills add` (idénticas al clon revisado; actualiza `skills-lock.json`) | Resto. Aviso: sus SKILL.md llevan líneas `` !`python3 …` `` que se ejecutan al cargar la skill y consultan Yahoo Finance (yfinance, gratis, sin clave) |
| 7 | [JoelLewis/finance_skills](https://github.com/JoelLewis/finance_skills) `5c498eacf7057e31238c4c5a8012a1afe9ec7c8a` | core: `time-value-of-money`, `return-calculations`, `statistics-fundamentals`; wealth-management: `fixed-income-corporate`, `fixed-income-sovereign`, `fixed-income-structured`, `asset-allocation`, `rebalancing`, `performance-attribution`, `historical-risk`, `forward-risk` | `fixed-income-municipal` (bonos municipales de EE. UU.), `volatility-modeling` (choca de nombre con la del n.º 8), resto de wealth-management fuera de los temas pedidos; compliance, advisory-practice, operations y demás excluidos |
| 8 | [agiprolabs/claude-trading-skills](https://github.com/agiprolabs/claude-trading-skills) `981e1d736cdc02bdc1c55c74ec9224e956414706` | `options-pricing`, `fixed-income`, `volatility-modeling`, `portfolio-analytics`, `risk-management`, `correlation-analysis` | Nada más. Avisos: `options-pricing` y `fixed-income` están marcadas `[STUB]` por su autor; varias están orientadas a cripto; sus scripts tienen un modo `--live` que pide `BIRDEYE_API_KEY` (no configurada; por defecto usan datos sintéticos) |
| 9 | [tradermonty/claude-trading-skills](https://github.com/tradermonty/claude-trading-skills) `b29c6dfc2d4dc82bdfcfc13891e490863283405f` | `position-sizer`, `backtest-expert`, `options-strategy-advisor`, `scenario-analyzer` | Resto. `options-strategy-advisor` admite `FMP_API_KEY` opcional (no configurada) |
| 10 | [K-Dense-AI/claude-scientific-skills](https://github.com/K-Dense-AI/claude-scientific-skills) `a1043ef544e3a100c28e70a736b6cf32554d0677` | `statistical-analysis`, `statsmodels` (OLS, GLM, ARIMA/SARIMAX), `aeon` (series temporales) | `timesfm-forecasting`: descarga un modelo de Hugging Face y es una previsión de caja negra poco didáctica; `pymc` y `statistical-power`, menos centrales. 3 de un máximo de 4 |
| 11 | [GarethManning/education-agent-skills](https://github.com/GarethManning/education-agent-skills) `6bbbce418f82e11044009c9f3b7373a354de5bd0` | 40 skills: dominio 1 `memory-learning-science` (8), 3 `explicit-instruction` (5), 7 `curriculum-assessment` (13), 12 `ai-learning-science` (14) | Resto de dominios; servidor MCP remoto **no** conectado |
| 12 | [kirilxd/claude-tutor](https://github.com/kirilxd/claude-tutor) `ce194694eca994a50a2dbbd9233c71ec0eee8e85` | Plugin `claude-tutor@kirilxd-plugins` 1.0.0 | Aviso de seguridad: su skill `dashboard` arranca un servidor Express local que lanza `claude -p … --permission-mode bypassPermissions` y abre Terminal con `osascript`. **No ejecutarla.** Sus hooks (`enforce-paths.js`, `session-start.js`) son benignos: solo leen o validan `~/.claude/learning/` |
| 13 | [GAJETOso/financeskills](https://github.com/GAJETOso/financeskills) `b0c6239e339c1865c54bd2bb4cd4c1974120f1b8` | Solo clonado para consulta | — |
| 14 | [andreworia/claude-finance-skills](https://github.com/andreworia/claude-finance-skills) `e19bba60ec18203161854532f283a19023c20d3d` | Solo clonado para consulta | — |

- Se hizo commit también de `.claude/commands/` (rule 4 manda poner ahí los comandos) y de `skills-lock.json` (lo escribe el `npx skills add` indicado); fuera de eso, solo `.claude/skills/`, `DECISIONES.md` y `SKILLS.md`.
- `~/.compuesto-skills-src/` queda fuera del repo, así que no necesita `.gitignore`; no se crearon archivos temporales dentro del proyecto.

## 2026-10-17 — Modelos de referencia de Naranjas del Turia y skills de nicho aplicadas
- **Disponibilidad en esta sesión (nube):** los plugins de usuario (`financial-analysis`, `investment-banking`, `equity-research`, `private-equity`, knowledge-work `finance`, `claude-tutor`) y `~/.compuesto-skills-src/` no estaban. Se reclonaron en `~/.compuesto-skills-src/` en los mismos commits fijados (tabla anterior) y sus `SKILL.md` se leyeron como archivo; no se reinstalaron plugins ni se ejecutó ningún script de terceros. Las skills de `.claude/skills/` y los comandos de `.claude/commands/` sí estaban.
- **Skill propia `modelo-referencia`** creada (`.claude/skills/modelo-referencia/`). Los modelos se generan con código propio y puro (`src/engine/models.ts`), no con openpyxl ni Excel como piden las skills de financial-services: de ellas se adoptan las comprobaciones (balance, caja, fuentes = usos, sensibilidades impares con el caso base en el centro, intereses sobre saldo inicial) y las convenciones. Motivo: el resultado tiene que ser JSON comprobable por tests y reutilizable por los ejercicios, a coste 0 €.
- **Salida:** `content/shared/models/naranjas-del-turia-{3-estados,dcf,lbo,merger}.json` (`npm run models:build`), en `draft`. Tests: `src/content/models.test.ts` (cuadre sobre el JSON, con TIR por Newton independiente de la bisección del motor, y sin deriva respecto al generador) y `src/engine/models.test.ts` (ramas del motor).
- **Hipótesis didácticas** (no son datos verificados): cotización no afectada de 7,50 € a 31/12/2025, bono a 10 años 3,25 %, prima de riesgo 5,5 %, beta desapalancada 0,65, prima por tamaño 2 %. Llevan `verificarAntesDe: 2027-04-17`. Los ejemplos de N1 con «cotiza a 10 €» son supuestos ilustrativos anteriores y no se tocan.
- **Partes ficticias nuevas:** Marjal Capital Partners (fondo del LBO) y Grupo Azahar Calderona S.A. (compradora del merger), con `pendienteVerificarCNMV: true`. No se añaden a `companies.json` hasta que se usen en más de un modelo.
- **Simplificaciones anotadas en cada JSON:** caja no remunerada, intereses sobre saldo inicial (sin circularidad), límite del art. 16 LIS aproximado con el EBITDA, art. 16.5 LIS (deuda de adquisición) sin modelar, fondo de comercio con criterio NIIF.
- `crear-unidad` y `revisar-unidad` pasan a elegir skills de dominio por tipo de unidad (tabla en cada skill).

## 2026-10-17 — Skills en el repo y eliminación de las de himself65
- **Copiadas a `.claude/skills/`** las 48 skills de financial-services (`574ed36`: financial-analysis, investment-banking, equity-research, private-equity) y de knowledge-work `finance` (`33eeda1`), solo archivos `.md`. Motivo: en una sesión en la nube los plugins de usuario no existen. Excluidos su `skill-creator` (choca de nombre con el de anthropics/skills, que se mantiene) y 3 archivos no markdown (dos scripts Python y un `requirements.txt`). Licencias Apache-2.0 en `.claude/licencias/`. No se ejecutó nada. Lista completa en `SKILLS.md`.
- **Eliminadas** las 7 skills de himself65/finance-skills (`company-valuation`, `earnings-preview`, `earnings-recap`, `estimate-analysis`, `options-payoff`, `stock-correlation`, `startup-analysis`) y sus entradas de `skills-lock.json`. Motivo: sus `SKILL.md` ejecutan `python3` con `yfinance` al cargarse (red y empresas reales sin pedirlo). El nombre `earnings-preview` lo ocupa ahora la de financial-services. `crear-unidad` y `revisar-unidad` actualizadas con los sustitutos.
- **Temario:** aplicadas las 10 mejoras aprobadas por Javier y el cambio de CLAUDE.md §8 (Pro: reconocer ≤ 20 % y ficha de referencia). Ajuste derivado no pedido literalmente: la tabla de §0 pasa a «Semanas 17–37» y «38–52» para cuadrar con el nuevo calendario.
- **FASES.md:** tareas 2.9–2.12 (paramétricos, modelRef, Hard en FSRS, test de salto en dos fases) como ampliación de la Fase 2, porque dependen de 2.1 (repaso), y 6.0 con los 5 modelos de referencia pendientes. En 2.12 el banco de cada test de salto pasa de 8 a 12 preguntas: sin eso no hay preguntas nuevas para la segunda fase.

## 2026-10-17 — Aprobaciones de Javier, concepts.json al temario nuevo y dos entidades nuevas del universo
- **Aprobado por Javier:** banco de 12 preguntas por test de salto (TEMARIO §5 actualizado; el código llega en la tarea 2.12) y los ajustes de semanas de TEMARIO §0.
- **concepts.json** (253 → 286 conceptos):
  - `capm-beta` pasa de N6 a N3 (prerrequisito: riesgo y rentabilidad). Nuevos en N3: `coste-deuda` y `beta-apalancada`. `wacc` exige los tres; `dcf` exige `wacc`.
  - Nuevo `capm-avanzado` en N6 (regresión y beta ajustada), con `regresion`.
  - Fuera `alternativos-intro`: ningún ejercicio lo usaba. `alternativos-inversion` (N6) pasa a depender de riesgo y rentabilidad y de diversificación.
  - Conceptos nuevos de las 10 mejoras:
    - N2: precio limpio/sucio, bootstrapping.
    - N3: NIIF 15, NIC 12, minoritarios, flujos por el método indirecto, DuPont/ROIC, calidad del beneficio.
    - N5: eficiencia de mercado, contraste de hipótesis.
    - N6: tracking error, Brinson, Black-Litterman.
    - N7: paridad put-call, forward por coste de financiación, binomial de dos pasos.
    - Rama Banca y riesgos: IFRS 9 (clasificación y escenarios), CRR3, colchones/SREP/MREL, RAROC, dudosos.
    - Rama Corporate y valoración: due diligence, locked box, precio equitativo, art. 16 LIS, reestructuración.
    - Rama Fintech: contraste múltiple, EWMA/GARCH.
  - **Ética:** `etica-estandares` entra en **N2** y no en N0. El test del repositorio exige que todo concepto de N0–N1 tenga descripción y unidad, y las lecciones de N0–N1 ya revisadas no tienen caso de ética. Cuando se añadan a N0–N1, el concepto baja de nivel con su unidad.
  - `curriculum.json` sigue con 4 ramas (banca-riesgos, mercados-trading, corporate-valoracion, fintech-cuantitativo) frente a las 6 de TEMARIO §3. Los conceptos de IB van a `corporate-valoracion`. Los de Equity Research y Private Equity quedan para cuando el curriculum tenga esas ramas (tarea 6.1).
- **companies.json:** se añaden `azahar-calderona` (Grupo Azahar Calderona S.A., cotizada; caja 80.000, deuda 150.000 y 60 millones de acciones a 2025, lo mismo que usa el merger model) y `marjal-capital-partners` (Marjal Capital Partners S.G.E.I.C., S.A., gestora no cotizada; las cuentas son las de la gestora, no las de sus fondos). Las cuentas se generaron con un script que impone las identidades, y pasan `checkCompany`.
  - Campo nuevo `listed` (por defecto `true`). La cinta solo muestra las cotizadas, así que Marjal no sale.
  - El test de «5 empresas» pasa a 7.
  - Un test nuevo comprueba que la caja, la deuda y las acciones de Azahar coinciden con el merger model.
- **Comprobación de nombres en la CNMV y el Registro Mercantil: la hace Javier.** Hasta entonces, los modelos mantienen `pendienteVerificarCNMV: true`.
- **docs/revision-modelos.md:** ficha de revisión de los 4 modelos para Javier, en borrador hasta que diga «aprobado». No cambia ningún modelo.

## 2026-10-17 — Tarea 2.9: ejercicios paramétricos
- **Enfoque:** `instantiate(ejercicio, semilla?)` (`src/engine/params.ts`, puro) devuelve un ejercicio concreto del mismo tipo. Vistas y `grade()` no cambian. Lo usa el `ExerciseRunner` (prop `variantSeed`), así que ningún camino de render muestra marcadores. Descartado: generar variantes en build (multiplica contenido y revisión) y que cada corrector lea parámetros.
- **Formato de contenido:**
  - `params` (por dato: `value` del enunciado, `min`, `max`, `step`, `decimals`).
  - `derived` (cifras calculadas para el texto, con decimales fijos).
  - `{answer}` solo en explicación y pista.
  - `answerDecimals` (2 por defecto) y `answerRange` opcional.
  - En `build_statement`, `formula` por fila; en `spreadsheet`, una celda que es solo `{nombre}` recibe el número.
  - Los datos se escriben sin ceros sobrantes («5 %») y los derivados con decimales fijos («250,00 €»).
- **Cuándo se usan cifras nuevas:** solo en `ReviewScreen`, es decir, Due diligence, Mis errores, Por tema, examen y bloque de repaso de la sesión. La semilla es «id#día», fijada al abrir la pantalla. La lección, su reintento final, los tests de salto y el laboratorio usan el enunciado. Si en una variante sale exactamente el enunciado, se vuelve a sortear (hasta 10 veces).
- **Respuesta:** en una variante se recalcula con la fórmula y se redondea a `answerDecimals`. En la plantilla se mantiene la `answer` declarada, que `content:validate` sigue comprobando.
- **content:validate:**
  - Revisa marcadores definidos, `value` en rango y en la rejilla, que al menos un parámetro pueda variar y que todos los parámetros se usen.
  - Comprueba que la plantilla pasa las comprobaciones de siempre y que 100 variantes (semillas `validate#0…99`) también, incluido el balance de `build_statement` y `answerRange`.
  - Informa de la primera semilla que falla.
- **Salvaguarda en ejecución:** si la variante del día no se puede calcular, el ejercicio se juega con el enunciado y el error va a la consola, en lugar de romper la pantalla.
- **Evento:** `exercise_answered.payload.params` es opcional. Los eventos antiguos se leen igual y el repaso espaciado no lo usa (la tarjeta sigue siendo por ejercicio).
- **Listados:** `findExerciseText` (Reportes y «más fallados» en Despacho) muestra la plantilla con las cifras del enunciado. El botón «Reportar error» no guarda las cifras de la variante (siguiente paso).
- **e2e:** el solver reconoce el enunciado y la variante del día. Para lanzar Playwright en esta sesión hace falta `PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium`.

## 2026-10-17 — Rumbo nuevo pedido por Javier: juego primero, mercado vivo, directo a mercados y fuera el fondo negro
- **Qué dijo:** la app es «mucha teoría», la inflación es demasiado básica, faltan juegos y animaciones mejores, el fondo negro es feo y el temario no le sirve. Sus respuestas a las 3 preguntas:
  - **Colores:** que los elija yo aplicando las skills.
  - **Cómo aprender:** lecciones-juego y además un mercado vivo persistente.
  - **Por dónde empezar:** directo a mercados.
- **Paso 1 hecho (color).** Con emil-design-eng, la dirección de DESIGN.md y el test AA:
  - El tema por defecto pasa a **Mayfair (papel claro)**, con la paleta reforzada.
  - **Wall Street Noche** se rehace en cálido y se llama «Noche cálida» (carbón marrón y ámbar).
  - Los ids de tema no cambian, así que los ajustes guardados siguen valiendo.
  - Las sombras pasan a tinte cálido. El `theme-color` inicial es `#f9f3e7`.
  - CLAUDE.md §5 y DESIGN.md actualizados. Contradice la decisión inicial de CLAUDE.md («Wall Street Noche por defecto»): manda la petición de Javier.
- **Pasos siguientes** (plan en `docs/cambios/rumbo-juego-mercado/proposal.md`): lecciones-juego, mercado vivo y temario empezando en mercados.
- **Paso 2 hecho: La Mesa (mercado vivo)** (`src/engine/live-market.ts`, `src/features/mesa/`, spec `docs/specs/la-mesa.md`).
  - Cartera ficticia de 10.000 € sobre las 6 cotizadas del universo. Precio inicial = BPA de 2025 × 15. Beta y volatilidad por negocio, como hipótesis didácticas.
  - Velas por día con semilla propia, para que alargar el mercado no cambie el pasado.
  - Teletipo de 14 tipos de noticia (`content/shared/market-news.json`, con concepto enlazado). El 60 % del impacto se descuenta en la apertura.
  - Cada movimiento se descompone en mercado + empresa + noticia, y la mesa lo explica al cerrar.
  - Órdenes a mercado a la apertura ± 0,05 %, con comisión del 0,1 % (mínimo 1 €). Sin cortos. Tope de 5 días de mercado por día real.
  - XP por proceso: 5 por cerrar el día y +5 si la cartera está diversificada (≥ 3 valores y ninguno > 40 %).
  - Eventos nuevos `mesa_order` y `mesa_day_closed` (opcionales, compatibles). La cartera es una proyección de los eventos.
  - Inicio: la cinta sale ahora de La Mesa, para que los precios coincidan en toda la app. La tarjeta de La Mesa es la primera de Inicio.
- **Paso 3 en curso: lección-juego.**
  - Las lecciones admiten `game: { kind, seed }`. Se juega primero; la explicación y los ejercicios paramétricos usan las cifras de la partida (`instantiate` acepta cifras impuestas).
  - `content:validate` comprueba los marcadores contra lo que devuelve el juego y prueba cada ejercicio con 4 partidas de referencia.
  - Primer juego: **La compra grande** (`src/engine/games/block-trade.ts`): 600 acciones en un libro poco profundo antes de unos resultados. El precio medio se muestra con 4 decimales para que media × acciones − punto medio × acciones dé el impacto que se enseña.
  - Lección `n1-u4-l7` en `draft`, pendiente del revisor.
  - **Actualización (17/10/2026):** `n1-u4-l7` revisada (dos rondas) y en `reviewed`. El evento pasó a ser público y cierto (Naranjas entra en un índice y compran los fondos indexados).

## 2026-10-18 — Temario «directo a mercados» aplicado (aprobado por Javier el 17/10/2026)

- **Decisión:** la planta es el orden de presentación; el nivel de contenido (`nN` en los IDs) no cambia. `src/engine/floors.ts` define `FLOOR_LEVELS = [1, 3, 2, 4, 5, 6, 7, 8, 9, 10]` y la Base (nivel 0). `curriculum.json` lleva `floor` (número) en cada planta y `base: true` en el nivel 0; `content:validate` comprueba que coinciden.
  - **Motivo:** cambiar el orden sin tocar IDs publicados ni las tarjetas SRS de Javier (CLAUDE.md §3b).
  - **Descartado:** renumerar niveles y lecciones (rompe IDs y eventos ya guardados).
- **Camino:** 10 plantas (0–9), la 9 es el despacho de socios. El rango de cada planta sale de la planta, no del nivel. La planta actual del rango es la más alta con alguna lección completada; la Base no cuenta.
- **Base opcional:** el nivel 0 sale del Camino y de «siguiente lección» (Inicio, sesión, onboarding) y aparece en Practicar con su progreso y lo dominado por test de salto. Su test de salto de nivel sigue en `#/saltar-nivel/0`.
- **Orden de la planta 0:** `n1-u1` → `n1-u4` → `n1-u3` → `n1-u5` → `n1-u2` → `n1-u6`. La propuesta tenía «Subastas y apertura» y «Psicología» como unidades propias; por ahora viven dentro de `n1-u4` (subastas, FOMO) para no mover lecciones de unidad (cambiaría sus IDs). Se crearán unidades nuevas si hace falta.
- **Lección-juego primero:** campo opcional `order` en la lección (posición dentro de la unidad); `order: 0` abre la unidad. El orden global es planta → posición de la unidad en `curriculum.json` → `order` o número de lección (`src/content/order.ts`).
- **Prerrequisitos:** deben enseñarse en la misma planta o antes. Dos conceptos cambiados: `emision-bonos` (N3) pasa a depender de `prestamo` (Base) en vez de `cupon-bono` (N2, ahora planta posterior), y `anclaje` (N3) de `fomo-manada` (N1) en vez de `ilusion-control` (N2). Al escribir la planta 1 habrá que explicar cupón y coste de la deuda sin dar por vista la renta fija.
- **Bloom por nivel** sigue contando por nivel de contenido (`nN`), no por planta.
- **Juego nuevo: Tus primeras acciones** (`src/engine/games/first-shares.ts`, lección `n1-u1-l6`). Es el «¿Sube o baja?» de la propuesta adaptado a la unidad 1: 100 acciones de Naranjas (regalo de la abuela, para no rozar las normas de operaciones personales del banco), cinco noticias de la empresa (dos suben, dos bajan, una sin novedad), precio, capitalización y lo que valen tus acciones. Las cifras que devuelve van en snake_case porque los nombres de parámetros lo exigen. El «¿Sube o baja?» de Practicar sigue igual.
- **e2e:** `completeOnboarding` ya no supone la primera lección; `e2e/play-any.ts` reconoce la lección abierta por su cabecera y `e2e/play-game.ts` juega la partida de referencia 0 de cada lección-juego.

## 2026-10-18 — Lección-juego «La subasta de apertura» (`n1-u4-l8`)

- **Nombre:** la propuesta la llamaba *Campana de apertura*, pero ese nombre ya lo tiene el juego de verdadero/falso de Practicar. Esta es otra cosa, una subasta jugable, así que se llama **La subasta de apertura**. Va en la unidad `n1-u4` justo antes de la lección teórica de subastas (`order: 3`).
- **Juego** (`src/engine/games/opening-auction.ts`):
  - 500 acciones para un cliente. Libro de subasta a las 8:30 y una orden grande a las 8:59, de compra o de venta según la semilla.
  - Ves en directo el precio indicativo con tu orden y cuántas acciones comprarías.
  - Lo que no compras en la subasta lo compras en el continuo a la apertura + 0,05 € (supuesto del juego: media horquilla más impacto; así se dice en el texto).
- **Fijación del precio** (reglas de BME, en orden): (1) máximo volumen; (2) menor desequilibrio; (3) el lado con más volumen; (4) el más cercano al último precio negociado, o ese mismo si está entre los precios empatados.
  - **Fuente:** el artículo de BME «Las subastas en la bolsa (Parte I)» (2023) y las circulares de MEFF, vistos en una búsqueda. La circular del SIBE no se pudo abrir: el dominio de BME está bloqueado desde el entorno.
  - 🛑 **Interpretación propia del paso 3**, pendiente de contrastar con la circular: si en todos los precios empatados sobra demanda, gana el más alto; si en todos sobra oferta, el más bajo; si los signos están mezclados, se pasa al paso 4. Las lecciones `n1-u4-l4` y `n1-u4-l8` llevan `verificarAntesDe` 2027-06-30.
- **Corrección en `n1-u4-l4`** (versión 2): la tarjeta 2 no tenía el paso 3. Además, la tarjeta 1 decía que se casan todas las órdenes; ahora dice «las que pueden casarse».
- **Prioridad:** primero las órdenes a mercado, luego el límite más alto y, a igual límite, la hora de llegada. Si a las 8:59 confirmas la misma orden de las 8:30, conserva su sitio por delante de la orden grande; si cambias el precio o el tipo, va al final de la cola.
- **Nota:** 1 con la orden final más barata posible (con un margen de 2 €) y 0 con la más cara. Se calcula probando todas las órdenes que se podían poner.

## 2026-10-18 — Lección-juego «¿Quién mueve el índice?» (`n1-u3-l6`)

- **Decisión:** el juego de «Bolsas e índices» usa el índice ficticio **Turia 6**. Reúne las seis cotizadas del universo, ponderadas por capitalización ajustada por free float, **sin topes**: así se ve que la mayor (Azahar) pesa la mitad. El IBEX 35 y su tope del 20 % se explican en las tarjetas. Base: 1.000 puntos. Cuatro sesiones, cada una de un tipo:
  - una pequeña se dispara;
  - la grande sube y las demás bajan;
  - cae la segunda;
  - todas suben.

  Cada día predices la variación con un deslizador (también con botones − y +, en décimas) y luego ves la aportación de cada empresa (peso × variación).
- **Motivo:** es la idea central de la unidad (l2 y l3) y se aprende mejor fallando una predicción que leyendo la fórmula.
- **Datos:** acciones de `companies.json` (un test lo comprueba); precios cercanos a la cinta de La Mesa; free float fijado por empresa en el motor (`src/engine/games/index-mover.ts`). Los pesos de cada día salen de los precios del cierre anterior.
- **Acierto:** a 0,15 p. p. o menos cuenta 1; a 0,5 p. p. o menos, medio.
- La lección abre la unidad (`order: 0`). Javier debe comprobar el tope del 20 % del IBEX en el PDF de las Normas Técnicas: desde aquí solo se pudo citar la página de índices de BME.

## 2026-10-18 — Lección-juego «El primer dividendo» (`n1-u5-l7`)

- **Decisión:** el juego de la unidad 4 de la planta 0 es una historia en cinco pasos con Pirineo Energía. Lo que propuse antes, «tu primer dividendo en La Mesa», queda para más adelante: meter eventos de empresa en el mercado vivo es un cambio mayor.
  1. Eliges bróker entre tres ficticios: 0,10 % con mínimo de 1 €; 5 € fijos; 0,25 % con mínimo de 8 €. El más barato depende del importe; el corte entre 0,10 % y 5 € está en 5.000 €.
  2. Decides si «cazas» el dividendo comprando 300 acciones el día antes de la fecha ex y vendiéndolas ese día.
  3. Predices el precio de referencia en la fecha ex.
  4. Cobras el dividendo con la retención del 19 %, que es un pago a cuenta.
  5. Vendes un mes después.
- **Supuesto del motor:** en la fecha ex el precio de referencia es exactamente el cierre anterior menos el dividendo bruto, y cazar el dividendo cuesta solo dos comisiones, antes de impuestos. 🛑 Pendiente de citar la norma exacta de BME sobre el ajuste del precio de referencia: no se pudo abrir desde el entorno y la búsqueda no la encontró. La lección lleva `verificarAntesDe` 2027-03-31, como `n1-u5-l5`.
- **Nombres ficticios:** Llave Valores, Fijo Bolsa y Ancla Inversión. «Banco del Turia» se descartó porque sonaba a una entidad real. 🛑 Javier los comprobará en los registros de la CNMV.
- **Repaso de e3:** los rangos de coste y venta no se solapan. Si se solapan, salen rentabilidades cercanas al 0 % y la tolerancia relativa no admite el redondeo a 2 decimales.

## 2026-10-18 — Lección-juego «La salida a bolsa» (`n1-u2-l6`)

- **Decisión:** la unidad 5 de la planta 0 revive la salida a bolsa de Naranjas del Turia **antes de 2021**, el primer ejercicio del universo. Así no contradice `companies.json`, donde Naranjas tiene 12.000.000 de acciones y el mismo capital desde 2021.
  - La familia tenía 9.000.000 de acciones; la oferta fue una OPS de 3.000.000 nuevas más una OPV de 1.200.000 de la familia. Resultado: 12.000.000 de acciones, un 35 % de free float y un 65 % para la familia, las mismas cifras que usan «Tus primeras acciones» y «¿Quién mueve el índice?».
- **Término:** «libro de demanda» (book-building). «Libro de órdenes» queda para el del mercado secundario (`n1-u4`).
- **Supuesto del juego (se dice en pantalla):** la demanda baja en línea recta a lo largo del rango (9,00–10,50 €). El cierre del primer día es el valor de la semilla × (1 + 0,015 × (veces cubierta − 2)), con un tope de 6 veces. Si la oferta no se cubre, el juego pide otro precio.
- **Nota:** 1 con el precio más alto que no rompe el estreno ni sube más de un 15 %; 0,75 con otro precio bueno; 0,5 si sube más de un 15 % (dinero en la mesa); 0,25 si cierra por debajo del precio.

## 2026-10-18 — Lección-juego «El rumor de OPA» (`n1-u6-l7`) y fin de la planta 0

- **Decisión:** el juego de la unidad 6 de la planta 0 es una historia de tres días con Mediterránea de Navieras (tienes 1.000 acciones):
  1. Lunes: rumor en prensa de una OPA de Ebro Capital. Comprar por el rumor no resta nota: es legal para un inversor cualquiera y se enseña el riesgo de que sea falso.
  2. Martes: Hugo Ferrer, que asesora a Ebro, te da la confidencia. Lo correcto es no operar, no contarlo y avisar a cumplimiento normativo (Pilar Soler). Pesa el 60 % de la nota.
  3. Miércoles: anuncio de la OPA con un premio del 20–30 %, y la acción cotiza un 1–2 % por debajo de la oferta. Vender en bolsa y acudir valen lo mismo; no acudir vale menos.
- **Motivo:** es el primer caso del hilo de ética (TEMARIO §1) y el más útil para alguien que va a trabajar en banca.
- **Concepto nuevo** `informacion-privilegiada` (nivel 1), que pasa a ser prerrequisito de `abuso-mercado` (N9).
  - No entra todavía en la lista de conceptos de la unidad en `curriculum.json`: el test de salto revisado de `n1-u6` tendría que evaluarlo, y eso exige ampliar el banco y volver a revisarlo.
  - 🛑 Pendiente: añadir una pregunta al test de salto de `n1-u6` sobre información privilegiada (se puede hacer junto con la ampliación de los bancos a 12 preguntas, ya aprobada).
- **Validación:** la comprobación de conceptos «adelantados» compara ahora el orden de las plantas (`levelOrder`), no el número de nivel, igual que los prerrequisitos.
- 🛑 «Ebro Capital» (ficticio, ya usado en `n1-u6-l5`) queda pendiente de comprobar en el registro de la CNMV, como el resto de los nombres.
- **Planta 0 completa:** las seis unidades empiezan con una lección-juego.

## 2026-10-18 — Cierre de fase de la planta 0: casos extremos, rendimiento y blindaje

- **Casos extremos (`break-ui`):**
  - Las siete lecciones-juego se prueban a 320 px y a 640 px con el texto al 200 %, con la semilla de cifras más extremas de cada juego (`src/features/games/worst-seeds.ts`), y también solo con teclado (`e2e/peor-caso-juegos.spec.ts`).
  - Interruptor «Demo / Peor caso» solo en desarrollo (`?datos=peor`).
  - Arreglos:
    - la cabecera de la lección ya no se estira con contenido ancho;
    - los resúmenes usan rejillas que pasan a una columna;
    - la tabla de la subasta se desplaza en horizontal dentro de su caja, que es lo admitido para tablas de datos en el criterio de reajuste de WCAG;
    - el rango del folleto puede partirse.
  - Capturas en `docs/capturas/peor-caso/`.
- **Rendimiento (`animation-performance`):**
  - Todo lo que se anima en los juegos usa `transform` y `opacity` (CSS o WAAPI). La vela se dibuja en canvas.
  - Único hallazgo: `AnimatedNumber` hacía un `setState` en cada fotograma. Ahora escribe los fotogramas intermedios directamente en el nodo, y React solo pinta el valor de partida y el final.
  - Comprobado en el código y con la prueba de 60 fps con la CPU ralentizada 4×. Falta la grabación en un móvil real.
- **Blindaje:** `/impeccable harden` sigue sin estar disponible (Impeccable no se instala), así que se hizo a mano.
  - Hallazgo real: un doble toque en «La compra grande» compraba dos rondas, de la 1 a la 3 (reproducido con un e2e que falla sin el arreglo).
  - Arreglo: `TapGuard` envuelve los juegos de lección. Ignora el segundo clic de un doble clic y, en táctil, un toque muy cercano en tiempo y posición al anterior. Los botones −/+ del índice llevan `data-repeat` para poder pulsarse a ráfagas.
  - Ya cubierto antes: almacenamiento lleno durante una lección-juego (la primera lección tras el onboarding es un juego) y lección sin conexión.
- **Frágil, anotado:** las tarjetas y los ejercicios de cada lección-juego se escribieron con la semilla fija; si se cambia una semilla, hay que volver a revisar sus textos.
- `/review-animations` no puede lanzarla el modelo: queda para que la ejecute Javier.

## 2026-10-18 — Planta 1: unidad `n3-u1` «Los tres estados financieros» y juego «Cuadra el balance»

- **Decisión:** la planta 1 empieza con una unidad de seis lecciones:
  - el juego «Cuadra el balance» (`n3-u1-l1`, orden 0);
  - el balance;
  - la cuenta de pérdidas y ganancias;
  - el estado de flujos de efectivo (método indirecto);
  - cómo se conectan los tres estados (explicador nuevo `ThreeStatements`);
  - el Jefe final con las cuentas de 2023.

  Todas usan las cuentas de Naranjas de `companies.json`.
- **Simplificación declarada:**
  - `companies.json` suma el beneficio de cada año a las reservas. El modelo del PGC lo muestra aparte («Resultado del ejercicio») hasta que la junta lo aplica.
  - Se mantiene la convención para no rehacer el universo, y se avisa en el juego, en las tarjetas, en los enunciados y en las filas («Reservas (con el resultado del año)»).
  - Si más adelante hace falta el detalle PGC, se añade un campo `resultado` a `companies.json` con migración de los tests que cuadran las cuentas.
- **PGC frente a NIIF:**
  - La cuenta de resultados usa «coste de ventas» (presentación por función, que las NIIF permiten). El PGC clasifica los gastos por naturaleza. La lección 3 lo dice.
  - El estado de flujos parte del resultado del ejercicio. El modelo del PGC parte del resultado antes de impuestos. La lección 4 lo dice.
  - Los dividendos pagados van en financiación, como en el PGC; la NIC 7 permite presentarlos también en explotación.
- **Juego:**
  - Tres apuntes por operación: el correcto, uno que descuadra y uno que cuadra pero toca la partida equivocada (cuadrar no basta).
  - El balance avanza siempre con el correcto, para que las cifras de la lección no dependan de la partida.
  - Semilla 1; peor caso, semilla 203.
- **Herramientas:** el solver de e2e resuelve ahora `build_statement`.
- **Validación:** el test de detalle de conceptos admite descripción y unidad en niveles ≥ 2 cuando el concepto ya está en una unidad del curriculum.
- 🛑 **Test de salto:** el esquema solo admite preguntas de reconocer (tipo test, verdadero/falso y multi_select) y exactamente 8 en todas las unidades. Por eso no puede cumplir el «≥ 50 % de producir» de TEMARIO §5. Se apunta como pendiente global, junto con el banco de 12.

## 2026-10-18 — Unidad `n3-u2` «De la cuenta de resultados a la caja» y juego «Ciclo de caja»

- **Decisión:** cinco lecciones:
  - el juego «Ciclo de caja» (`n3-u2-l1`, semilla 2: el plan de siempre, 60/60/50 con póliza, deja a Naranjas sin caja; el mejor plan cobra a 30 días);
  - NOF y fondo de maniobra;
  - días de cobro, existencias y pago, con el explicador nuevo `CashCycle`;
  - financiar el circulante: póliza, factoring y confirming, y los plazos legales;
  - el Jefe final con las cuentas de 2023.
- **Conceptos:** `ciclo-caja` y `factoring-confirming`.
- **Normativa:** plazos de pago de la Ley 3/2004 (60 días entre empresas, imperativo según el Tribunal Supremo, STS de 23/11/2016) y de la Ley 12/2013 (30 días frescos y perecederos, 60 el resto, desde la entrega), con su URL ELI del BOE.
  - Hay un anteproyecto que propone bajar el plazo general a 30 días, así que `verificarAntesDe` es 2027-03-31.
- **Simplificaciones declaradas en las lecciones:**
  - NOF = clientes + existencias − proveedores, sin caja operativa ni otras partidas espontáneas;
  - días de pago sobre el coste de ventas, en lugar de sobre las compras;
  - fondo de maniobra con la deuda con bancos a largo plazo, porque `companies.json` no la separa.
- **Juego:** el factoring se paga por factura; su coste anual se modela como comisión × 365 / días de cobro, más caro que la póliza pero sin su límite. Peor caso: semilla 120.
- **Días de pago medios:** como la fruta fresca se paga a 30 días como mucho, el juego ofrece pagos medios de 30, 40 o 50 días; 50 es la fruta a 30 y los envases a 60. Lo pidió la revisión.
- **Herramientas:** el solver de e2e resuelve ahora `match_pairs`.

## 2026-10-18 — Unidad `n3-u3` «Ratios y calidad del beneficio» y juego «¿Quién es quién?»

- **Decisión:** seis lecciones:
  - el juego «¿Quién es quién?» (`n3-u3-l1`, semilla 4, cuentas de 2025): el ejercicio clásico de identificar el sector por sus ratios, con las cinco empresas del universo;
  - rentabilidad;
  - liquidez y solvencia;
  - DuPont y apalancamiento, con el explicador nuevo `Leverage`;
  - calidad del beneficio;
  - el Jefe final con Tramuntana Retail de 2025.
- **Conceptos:** `ratios` y `calidad-beneficio`. `dupont-roic` (ROIC frente a WACC) queda para la unidad de coste de capital, porque requiere el WACC.
- **Simplificaciones:**
  - ROA con el resultado del ejercicio;
  - la deuda con bancos se trata como a largo plazo, de modo que el pasivo corriente son los proveedores;
  - el apalancamiento del explicador se calcula antes de impuestos.
- **Datos:** el motor importa `companies.json` con `with { type: 'json' }`, porque el cargador de Playwright lo exige al jugar en e2e.
- **Peor caso, ampliado:** el vigilante de desbordes comprueba ahora también que los hijos de cada panel respeten su relleno (sin contar las capas absolutas).
  - Encontró dos fallos y los dos están corregidos:
    - un `<select>` que estiraba la columna de «¿Quién es quién?»;
    - la fila del deslizador de «¿Quién mueve el índice?» a 320 px.
  - Todos los paneles de juego usan ahora `grid-cols-[minmax(0,1fr)]`.

## 2026-10-18 — Unidad `n3-u4` «Múltiplos: ¿cara o barata?»

- **Decisión:** cinco lecciones:
  - el juego «¿Cara o barata?» (`n3-u4-l1`, semilla 2: Naranjas a 11,09 €, un 20 % por encima de su valor por PER, así que «cara»);
  - PER y BPA;
  - valor de empresa y EV/EBITDA, con el explicador nuevo `EvBridge`, añadido al catálogo de ANIMACIONES;
  - comparables y sesgo de anclaje;
  - el Jefe final con Tramuntana y Pirineo.
- **Conceptos:** `multiplos` y `anclaje` (el 🧠 de la planta 1).
- **Precios de hoy y comparables:** son ficticios y anónimos. `companies.json` no tiene cotizaciones; la cinta de la home usa precios inventados sin relación con las cuentas. Las lecciones lo recuerdan y no recomiendan.
- **Simplificaciones:** valor de empresa = capitalización + deuda financiera − caja, sin minoritarios, arrendamientos ni otros ajustes; PER con el beneficio del último año.

## 2026-10-19 — Unidad `n3-u5` «Coste de capital: CAPM y WACC», antes del DCF

- **Orden:** la propuesta aprobada ponía el DCF Express antes que el coste de capital. Se invierte: el concepto `dcf` requiere `wacc` en el mapa de conceptos (TEMARIO §4), y descontar flujos sin saber de dónde sale la tasa contradice el dominio por prerrequisitos.
- **Decisión:** cinco lecciones:
  - el juego «La mezcla de la financiación» (`n3-u5-l1`, semilla 0: las hipótesis del modelo DCF de referencia de Naranjas);
  - el CAPM;
  - la beta apalancada y desapalancada (Hamada);
  - el coste de la deuda y el WACC, con el explicador `WaccMix` (ya en el catálogo de ANIMACIONES);
  - el Jefe final con el WACC de Pirineo Energía.
- **Conceptos:** `capm-beta`, `coste-capital`, `beta-apalancada`, `coste-deuda`, `estructura-capital` y `wacc`.
- **Simplificaciones:**
  - Hamada con beta de la deuda nula;
  - en el juego, el coste de la deuda sube con el cuadrado de lo que el peso de la deuda pasa de un umbral (ficha en `docs/specs/mezcla-financiacion.md`);
  - la prima por tamaño se presenta como una hipótesis discutida;
  - en el Jefe final se usa la deuda bruta para los pesos.
- **Dato legal:** el límite de deducibilidad de gastos financieros (art. 16 de la Ley 27/2014) lleva la fuente del BOE y `verificarAntesDe` 2027-03-31.
- **Producción:** la build de producción solo carga lecciones `reviewed` o `published`, así que `e2e/n3u5.spec.ts` (proyecto prod) pasa cuando la unidad está revisada.

## 2026-10-19 — Unidad `n3-u6` «DCF: lo que vale una empresa»

- **Decisión:** cinco lecciones:
  - el juego «DCF Express» (`n3-u6-l1`, ficha 8 de JUEGOS, semilla 0 sobre el modelo DCF de referencia de Naranjas);
  - valor actual y VAN;
  - el flujo de caja libre (FCFF);
  - el valor terminal (Gordon y múltiplo) y la sensibilidad, con el explicador `DcfTimeTravel` (ya en el catálogo de ANIMACIONES);
  - el Jefe final con un DCF de Pirineo Energía, con el WACC del 6 % de la unidad anterior (redondeado) y un plan ficticio de FCFF de 20.000 a 24.000 mil €.
- **Conceptos:** `van` y `dcf`. La TIR (`tir-proyecto`) queda para una unidad de presupuesto de capital.
- **Diseño del juego:** el objetivo de la ficha («caer en el rango del comité») es el reto 3; antes van dos retos que enseñan lo esencial del DCF, el WACC implícito en el precio y el peso del valor terminal. Ficha en `docs/specs/dcf-express.md`.
- **Convención:** el valor terminal por Gordon se descuenta con el factor del último flujo a mitad de año (4,5 años), porque parte de un flujo. El valor por múltiplo se descuenta a 5 años, porque es un valor a 31/12/2030. Las dos convenciones son las del modelo de referencia (revisión, ronda 2).

## 2026-10-19 — Planta 2: unidad `n2-u1` «Bonos: cupón, precio y TIR» y juego «La emisión de Naranjas»

- **Decisión:** la planta 2 empieza por el caso hilo: Naranjas emite bonos (CLAUDE.md §8b). Cinco lecciones:
  - el juego «La emisión de Naranjas» (`n2-u1-l1`, semilla 0), nuevo, con ficha en `docs/specs/emision-naranjas.md`;
  - cupón, nominal y precio, con el explicador `BondSeesaw` (ya en el catálogo);
  - la TIR;
  - Letras, Bonos y Obligaciones del Tesoro, rating y diferencial;
  - el Jefe final con un bono de Pirineo Energía a 3 años.
- La ficha 13 de JUEGOS («Curva de tipos») queda para la unidad de duración y curva, donde encaja mejor: mover la curva tiene más sentido cuando ya se sabe qué es el precio de un bono.
- **Conceptos:** `cupon-bono`, `precio-bono-tipos`, `tir-bono`, `letras-bonos-tesoro` y `rating-spread`.
- **Bloom de N2** (≥ 50 % recordar/entender): los numéricos son de aplicar, y los ejercicios de producir de entender o recordar (clasificar, ordenar, completar) equilibran la mezcla.
- **Hechos que caducan:** los plazos de los valores del Tesoro y la escala de rating llevan fuente (Tesoro Público y ESMA) y `verificarAntesDe` 2027-04-30.
  - 🛑 Javier debe contrastarlos en tesoro.es: Letras de 3, 6, 9 y 12 meses; Bonos a 3 y 5 años; Obligaciones a 10, 15, 30 y 50 años.

## 2026-10-19 — Unidad `n2-u2` «Duración y curva de tipos» y juego «Curva de tipos»

- **Decisión:** cuatro lecciones:
  - el juego «Curva de tipos» (ficha 13 de JUEGOS, semilla 0 con curva normal);
  - la curva de tipos (formas y pendiente 10 − 2);
  - duración y convexidad, con el explicador `Duration` (ya en el catálogo);
  - el Jefe final con la cartera de bonos de la mesa de Albufera (duración de cartera e inmunización sencilla).
- **Conceptos:** `curva-tipos`, `duracion` y `convexidad`. La curva cupón cero, el bootstrapping y los forwards quedan para una unidad posterior.
- **Juego, simplificación:** la curva se mueve con dos palancas (nivel y pendiente) en lugar de arrastrarla con el dedo. Es accesible por teclado y cumple el núcleo de la ficha; el arrastre con física de cuerda queda anotado como mejora en `docs/specs/curva-de-tipos.md`.

## 2026-10-19 — Unidad `n2-u3` «Fondos, ETF y comisiones» y juego «Dos fondos, veinte años»

- **Decisión:** cinco lecciones:
  - el juego, nuevo, con ficha en `docs/specs/dos-fondos.md`;
  - fondos y comisiones, con el explicador `TerDrain` (ya en el catálogo);
  - ETF e indexados (corretaje y horquilla);
  - traspasos y fiscalidad;
  - el Jefe final con el plan de ahorro de un cliente.
- **Conceptos:** `fondos-inversion`, `etf` y `traspasos-fondos`. La `fiscalidad-fondos` completa (cripto, retenciones, compensación) queda para más adelante.
- **Hechos que caducan:**
  - el régimen de traspasos (art. 94 de la Ley del IRPF) y la exclusión general de los ETF;
  - el primer tramo de la base del ahorro (19 % hasta 6.000 €, art. 66).
  - Llevan la fuente del BOE y `verificarAntesDe` 2027-03-31. 🛑 Javier debe contrastarlos.

## 2026-10-19 — Unidad `n2-u4` «Riesgo y estadística» y juego «¿Suerte o habilidad?»

- **Decisión:** cinco lecciones:
  - el juego, nuevo, con ficha en `docs/specs/suerte-o-habilidad.md`;
  - media y desviación típica, con la volatilidad anualizada por √12;
  - la normal y sus colas, con el explicador `NormalTails` (ya en el catálogo);
  - suerte, habilidad e ilusión de control (el 🧠 de la planta 2);
  - el Jefe final con el informe de riesgos de un fondo de Albufera.
- **Conceptos:** `media-desviacion`, `distribucion-normal` e `ilusion-control`. El 📊 de la planta (PROMEDIO y DESVEST) entra en dos ejercicios de completar.
- **Simplificaciones:** √12 supone meses independientes, y las colas gordas del juego se simulan (no son datos reales). Las dos cosas se dicen en el contenido.

## 2026-10-19 — Unidad `n2-u5` «Divisas, materias primas y cripto» y juego «El viaje del dólar»

- **Decisión:** cinco lecciones:
  - el juego, nuevo, con ficha en `docs/specs/viaje-del-dolar.md`;
  - divisas y tipo de cambio, con el explicador nuevo `FxEffect`, añadido al catálogo de ANIMACIONES (el único de divisas, `FxParity`, es de la planta de macro);
  - materias primas (futuros, ETC, contango y backwardation);
  - criptoactivos y MiCA;
  - el Jefe final con la cartera internacional de un cliente.
- **Conceptos:** `divisas`, `materias-primas` y `cripto-mica`.
- **Componente:** el patrón de pregunta con explicación de las lecciones-juego pasa al kit como `AskStep` (lo usan «¿Suerte o habilidad?» y «El viaje del dólar»).
- **Hechos que caducan:** MiCA (Reglamento (UE) 2023/1114) y el papel de la CNMV llevan fuente y `verificarAntesDe` 2027-04-30. 🛑 Javier debe contrastarlos.

## 2026-10-19 — Unidad `n2-u6` «Mercado monetario, repo, cédulas y titulizaciones» y juego «Una noche en la tesorería»

- **Decisión:** cinco lecciones:
  - el juego, nuevo, con ficha en `docs/specs/noche-tesoreria.md`;
  - el mercado monetario (€STR, Euríbor, Letras con actual/360);
  - el repo por dentro, con el explicador nuevo `RepoFlow`, añadido al catálogo;
  - cédulas y titulizaciones (reparto de pérdidas por tramos);
  - el Jefe final con un lunes en la tesorería.
- **Conceptos:** `mercado-monetario-repo` y `cedulas-titulizaciones`.
- **Bloom de N2:** va muy justo (≈ 50 %), y el Jefe final lleva un verdadero/falso más para no bajar del mínimo. Las unidades que quedan de la planta 2 (pensiones, SOCIMI, productos complejos e introducción a derivados) deben cargar algo más de recordar y entender.
- **Hechos que caducan:** el €STR del BCE y el régimen de bonos garantizados (Real Decreto-ley 24/2021) llevan fuente y `verificarAntesDe` 2027-04-30.
