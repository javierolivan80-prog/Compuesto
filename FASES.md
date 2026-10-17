# FASES.md — Plan de construcción de Compuesto

> **Cómo usarlo:** cada bloque de código es un prompt para pegar en Claude Code, en orden, **una tarea por conversación** (o por sesión limpia). No empieces una tarea si su "Depende de" no está cumplido.
> Todas las tareas siguen `EXECUTION.md`: plan previo, verificación ejecutada de verdad e informe final con su formato. Por eso no se repite en cada prompt.
> 🛑 = punto de control humano: Claude se detiene y espera tu revisión.

**Mapa**

| Fase | Objetivo | Tareas |
|---|---|---|
| 0 | Entorno y sistema de diseño | 0.1–0.6 |
| 1 | MVP jugable local con Niveles 0–1 | 1.1–1.10 |
| 2 | Sesión diaria, repaso, juegos, rivales y estadísticas | 2.1–2.8 |
| 🧪 Prueba personal | 4 semanas usándola de verdad y ajustar | P.1–P.2 |
| 3 | Sincronización entre tus dispositivos (opcional) | 3.1–3.3 |
| 4 | Contenido completo y estatus | 4.1–4.5 |
| 5 | Pulido del año troncal | 5.1–5.3 |
| 6 | Ramas de especialización | 6.1–6.4 |

> **Uso personal:** la app es solo para Javier. No se construye nada para otros usuarios (ligas reales, cuentas, moderación, analítica, landing, marketing). Ver CLAUDE.md §2.9.

---

## PASO PREVIO (tú, en la terminal)

```bash
node -v        # debe ser >= 20.19 o >= 22.12 (requisito de Vite 8)
python3 --version
# descomprime compuesto.zip: trae CLAUDE.md, EXECUTION.md y FASES.md en la raíz y docs/ con TEMARIO, JUEGOS y ANIMACIONES
cd compuesto && git init
claude
```

La instalación de skills y el subagente revisor los hace la tarea 0.1, que además comprueba que funcionan.

---

# FASE 0 — Entorno y sistema de diseño

### 0.1 — Entorno, dependencias y andamiaje
```
Lee CLAUDE.md, EXECUTION.md y FASES.md. Ejecuta la tarea 0.1.

Objetivo: dejar un proyecto vacío pero sano, con versiones compatibles comprobadas, CI local y las skills verificadas.
Consulta: CLAUDE.md §2, §3, §3b, §4.
Depende de: nada.

Incluye:
1. Revisar e instalar todas las skills de CLAUDE.md §4 con sus comandos y comprobar en este entorno cuáles cargan y qué nombres de skill existen realmente (algunos repos tienen muchas: anotar cuáles se usan). Desactivar la telemetría de Impeccable.
1b. Con `skill-creator`, crear las skills propias `crear-unidad`, `nuevo-explicador`, `nuevo-juego` y `revisar-unidad` en `.claude/skills/`, basadas en TEMARIO §8, ANIMACIONES §2 y JUEGOS §2–§5.
2. Crear el subagente revisor como archivo versionado `.claude/agents/revisor-financiero.md`: revisa unidades de contenido según docs/TEMARIO.md §8 punto 3, no genera contenido, devuelve lista de errores y cambios, estricto con la exactitud y con que haya una única respuesta correcta.
3. Crear el proyecto React 19 + Vite + TypeScript strict + Tailwind v4. Antes de fijar versiones, comprobar con npm las versiones actuales y los rangos de peerDependencies (React, Vite, @vitejs/plugin-react, Tailwind, TypeScript, typescript-eslint, Vitest, vite-plugin-pwa, Motion, Sonner, Vaul, Dexie, ts-fsrs). Fijar versiones exactas compatibles.
4. Scripts: dev, build, preview, typecheck, lint, format, test, e2e, content:validate (vacío funcional), content:check (vacío funcional).
5. ESLint + Prettier, Vitest con un test de ejemplo real, Playwright con un test que abre la app.
6. Estructura de carpetas de CLAUDE.md §3 (solo lo necesario, sin archivos vacíos de relleno).
7. CI en GitHub Actions: typecheck, lint, test, build.
8. DECISIONES.md con las versiones fijadas, por qué, y el resultado de la verificación de cada skill.

Excluye: tokens, temas, componentes, pantallas.
Aceptación:
- npm run typecheck, lint, test, build y e2e pasan (ejecutados).
- DECISIONES.md lista versiones exactas y estado real de cada skill (funciona / no funciona / alternativa).
- El subagente existe y responde a una revisión de prueba con un JSON de lección inventado con un error deliberado (lo detecta).
Parar si: Node no cumple la versión requerida; una dependencia clave no tiene versión compatible con las demás sin cambiar una decisión de CLAUDE.md.
```

### 0.2 — Verdad del producto y design system
```
Lee CLAUDE.md y EXECUTION.md. Tarea 0.2.

Objetivo: documentar el producto y el sistema de diseño antes de escribir UI.
Consulta: CLAUDE.md §1, §2, §5, §6, §7, §8b.
Depende de: 0.1.

Incluye:
1. /impeccable init → PRODUCT.md con CLAUDE.md §1, §2, §7 y §8b como fuente.
2. Generar el design system con ui-ux-pro-max (comando de CLAUDE.md §4) y reconciliarlo con CLAUDE.md §5–§6, que mandan. Resultado en design-system/compuesto/MASTER.md y DESIGN.md. Lista explícita de qué propuestas de la skill se descartan y por qué.
3. Si alguna skill no funcionó en 0.1, escribir PRODUCT.md y DESIGN.md manualmente con la misma estructura.

Excluye: código de UI.
Aceptación: PRODUCT.md y DESIGN.md existen, no contradicen CLAUDE.md y DESIGN.md incluye tokens, tipografía, motion, anti-patrones y reglas de accesibilidad.
Parar si: la skill propone algo incompatible con CLAUDE.md §5 que creas que mejora el producto: proponlo, no lo apliques.
```

### 0.3 — Tokens, temas, tipografía y motion
```
Lee CLAUDE.md, EXECUTION.md y DESIGN.md. Tarea 0.3.

Objetivo: sistema de tokens funcionando en código con los 7 temas.
Consulta: CLAUDE.md §5–§6, DESIGN.md.
Depende de: 0.2.

Incluye:
1. Tokens en CSS variables (colores de los 7 temas, espaciado, radios, sombras, grano, z-index) integrados con Tailwind v4.
2. Fuentes con @fontsource (Instrument Serif, Geist Sans, Geist Mono), tabular-nums en cifras, escala 1.25.
3. Tokens de motion de ANIMACIONES.md §1 en `/src/design/motion.ts` (curvas, springs, duraciones, stagger) y soporte de prefers-reduced-motion. Usar la skill `motion-design` para definir la personalidad "Premium".
4. ThemeProvider: cambia de tema sin recargar, persiste la elección, sincroniza theme-color.
5. Test automático de contraste: para cada tema, texto/fondo y bull/bear/fondo cumplen WCAG AA (calcular a partir de OKLCH). Ajustar los valores que no cumplan y anotarlo en DECISIONES.md.

Excluye: componentes y pantallas.
Aceptación: el test de contraste pasa para los 7 temas; cambiar de tema en una página de prueba actualiza todo; typecheck/lint/test/build en verde.
```

### 0.4 — Marca: logo, Bolsín y personajes
```
Lee CLAUDE.md, EXECUTION.md y DESIGN.md. Tarea 0.4.

Objetivo: identidad visual original en SVG.
Consulta: CLAUDE.md §5 (motivo de marca, mascota), §8b (personajes).
Depende de: 0.3.

Incluye:
1. Logo: curva del interés compuesto en trazo fino dorado + wordmark "Compuesto" en Instrument Serif. Versiones: completo, símbolo, icono de app 512/192/maskable, favicon.
2. Bolsín en SVG con 6 estados y animaciones de respiración y parpadeo (solo transform/opacity, reduced-motion respetado).
3. Avatares SVG simples de los 4 personajes.
Todo usa tokens del tema (cambia de color con el tema).

Excluye: pantallas.
Aceptación: los SVG se ven bien en los 7 temas (capturas Playwright de una página de prueba), ninguno se parece a un personaje o marca existente, iconos PWA generados a los tamaños exactos.
```

### 0.5 — Componentes base y /styleguide
```
Lee CLAUDE.md, EXECUTION.md y DESIGN.md. Tarea 0.5.

Objetivo: biblioteca de componentes base y una página /styleguide que los muestre todos.
Consulta: CLAUDE.md §5, §6, §10.
Depende de: 0.4.

Incluye: botón (todos sus estados), input, chip, bottom sheet (Vaul), toast (Sonner), tarjeta de ejercicio en sus 5 estados (inactivo, seleccionado, correcto, incorrecto, deshabilitado), hoja de feedback, barra de progreso, anillo con la curva compuesta, gráfico de velas de ejemplo con datos de semilla, las microinteracciones de ANIMACIONES.md §3 y las secuencias de §4 (subida de rango, ascensor, comité aprobado, cierre semanal, impresión de la tarjeta), transiciones entre pantallas de §5 con View Transitions y fallback. Selector de tema en /styleguide. /styleguide solo accesible en desarrollo.
Excluye: pantallas de producto.
Aceptación: teclado completo y foco visible en todos los componentes; axe sin errores en /styleguide; reduced-motion probado; capturas a 375/768/1440 px; npx impeccable detect src/ sin hallazgos (o excepciones justificadas).
```

### 0.6 — Prototipos y revisión de diseño 🛑
```
Lee CLAUDE.md, EXECUTION.md y DESIGN.md. Tarea 0.6.

Objetivo: elegir la dirección de las piezas clave y cerrar la revisión de diseño de la Fase 0.
Depende de: 0.5.

Incluye:
1. Con la skill prototype (o manualmente si no está disponible): 3 variantes de tarjeta de ejercicio, 3 de Home y 3 del Camino como edificio, con selector. Maquetas estáticas con datos de ejemplo marcados como tales.
2. 🛑 Detente y espera a que elija una variante de cada.
3. Tras mi elección: aplicar la elegida al styleguide, eliminar las otras, /impeccable critique + audit + polish sobre /styleguide.

Aceptación: elecciones registradas en DECISIONES.md; revisión de diseño sin problemas graves abiertos; detector limpio.
```

---

# FASE 1 — MVP jugable local (Niveles 0–1)

### 1.1 — Datos local-first
```
Lee CLAUDE.md, EXECUTION.md y FASES.md. Tarea 1.1.

Objetivo: capa de persistencia basada en eventos, versionada y probada.
Consulta: CLAUDE.md §3b.
Depende de: 0.1.

Incluye:
1. Esquema Dexie v1: events, proyecciones cacheadas (progress, stats, srs_cards), settings, content_reports. Migraciones con test.
2. Tipos de evento iniciales (lesson_started, exercise_answered, lesson_completed, unit_skipped, settings_changed…) validados con Zod.
3. Funciones puras de proyección en /src/engine: XP, racha (días en Europe/Madrid, congeladores), progreso por lección, rango/planta, objetivo diario.
4. Repositorio que añade eventos y actualiza proyecciones; reconstrucción completa desde eventos.
5. Exportar/importar progreso en JSON (con validación) y navigator.storage.persist().

Excluye: UI más allá de lo imprescindible para probar; sincronización.
Aceptación:
- Tests de proyección con casos límite: cambio de día a medianoche de Madrid, cambio de hora (marzo/octubre), racha con congelador, eventos duplicados (idempotencia), eventos desordenados.
- Reconstruir desde eventos da el mismo estado que las proyecciones cacheadas (test).
- Exportar → borrar → importar recupera exactamente el estado (test).
```

### 1.2 — Infraestructura de contenido
```
Lee CLAUDE.md, EXECUTION.md y docs/TEMARIO.md. Tarea 1.2.

Objetivo: el contenido se valida, se carga y se comprueba automáticamente.
Consulta: CLAUDE.md §9, TEMARIO §4, §6, §7, §8.
Depende de: 0.1.

Incluye:
1. Esquemas Zod de lección, ejercicio (los 19 tipos de TEMARIO §6, aunque la UI llegue después), glosario, test de salto, curriculum, companies y concepts (mapa de conceptos con prerrequisitos, TEMARIO §4).
2. content:validate: esquema, IDs únicos y estables, conceptos existentes y sin ciclos, ningún concepto usado antes de su nivel, mezcla ≥40 % producir y ≤40 % reconocer, 6–10 ejercicios por lección, distribución de Bloom por nivel, published exige reviewedBy humano, empresas solo del universo ficticio.
3. Test que evalúa el campo formula de cada numeric_input y lo compara con answer y tolerance.
4. content:check: lista lo que tiene verificarAntesDe vencido o próximo.
5. /content/shared/concepts.json con el **esqueleto de todos los niveles y ramas** (id, nombre y prerrequisitos) y el detalle completo de N0–N1.
6. /content/shared/companies.json con Naranjas del Turia y 4 empresas más, 5 años de cuentas. Tests: activo = pasivo + patrimonio cada año; el flujo de caja reconcilia la variación de caja; la PyG enlaza con el patrimonio.
7. Una lección de ejemplo válida y otra inválida (fixture de test) para probar el validador.

Excluye: contenido real de las unidades.
Aceptación: el validador rechaza la lección inválida con mensajes claros y acepta la válida; tests de companies.json en verde.
Parar si: no consigues cuentas coherentes de 5 años; propón simplificar a 3 años antes de seguir.
```

### 1.3 — Ejercicios de reconocer y producir básicos
```
Lee CLAUDE.md, EXECUTION.md y docs/TEMARIO.md. Tarea 1.3.

Objetivo: los 8 primeros tipos de ejercicio funcionan de punta a punta.
Consulta: TEMARIO §6, CLAUDE.md §6, §8, §10.
Depende de: 0.5, 1.2.

Incluye: corrección pura y testeada + componente para multiple_choice, multi_select, true_false_swipe (con botones alternativos), match_pairs, fill_blank, order_steps (arrastrar y alternativa de tocar/teclado), numeric_input (tolerancia, formato es/en de números: coma y punto), categorize (con alternativa sin arrastrar). Estados visuales de la tarjeta, hoja de feedback con explanation y wrongExplanations, háptica y sonidos opcionales.
Excluye: build_statement, spreadsheet, tipos 11–15, pantalla de lección completa.
Aceptación: cada tipo tiene tests de corrección (aciertos, fallos, entradas vacías, números con coma decimal); cada tipo se completa solo con teclado (test e2e); axe sin errores.
```

### 1.4 — Rebanada vertical: primera unidad real 🛑
```
Lee CLAUDE.md, EXECUTION.md y docs/TEMARIO.md. Tarea 1.4.

Objetivo: demostrar el producto completo en pequeño antes de producir más contenido.
Consulta: CLAUDE.md §7, §8, §8b; TEMARIO §2 (Nivel 0), §7, §8; ANIMACIONES §2–§3.
Depende de: 1.1, 1.2, 1.3.

Incluye:
1. Contenido de la Unidad 1 del Nivel 0 (interés compuesto), siguiendo el flujo de TEMARIO §8 hasta reviewed (incluido el subagente revisor), solo con los tipos 1–8.
2. Componente `<Explainer>` (ANIMACIONES.md §2: reproducir, arrastrar, pasos sincronizados, estado final estático, descripción textual) y los explicadores `CompoundCurve`, `InflationCart` y `Rule72` creados con la skill `nuevo-explicador`.
3. Pantalla de Lección completa: tarjetas de teoría con explicador interactivo, ejercicios, fallos que vuelven al final, Comprobar fijo abajo, personajes, Cierre de lección con XP y racha reales desde eventos.
4. Una Home mínima que permite empezar esa unidad (se rehará en 1.7).

Excluye: onboarding, tests de salto, camino completo.
Aceptación: se completa la unidad entera; los 3 explicadores se pueden arrastrar y tienen estado final estático con reduced-motion; al recargar se conservan XP y racha; e2e del flujo; capturas a 375 px de cada paso.
🛑 Para y espera mi revisión del contenido y de la experiencia de lección antes de seguir. Mis cambios se aplican aquí mismo y se registran en DECISIONES.md como reglas para el resto del contenido.
```

### 1.5 — build_statement y spreadsheet
```
Lee CLAUDE.md, EXECUTION.md y docs/TEMARIO.md. Tarea 1.5.

Objetivo: los dos ejercicios de producción avanzada.
Consulta: TEMARIO §6 (tipos 9 y 10), CLAUDE.md §3 (evaluador propio).
Depende de: 1.3, 1.4.

Incluye:
1. Evaluador de fórmulas propio en /src/engine: + − × ÷ ^, paréntesis, referencias de celda, SUMA, PROMEDIO, VNA, TIR, SI; nombres de funciones en español e inglés; separador de argumentos ; y ,. Errores claros (#REF!, #DIV/0!, fórmula inválida).
2. Corrección de spreadsheet por resultado (no por texto exacto de la fórmula).
3. build_statement: rellenar huecos de balance, PyG o flujo de caja con comprobación de que cuadra.
4. Componentes accesibles (teclado, lector de pantalla, móvil).
Aceptación: el evaluador pasa una batería de tests que incluye VNA y TIR comparados con valores calculados de referencia (con tolerancia), casos de error y TIR sin solución; e2e de cada ejercicio.
Parar si: TIR no converge de forma fiable; propone el método numérico alternativo antes de seguir.
```

### 1.6 — Onboarding y tests de salto
```
Lee CLAUDE.md, EXECUTION.md y docs/TEMARIO.md. Tarea 1.6.

Objetivo: entrar a aprender en menos de 60 s y poder saltarse lo que ya se domina.
Consulta: CLAUDE.md §2.10, §8b; TEMARIO §5.
Depende de: 1.1, 1.3.

Incluye:
1. Onboarding de 3 pantallas: carta de bienvenida de Albufera Partners, minutos al día, ticker personal → primera lección.
2. Test de salto por unidad (8 preguntas; ≥80 % marca la unidad como dominada) con algoritmo puro y testeado; banco de preguntas de las unidades de N0–N1 con el flujo de TEMARIO §8.
3. "Saltar nivel completo": encadena los tests de salto de todas sus unidades.

Aceptación: e2e de onboarding hasta empezar la primera lección en < 60 s; tests del algoritmo; una unidad saltada queda marcada y sus conceptos cuentan como vistos para el repaso.
🛑 Revisa las preguntas de salto antes de marcarlas published.
```

### 1.7 — Pantallas principales
```
Lee CLAUDE.md, EXECUTION.md y FASES.md. Tarea 1.7.

Objetivo: navegación completa de la app con datos reales.
Consulta: CLAUDE.md §5–§8b, §9 (reportar error), §10.
Depende de: 1.4, 1.6.

Incluye (antes de cada pantalla /impeccable shape; al terminar critique + audit + polish): navegación de 5 pestañas (CLAUDE.md §2.11), Home (ticker, Abrir mercado lleva a la siguiente lección hasta que exista la sesión en 2.2, racha, anillo), Camino como edificio con plantas y ascensor, Cierre, Despacho básico, Glosario en bottom sheet (términos subrayados en lecciones), Ajustes (tema, sonido, háptica, recordatorio .ics, exportar/importar/borrar datos, panel de diagnóstico con el registro de errores), aviso breve de "contenido educativo, no asesoramiento", botón Reportar error (lista local exportable).
Excluye: elementos de fases posteriores (rivales, juegos, tu acción): no se muestran o se marcan como "Próximamente".
Aceptación: ningún botón sin acción (test e2e que recorre todos los controles visibles); estados vacío/error/offline en cada pantalla; capturas a 375/768/1440 px.
```

### 1.8 — PWA, offline y protección del progreso
```
Lee CLAUDE.md, EXECUTION.md y FASES.md. Tarea 1.8.

Objetivo: instalable, offline de verdad y sin riesgo de perder el progreso.
Consulta: CLAUDE.md §2.5, §3b.
Depende de: 1.7.

Incluye: service worker con precache de la app y del nivel actual y el siguiente (el resto bajo demanda, con botón "descargar todo para offline"); aviso de nueva versión sin recargar a mitad de lección; versión mínima forzada e interruptor de emergencia del SW; manifest con iconos de 0.4 y theme-color por tema; tutorial de instalación en iOS y aviso de que Safari puede borrar datos si no se instala; navigator.storage.persist(); recordatorio semanal de exportar copia; i18n con todos los textos en es.json (test que comprueba que no hay textos fijos en componentes).

Aceptación: e2e en modo offline completa una lección tras la primera carga; e2e de actualización de versión; la app se instala en Chrome Android y Safari iOS (capturas o "no verificado" con motivo); manifest validado.
```

### 1.9 — Contenido Niveles 0 y 1 (bucle por unidad) 🛑
```
Lee CLAUDE.md, EXECUTION.md y docs/TEMARIO.md. Tarea 1.9 — Unidad [X] del Nivel [Y].

Objetivo: producir una unidad más del Nivel 0 o 1 con la calidad validada en 1.4.
Consulta: TEMARIO §1–§2, §4, §6–§8; reglas de contenido añadidas a DECISIONES.md en 1.4.
Depende de: 1.4, 1.5.

Usa la skill `crear-unidad`.
Incluye: los explicadores de la unidad que aún no existan (ANIMACIONES.md §2, con `nuevo-explicador`); lecciones de la unidad (6–10 ejercicios, mezcla y Bloom correctos según TEMARIO §6, conceptos declarados en concepts.json, hilos transversales (incluido el documento real del nivel), caso hilo, explicadores visuales, Jefe final, test de salto y tarjeta "Dónde verás esto"), con fuente para cada dato no trivial; glosario actualizado; content:validate; subagente revisor; correcciones; status reviewed.
Excluye: otras unidades. Una unidad por conversación.
Aceptación: content:validate y tests de fórmulas en verde; informe del subagente sin errores abiertos; la unidad se juega entera en la app.
🛑 Revisión de Javier (contrastando con fuentes y apuntes) antes de published.
```

### 1.10 — Cierre de la Fase 1
```
Lee CLAUDE.md, EXECUTION.md y FASES.md. Tarea 1.10.

Objetivo: endurecer todo lo construido en la Fase 1.
Depende de: 1.1–1.9.

Incluye: review-animations, mobile-native, break-ui (nombres de 1 y 40 caracteres, rachas 0 y 999, textos largos en inglés, sin conexión, almacenamiento lleno) e /impeccable harden en todas las pantallas; corregir lo que salga.
Aceptación: flujo completo (onboarding → 3 lecciones offline → recarga → progreso intacto) en e2e; Lighthouse ≥ 90 en las 4 categorías en móvil; axe sin errores; detector limpio. Lista de deuda pendiente en el informe.
```

---

# FASE 2 — Sesión diaria, repaso, juegos, rivales y estadísticas

### 2.1 — Repaso espaciado y Practicar
```
Lee CLAUDE.md, EXECUTION.md y FASES.md. Tarea 2.1.

Objetivo: los fallos vuelven cuando toca.
Consulta: CLAUDE.md §3b, §8.
Depende de: 1.10.

Incluye: integración de ts-fsrs como proyección de eventos (tarjetas por ejercicio y conceptos), dominio por concepto y refuerzo de prerrequisitos débiles (TEMARIO §4), máx. 15 tarjetas por sesión, intercalado, archivado de tarjetas de ejercicios retirados; pestaña Practicar (por tema, examen cronometrado, mis errores).
Aceptación: tests con reloj simulado: un fallo hoy reaparece en los días previstos; fallar repetidamente un concepto programa repaso de sus prerrequisitos; reconstruir desde eventos da las mismas tarjetas; e2e de Practicar.
```

### 2.2 — Sesión "Abrir mercado"
```
Lee CLAUDE.md, EXECUTION.md y FASES.md. Tarea 2.2.

Objetivo: el bucle diario de ~20 minutos.
Consulta: CLAUDE.md §7, §8b.
Depende de: 2.1.

Incluye: misiones diarias (3 por día, calculadas desde eventos); orquestador puro y testeado que monta la sesión (Briefing, Due diligence, Lección 1, Minijuego, Lección 2, Reto del día; Encargo del jefe una vez por semana; Cierre) según el tiempo elegido y el estado del usuario; "Objetivo cumplido" sin presionar; reanudar una sesión interrumpida. Mientras no haya juegos (2.5) el bloque Minijuego se sustituye por una lección de repaso, sin huecos.
Aceptación: tests del orquestador para 5, 10, 15 y 20 minutos y para usuario nuevo / con repasos vencidos / sin contenido nuevo; e2e de una sesión completa y de una sesión reanudada.
```

### 2.3 — Ejercicios de aplicar y argumentar
```
Lee CLAUDE.md, EXECUTION.md y docs/TEMARIO.md. Tarea 2.3.

Objetivo: chart_read, scenario, spot_the_error, slider_estimate, case_step, document_read, best_argument y self_explain (TEMARIO §6).
Depende de: 1.3, 2.2.

Incluye: corrección pura y testeada + componentes accesibles; chart_read con generador de series con semilla (determinista) y descripción textual del gráfico; case_step con estado entre pasos y reanudación; document_read con fragmento, fuente y fecha visibles; self_explain con respuesta modelo y rúbrica de autoevaluación (da XP reducido para no premiar autoevaluarse siempre bien). Añadir estos tipos a lecciones existentes de N0–N1 donde mejoren la mezcla (pasando de nuevo por revisión).
Aceptación: tests de cada tipo; la misma semilla da el mismo gráfico; e2e con teclado.
```

### 2.4 — Kit de game feel y motor de mercados
```
Lee CLAUDE.md, EXECUTION.md y docs/JUEGOS.md. Tarea 2.4.

Objetivo: la base técnica y sensorial que comparten todos los juegos.
Consulta: JUEGOS.md §1–§3, CLAUDE.md §6.
Depende de: 2.2.

Incluye:
1. Kit de game feel en /src/features/games/kit, aplicando las skills `game-feel` y la de juegos de animation-principles, con todas las piezas de JUEGOS.md §2 y las reglas de ANIMACIONES.md §6 (pop de número, combo, hit-stop, sacudida, partículas en Canvas, contadores, brillo, anticipación, ticker de fondo, sonido, háptica, pantalla de resultado con rating AAA–B), usando las skills animate, emil-design-eng y apple-design.
2. Estructura común de partida (entrada a modo terminal, tutorial jugable con mano animada, dificultad creciente, final, creación de tarjetas de repaso por concepto).
3. Benchmark Canvas 2D vs PixiJS con 500 elementos animados; decisión en DECISIONES.md.
4. Motor de mercados sintéticos en /src/engine (browniano geométrico + saltos + regímenes, determinista por semilla, con tests estadísticos básicos).
5. Página /games-lab (solo desarrollo) que muestra cada pieza del kit por separado.

Aceptación: cada pieza del kit en /games-lab a 60 fps con CPU ralentizada 4× (traza adjunta); reduced-motion probado en todas; tests del motor; review-animations sin hallazgos graves.
```

### 2.5 — Juegos 1, 2 (versión presupuesto), 3, 4 y 10
```
Lee CLAUDE.md, EXECUTION.md y docs/JUEGOS.md. Tarea 2.5.

Objetivo: los primeros juegos, con el game feel completo.
Consulta: JUEGOS.md §4 (fichas de cada juego) y §5.
Depende de: 2.4.

Usa la skill `nuevo-juego` para cada uno.
Incluye: Campana de apertura, Cuadra tu presupuesto (versión N0 de Cuadra el balance), Mesa de órdenes, ¿Sube o baja? y La magia del compuesto, cada uno según su ficha (núcleo, visual y juice); integración en la sesión diaria solo si los conceptos del juego ya se han visto (JUEGOS.md §6); partida del día con semilla diaria para comparar con tus récords.
Aceptación: criterios de JUEGOS.md §5 para cada juego (incluido el test de que jugar al azar da ≤ B); e2e con teclado.
🛑 Prueba los 5 juegos en tu móvil y da el visto bueno o cambios antes de seguir.
```

### 2.6 — El trader impulsivo, tu acción y tarjeta compartible
```
Lee CLAUDE.md, EXECUTION.md y docs/JUEGOS.md. Tarea 2.6.

Objetivo: el larp visible y compartible.
Consulta: CLAUDE.md §7.
Depende de: 2.5.

Incluye: El trader impulsivo (JUEGOS.md §4); tu acción personal con la fórmula de CLAUDE.md §7 (pura, testeada, proyección de eventos) y velas en Home y Despacho; tarjeta compartible 1080×1920 y 1080×1080 con 3 estilos (html-to-image), Web Share API en móvil y descarga en escritorio, solo XP y nunca dinero; /impeccable delight y find-animation-opportunities en Cierre, subida de rango, ascensor y tarjeta.
Aceptación: tests de la fórmula de tu acción; la tarjeta se genera offline con las fuentes correctas en Chrome, Safari y Firefox (capturas); medidas exactas comprobadas.
```

### 2.7 — Rivales simulados y estadísticas personales
```
Lee CLAUDE.md, EXECUTION.md y FASES.md. Tarea 2.7.

Objetivo: la tensión competitiva de una liga y datos para mejorar tu estudio, sin servidor.
Consulta: CLAUDE.md §3b (rivales simulados), §11.
Depende de: 2.2.

Incluye:
1. Rivales simulados: 6–10 becarios ficticios de Albufera Partners con personalidad y ritmo de XP generado por semilla, que se ajusta a tu media para que la semana sea disputada; divisiones Bronce → Wall Street; cierre semanal (lunes 00:00 en tu zona horaria) con ascenso o descenso; "tu yo de la semana pasada" como rival fijo. Pantalla Rivales con animación de clasificación.
2. Estadísticas personales en Despacho (CLAUDE.md §11), exportables a CSV.
3. Registro local de errores de la app y panel de diagnóstico en Ajustes.

Aceptación: tests del motor de rivales (determinista por semilla, nunca imposible ni trivial de ganar con un ritmo normal); estadísticas calculadas desde eventos con tests; e2e de un cierre semanal simulado.
```

### 2.8 — Cierre de la Fase 2 y despliegue personal
```
Lee CLAUDE.md, EXECUTION.md y FASES.md. Tarea 2.8.

Objetivo: dejar la app desplegada para usarla a diario en el móvil.
Depende de: 2.1–2.7 y Niveles 0–1 publicados (1.9).

Incluye: review-animations, animation-performance, break-ui e /impeccable harden de lo nuevo; despliegue en Cloudflare Pages (cabeceras de seguridad, caché del service worker, URL no indexada: robots y noindex); checklist: exportar copia funciona, instalación en el móvil hecha, recordatorio .ics añadido.
Aceptación: build de producción desplegada; Lighthouse ≥ 90 en móvil; e2e completo en verde; checklist marcada.
Parar si: necesitas acceso a mi cuenta de Cloudflare: dame los pasos para hacerlo yo.
```

# 🧪 PRUEBA PERSONAL

### P.1 — Cuatro semanas de uso real (tú)
Usa la app a diario durante 4 semanas con los Niveles 0–1. Apunta lo que te aburre, lo que te cuesta, los errores de contenido (botón Reportar) y si de verdad aprendes (compara con lo que ves en clase). Al final exporta las estadísticas personales (CSV) y la lista de reportes.

### P.2 — Iteración
```
Lee CLAUDE.md, EXECUTION.md y FASES.md. Tarea P.2.

Datos de mis 4 semanas: [pega el CSV de estadísticas, la lista de reportes y tus notas].
Objetivo: aplicar las mejoras de mayor impacto antes de seguir.
Incluye: análisis priorizado (impacto/esfuerzo) de contenido, sesión, juegos y diseño; 🛑 espera mi aprobación de la lista; aplicar lo aprobado; corregir con el subagente los ejercicios reportados; registrar en DECISIONES.md qué cambia en las reglas de contenido para los niveles siguientes.
Aceptación: cada cambio aplicado tiene su verificación; reglas de contenido actualizadas.
```

# FASE 3 — Sincronización entre tus dispositivos (opcional)

> Solo si usas la app en más de un dispositivo o quieres copia en la nube. Si no, sáltala: la exportación JSON ya protege el progreso.

### 3.1 — Supabase personal
```
Lee CLAUDE.md, EXECUTION.md y FASES.md. Tarea 3.1.
Objetivo: un backend mínimo y seguro solo para Javier.
Consulta: CLAUDE.md §2.3, §3, §3b.
Depende de: P.2.
Incluye: proyecto Supabase en región UE; un único usuario con email y contraseña; alta pública desactivada; tabla events (solo inserción y lectura de lo propio, RLS) con límite de tamaño por evento; migraciones SQL versionadas en el repo; tests de RLS con Supabase CLI en local (otro usuario no puede leer ni escribir); backup semanal con GitHub Action (pg_dump cifrado, porque el plan Free no incluye backups).
Aceptación: tests de RLS en verde; backup de prueba restaurado en local.
Parar si: necesitas crear el proyecto o el usuario: pídemelo y pásame las claves por variables de entorno (nunca en el repo).
```

### 3.2 — Sincronización de eventos
```
Lee CLAUDE.md, EXECUTION.md y FASES.md. Tarea 3.2.
Consulta: CLAUDE.md §3b.
Depende de: 3.1.
Incluye: iniciar sesión una vez por dispositivo; subida y bajada de eventos por id (idempotente, por lotes, con reintentos y offline); recálculo de proyecciones; indicador de estado; la app sigue funcionando si Supabase está pausado o caído y sincroniza al volver.
Aceptación: tests de fusión con dos dispositivos con eventos distintos y solapados (mismo estado final); subir dos veces el mismo lote no duplica nada; e2e con dos contextos de navegador; e2e con Supabase caído.
```

### 3.3 — Notificaciones push (opcional)
```
Lee CLAUDE.md, EXECUTION.md y FASES.md. Tarea 3.3.
Consulta: CLAUDE.md §12.
Depende de: 3.1.
Incluye: Web Push con VAPID a tus dispositivos (suscripción en Supabase, envío programado con pg_cron o función programada, máx. 1 al día, hora configurable).
Aceptación: push recibido en tu Android o en tu iPhone con la app instalada (captura o "no verificado" con motivo).
```

---

# FASE 4 — Contenido completo y estatus

### 4.1 — Contenido Niveles 2–9 y Planta 10 del troncal (bucle por unidad) 🛑
```
Lee CLAUDE.md, EXECUTION.md y docs/TEMARIO.md. Tarea 4.1 — Unidad [X] del Nivel [Y].
Objetivo, alcance y aceptación iguales que en 1.9, aplicando además las reglas de contenido actualizadas tras la prueba personal (DECISIONES.md). Una unidad por conversación. Prioridad: seguir el orden del temario, adelantando las unidades que coincidan con lo que estás dando en la carrera ese cuatrimestre.
🛑 Revisión de Javier (contrastando con fuentes y apuntes) antes de published.
```

### 4.2 — Jefes, encargos, comités y certificados
```
Lee CLAUDE.md, EXECUTION.md y docs/TEMARIO.md. Tarea 4.2.
Depende de: unidades del nivel correspondiente en reviewed.
Incluye: Jefes finales y Encargos del jefe que falten, Comités de inversión por nivel, examen de la Planta 10; certificado PDF generado en local con diseño de diploma ("No es un título oficial").
Aceptación: content:validate en verde; el PDF se genera offline con fuentes correctas (captura).
```

### 4.3 — Juegos 5–9 y 12–14
```
Lee CLAUDE.md, EXECUTION.md y docs/JUEGOS.md. Tarea 4.3.
Depende de: 2.5.
Incluye: Gestor por un año, Máquina del tiempo (curvas históricas aproximadas en JSON, marcadas como aproximadas), Constructor de payoff, DCF Express (con companies.json), Caza el chiringuito, Stress test, Curva de tipos y Ciclo de caja, cada uno según su ficha de JUEGOS.md §4.
Aceptación: criterios de JUEGOS.md §5; tests de la lógica financiera de cada juego (payoffs, DCF, métricas de cartera, precios de bonos, ciclo de caja) contra valores calculados de referencia.
🛑 Visto bueno en móvil de cada juego.
```

### 4.4 — Estatus: temas, insignias, estadísticas, despacho
```
Lee CLAUDE.md, EXECUTION.md y FASES.md. Tarea 4.4.
Depende de: 0.3, 2.5.
Incluye: los 5 temas desbloqueables ligados a rangos con vista previa bloqueada; insignias; estadísticas tipo terminal ampliadas (radar por área, precisión, calendario); Cartera de conocimiento como constelación de conceptos que se ilumina al dominarlos; Despacho completo con skyline por planta.
Aceptación: test de contraste de los temas en verde; desbloqueos calculados desde eventos (tests).
```

### 4.5 — Cierre de la Fase 4
```
Lee CLAUDE.md, EXECUTION.md y FASES.md. Tarea 4.5.
Depende de: 4.1–4.4.
Incluye: content:validate y content:check del temario completo; carga perezosa del contenido por nivel; break-ui y harden de lo nuevo.
Aceptación: los 365 días disponibles en published; content:validate sin errores; tamaño de descarga inicial dentro del presupuesto anotado en DECISIONES.md.
```

---

# FASE 5 — Pulido del año troncal

### 5.1 — Pulido global
```
Lee CLAUDE.md, EXECUTION.md y FASES.md. Tarea 5.1.
Incluye: /impeccable polish y delight, improve-animations (aplicar su plan priorizado), break-ui y harden en todas las pantallas.
Aceptación: sin hallazgos graves abiertos; detector limpio; axe sin errores.
```

### 5.2 — Plantillas de la tarjeta compartible
```
Lee CLAUDE.md, EXECUTION.md y FASES.md. Tarea 5.2.
Incluye: con banner-design, 3 direcciones de arte para la tarjeta compartible (story 1080×1920 y post 1080×1080) con los tokens de CLAUDE.md; integrarlas como estilos seleccionables.
Aceptación: medidas exactas; contraste ≥ 4,5:1; generación offline.
```

### 5.3 — CI final y mantenimiento
```
Lee CLAUDE.md, EXECUTION.md y FASES.md. Tarea 5.3.
Incluye: CI completa (typecheck, lint, test, content:validate, e2e, detector, Lighthouse); content:check programado mensualmente en GitHub Actions (abre un issue con lo que ha caducado); guía MANTENIMIENTO.md (cómo añadir una unidad, corregir un reporte, actualizar dependencias, restaurar una copia).
Aceptación: CI en verde; el job de content:check abre un issue de prueba.
```

---

# FASE 6 — Itinerario Pro

> Orden por tu objetivo: **Investment Banking → Equity Research y Buy-side → Private Equity y VC → Banca y riesgos → Mercados → Fintech**. Cada rama puede empezarse en cuanto su nivel de desbloqueo esté publicado (Investment Banking y Equity Research se abren con N3, así que pueden empezar antes de terminar el troncal).

### 6.1 — Infraestructura de ramas
```
Lee CLAUDE.md, EXECUTION.md y docs/TEMARIO.md. Tarea 6.1.
Objetivo: soportar ramas en el producto.
Consulta: TEMARIO §1, §3, §6 (tipo code).
Depende de: 5.3 (o antes, si el nivel de desbloqueo de la rama ya está publicado).
Incluye: estructura /content/{lang}/tracks/…, desbloqueo por nivel aprobado, selector de rama en el Camino (cada rama como un ala del edificio de Albufera Partners con su propia estética dentro del tema activo), progreso por rama, Comité y certificado de rama; ejercicio code con Pyodide cargado de forma perezosa (solo al entrar en la rama Fintech), tests ocultos ejecutados en un Web Worker con límite de tiempo.
Aceptación: una rama vacía de prueba se desbloquea y se recorre; Pyodide no aumenta la descarga inicial (comprobado en el informe de build); un bucle infinito en un ejercicio code se corta sin colgar la app (test).
```

### 6.2 — Contenido de una rama (bucle por unidad) 🛑
```
Lee CLAUDE.md, EXECUTION.md y docs/TEMARIO.md. Tarea 6.2 — Rama [nombre], unidad [X].
Igual que 1.9, con el temario de TEMARIO §3 y §3b, el caso hilo propio de la rama y conceptos nuevos añadidos a concepts.json con sus prerrequisitos del troncal. Una unidad por conversación.
Además: (1) antes de escribir ejercicios, generar con `modelo-referencia` y la skill de financial-services del entregable de la unidad el **modelo de referencia** sobre una empresa ficticia, y comprobar sus cifras con tests; (2) usar los formatos Pro (modelo por piezas, deal room, pitch al comité); (3) marcar con `interview: true` las preguntas aptas para Superday; (4) campo `cfa` y referencia bibliográfica concreta en `sources`.
🛑 Revisión de Javier (contrastando con fuentes y apuntes) antes de published.
```

### 6.3 — Juegos de ramas
```
Lee CLAUDE.md, EXECUTION.md y docs/JUEGOS.md. Tarea 6.3 — Juego [Superday | Subasta de venta | Sala de M&A | Comité de riesgos | Market maker | La trampa del backtest].
Depende de: 6.1 y la rama correspondiente con al menos 2 unidades publicadas.
Incluye: el juego según su ficha de JUEGOS.md §4, integrado en la sesión cuando el usuario está en esa rama.
Aceptación: criterios de JUEGOS.md §5 y tests de su lógica financiera.
🛑 Visto bueno en móvil.
```

### 6.4 — Cierre de cada rama
```
Lee CLAUDE.md, EXECUTION.md y FASES.md. Tarea 6.4 — Rama [nombre].
Incluye: Comité final de la rama, certificado, insignia y tema visual de ala; break-ui, harden y critique de lo nuevo; sin landing (uso personal).
Aceptación: rama completa en published; content:validate sin errores; e2e de recorrer la rama de principio a fin.
```
