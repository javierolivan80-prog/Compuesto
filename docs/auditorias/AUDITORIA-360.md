# AUDITORÍA 360 — Compuesto (14/10/2026)

**Documentos auditados:** CLAUDE.md, EXECUTION.md, FASES.md, docs/TEMARIO.md, docs/JUEGOS.md, AUDITORIA.md (versión del 13/10).
**Comprobado fuera de los documentos:** límites del plan Free de Supabase y de su correo por defecto (documentación oficial, 14/10/2026), competencia (búsqueda web).
**[SUPUESTO]** = deducción mía, no está en los documentos.

---

## FASE 1 — Qué es la app

Compuesto es una PWA gratuita, en español de España e inglés, que enseña finanzas "como Duolingo": lecciones de 3–5 min, 18 minijuegos, rachas, ligas y repaso espaciado. Lleva de cero hasta el nivel de conocimientos de un analista junior: un año troncal de 10 niveles y 4 ramas de especialización.

- **Para quién:** quien empieza de cero, estudiantes de ADE/Finanzas y estudiantes de máster.
- **Propuesta de valor:** 20 min al día, gratis, contenido español (CNMV, fiscalidad, IBEX) y estética "Old Money × Trading Terminal" con larp de banco (Becario → Leyenda).
- **Stack:** React 19, Vite, TypeScript 6.0, Tailwind v4, Dexie (local-first con registro de eventos), Supabase Free opcional, Cloudflare Pages, contenido estático en JSON y coste de API cero.

**Muy bien definido:** producto, diseño, pedagogía, temario, juegos, arquitectura local, proceso de construcción y calidad.

**Sin definir:**
- Modelo de negocio y sostenibilidad.
- Operación: monitorización, backups, correo, entornos.
- Consentimiento de la analítica.
- Zona horaria de usuarios no españoles.
- Capacidad real de producir unos 9.000 ejercicios.
- Navegación principal.
- Términos legales.

---

## FASE 2 — Auditoría por áreas

### 1. Funcionalidad
- **Bien:**
  - Flujo de lección completo, con fallos que vuelven al final.
  - Sesión diaria.
  - Repaso por concepto.
  - Reportar error.
  - Exportar e importar progreso.
  - Estados vacío, error y offline exigidos.
- **Falta:**
  - Buscador de lecciones y glosario.
  - "Explícamelo de otra forma" (segunda explicación más simple).
  - Modo repaso antes de un examen.
  - Reiniciar o repetir una unidad.
  - Gestión del cambio de dispositivo sin cuenta (solo hay JSON manual).
  - Qué pasa con la racha si el usuario viaja o cambia de zona horaria.
  - Qué pasa si una lección se retira mientras alguien la está haciendo.
- **Casos límite sin cubrir:**
  - Contenido inglés incompleto: el primer prompt mostraba el español con aviso, pero en la v4 se perdió.
  - Ramas a medias.
  - Usuario que cambia de idioma a mitad de una unidad.
  - Test de nivel abandonado a la mitad.

### 2. UX/UI
- **Bien:** dirección visual muy concreta, motion especificado, accesibilidad AA, alternativas a los gestos, temas como recompensa.
- **Falta / riesgo:**
  - **Onboarding demasiado largo antes de aportar valor:** idioma, objetivo, minutos, ticker, carta, edad y un test de unos 8 min. Duolingo te mete en una lección en menos de un minuto. Esto mata la conversión.
  - **Navegación sin definir:** hay al menos 8 destinos (Home, Camino, Practicar, Juegos, Ligas, Despacho, Glosario, Ajustes) y en móvil solo caben 4–5 pestañas. Una IA de código improvisará.
  - **Vocabulario larp que confunde a quien empieza:** "Due diligence", "Comité de inversión", "Cartera de conocimiento". Necesita una etiqueta clara al lado ("Due diligence · Repaso").
  - **Siete temas** antes de validar que la gente usa uno.
  - **Sin pruebas de usabilidad** con personas reales antes de la beta (está como opcional en AUDITORIA.md).

### 3. Seguridad
- **Bien:** RLS, eventos solo de inserción, XP de liga calculado en el servidor, claves fuera del repo, `npm audit`.
- **Falta:**
  - **Límite de escritura por usuario.** Cualquiera con cuenta puede insertar millones de eventos y llenar la base de datos. RLS no limita volumen.
  - **CAPTCHA** (Cloudflare Turnstile, gratis) en el alta y el email mágico, contra abuso.
  - **Definición del rol administrador** (cómo se asigna y cómo se protege la cola de reportes).
  - **Filtro de nombres en el servidor.** El filtro local se salta.
  - **Respuestas en el cliente.** Todas viajan en el JSON, así que hacer trampa en la liga es trivial. Los topes de XP lo acotan, pero conviene asumirlo explícitamente.
  - **Cabeceras de seguridad concretas** (CSP compatible con Pyodide y el service worker).

### 4. Datos y privacidad
- **Bien:** datos mínimos, autodeclaración de edad, exportar y borrar, analítica sin cookies.
- **Falta / riesgo:**
  - **Consentimiento de la analítica.** El plan guarda un "id aleatorio por instalación" para medir retención. Guardar un identificador en el dispositivo con fines analíticos requiere consentimiento según el art. 22.2 de la LSSI y la guía de la AEPD, aunque no sea una cookie. Ahora mismo es un interruptor de desactivar (opt-out); tiene que ser de activar (opt-in), o no guardar ningún id.
  - **Región de Supabase en la UE** y contratos de encargado del tratamiento (Supabase, Umami, Sentry) sin especificar.
  - **Menores de 14 a 17 en ligas públicas.** Sus nombres son visibles para desconocidos. Por defecto deberían usar seudónimo.
  - **Registro de actividades de tratamiento:** no aparece. Es simple, pero existe la obligación.
  - **La edad en el onboarding** se pide a todos, también a quien nunca creará cuenta. Pídela solo al crear la cuenta.

### 5. Rendimiento y escalabilidad (100× usuarios)
- **Lo que aguanta:** el hosting estático (Cloudflare no cobra por ancho de banda) y el cálculo en el cliente (sin API de IA, sin coste por usuario).
- **Lo que se rompe:**
  - **La base de datos se llena.** El plan Free de Supabase da 500 MB. Si se sube *cada* respuesta como evento (unos 50 al día por usuario activo, unos 300 bytes cada uno), son unos 15 KB por usuario y día. Con 1.000 usuarios activos, la base se llena en un mes [SUPUESTO: cálculo propio]. **Este es el hallazgo técnico más grave.**
  - **El correo.** El servicio de correo por defecto de Supabase solo envía a miembros del equipo del proyecto y a 2 mensajes por hora. El login por email mágico no funciona para nadie más sin un SMTP propio (comprobado en la documentación oficial).
  - **Umami Cloud gratis** tiene un tope de eventos al mes [SUPUESTO: verificar la cifra exacta]. Con 10 eventos por usuario y día, se queda corto con unos cientos de usuarios.
  - **Egress de 5 GB al mes** en Supabase, con consultas de ligas mal hechas.
  - **Descarga inicial.** Precachear todo el contenido (más de 1.000 lecciones × 2 idiomas, más Pyodide) en móvil con datos es mucho.

### 6. Calidad técnica
- **Bien:** lógica pura testeada, registro de eventos, versiones fijadas, CI, protocolo de verificación, puntos 🛑.
- **Falta:**
  - **Monitorización de errores** (Sentry tiene plan gratuito). Hoy, si la app falla en el móvil de alguien, nunca te enterarás.
  - **Entornos definidos:** local, preview y producción, con un Supabase separado para pruebas.
  - **Logs del servidor:** Supabase Free guarda 1 día.
  - **CLAUDE.md demasiado largo** (unas 240 líneas que se cargan en cada sesión). Consume contexto y el diseño compite con las reglas. El detalle visual debería ir a DESIGN.md.
- **Deuda probable:**
  - Proyecciones de eventos sin snapshots: recalcular todo crecerá con los años de uso.
  - Siete temas por mantener.
  - El evaluador de fórmulas propio.

### 7. Fiabilidad
- **Bien:** local-first, así que si cae Supabase o Cloudflare la app sigue funcionando una vez cargada.
- **Riesgos:**
  - **Sin backups.** El plan Free de Supabase no incluye copias automáticas. Si se corrompe o se borra algo, se pierden cuentas y ligas.
  - **Pausa a la semana de inactividad.** Afecta sobre todo al entorno de pruebas y a la beta en vacaciones.
  - **Un service worker con un bug puede "brickear" la app**: el usuario queda atrapado en una versión rota. Hace falta un mecanismo de autodestrucción o de forzar la actualización.
  - **Safari borra los datos locales.** Tras 7 días sin visitar la web, iOS puede borrar IndexedDB si la app no está instalada en la pantalla de inicio. Quien sea local-first y descanse una semana lo pierde todo. `persist()` no lo garantiza en Safari.

### 8. Negocio y monetización
- **Estado:** no hay modelo. "Gratis y coste cero" está bien para el usuario, pero nada cubre:
  - **Tus horas:** producir y revisar es el coste real.
  - **El crecimiento:** Supabase Pro cuesta 25 $ al mes cuando se supera el plan Free.
  - **El plan de Claude** con el que construyes y generas el contenido [SUPUESTO].
- **Dinero sobre la mesa, sin romper "gratis para el alumno":**
  1. **Modo clase para institutos, academias y universidades.** Panel de profesor de pago o patrocinado. Es también el mejor canal de crecimiento.
  2. **Patrocinio institucional o fundaciones** de educación financiera, y premios del Plan de Educación Financiera (CNMV y Banco de España).
  3. **Certificado verificable de pago.** El aprendizaje sigue siendo gratis.
  4. **Donaciones o "socio"** con temas cosméticos.
- **Evitar:** afiliación a brókers. Rompe la neutralidad y el aviso de "no asesoramiento".

### 9. Retención y crecimiento
- **Bien:** racha, ligas, objetivo diario, tarjeta compartible, caso hilo, temas desbloqueables.
- **Falta:**
  - **Recordatorios para quien no tiene cuenta.** El push solo existe con cuenta, y la app es local-first, así que la mayoría de usuarios nunca recibirá un recordatorio. Es el mayor agujero de retención.
  - **Amigos y seguir a gente:** solo hay ligas con desconocidos.
  - **Referidos** ("invita a un compañero de clase").
  - **Misiones diarias o semanales.**
  - **Recuperar la racha.**
  - **Email semanal de progreso**, que requiere SMTP propio.
  - **Un evento para lanzar:** el Día de la Educación Financiera, a principios de octubre [SUPUESTO: verificar la fecha exacta].
  - **Objetivos de retención concretos para la beta** (cifras para decidir si seguir o pivotar).

### 10. Legal y confianza
- **Bien:** aviso de no asesoramiento, empresas ficticias, honestidad de la promesa, certificados "no oficiales", menores de 14 sin cuenta.
- **Falta:**
  - **Aviso legal LSSI** con titular y contacto.
  - **Términos de uso:** conducta en ligas, suspensión de cuentas, licencia del contenido.
  - **Política de almacenamiento local y analítica** (consentimiento).
  - **Licencia del contenido.** El contenido es tu activo y es público en JSON.
  - **Derecho de cita** para los fragmentos de `document_read`: fragmento breve, fuente y finalidad docente.
  - **Aviso específico en fiscalidad:** "la normativa cambia; consulta a un asesor".
  - **Comprobar la marca "Compuesto" en la OEPM y la EUIPO**, y el dominio. Está pendiente desde el principio.
  - **Uso nominativo de marcas** de terceros (IBEX 35 es de BME).

### 11. Competencia

| App | Qué hace mejor | Hueco que deja |
|---|---|---|
| **Zogo** (EE. UU.) | Gamificación con recompensas reales, distribución mediante bancos y cooperativas de crédito | Solo en inglés y para EE. UU.; nivel básico (finanzas personales) |
| **Finimize** | Noticias diarias de mercado en formato corto, comunidad | No es un itinerario; es actualidad de pago |
| **Bloomberg Market Concepts** | Marca y certificado reconocidos por empleadores, contenido de mercados serio | De pago (unos 150 $ para estudiantes, cifra no oficial), de 8 a 12 h, sin gamificación ni hábito |
| **Investopedia** (artículos y simulador) | Enciclopedia enorme y simulador real | Lectura pasiva, sin progresión ni repaso |
| **En España:** Finanzas para todos (CNMV y Banco de España), juegos de bolsa de cajas rurales, *Fantasy Finance* (TFG de Comillas, 2026) | Respaldo institucional; simulación con activos reales | Estáticos o puntuales; nadie combina hábito diario, profundidad universitaria y contexto español |

**Hueco diferencial real:** el "Duolingo de las finanzas" en español, con profundidad de carrera y máster, fiscalidad española, gratis y offline. Nadie lo ocupa hoy.

**Amenaza:** que Duolingo o un banco grande lancen algo parecido [SUPUESTO]. La defensa es el contenido español de calidad y la comunidad universitaria.

### 12. Calidad de los prompts

| Problema | Dónde | Efecto en la IA |
|---|---|---|
| **1.4 exige "completa la unidad sin conexión", pero el service worker llega en 1.8** | FASES 1.4 vs 1.8 | Criterio imposible: la IA lo falseará o se bloqueará |
| **El test de nivel (1.6) pide 200 preguntas etiquetadas por concepto, pero `concepts.json` solo tiene N0–N1 (1.2)** | FASES 1.2 vs 1.6 | `content:validate` fallará o la IA inventará conceptos sin control |
| **Bloom contra la mezcla de tipos:** en N0–2, ≥50 % recordar/entender; ≥40 % producir y ≤40 % reconocer. No se define qué Bloom corresponde a cada tipo | CLAUDE §8, TEMARIO §6 | Validador ambiguo; la IA puede crear reglas imposibles de cumplir |
| **"Lighthouse PWA sin errores":** Lighthouse eliminó la categoría PWA en 2024 | FASES 1.8 | Criterio que no existe |
| **La racha en Europe/Madrid** choca con la versión inglesa para usuarios de otros países | CLAUDE §3b | Rachas que se cortan a horas absurdas |
| **"Cuadra el balance" en la beta (Fase 2) cuando el balance se enseña en N3**, y la beta solo tiene N0–N1 | JUEGOS §4 vs FASES 2.5 | Juego sobre algo no aprendido |
| **Inglés "completo" en todo, pero la única revisión humana es en español** | CLAUDE §1, §9 | Contenido en inglés sin revisar publicado como si lo estuviera |
| **El caso de "contenido inglés incompleto" desapareció** (estaba en el primer prompt) | CLAUDE §9 | La IA no sabrá qué mostrar |
| **CLAUDE.md §12 repite** "Sin push disponible, recordatorio al abrir la app" | CLAUDE §12 | Ruido menor |
| **"Comprobado el 13/10/2026" dentro de CLAUDE.md** | CLAUDE §3 | Se queda viejo y la IA lo tomará como verdad |
| **Sin tarea de observabilidad, correo, backups ni CAPTCHA** | FASES | Nunca se construirán |
| **Fase 2 enorme antes de la beta** (8 tareas, 5 juegos, analítica): la beta tarda mucho en llegar | FASES | Meses sin feedback real |

---

## FASE 3 — Resultado

### A) Tabla de hallazgos

| Nº | Área | Problema o carencia | Gravedad | Esfuerzo | Solución concreta |
|---|---|---|---|---|---|
| 1 | Escalabilidad | Subir todos los eventos llena los 500 MB de Supabase Free en semanas | Crítica | M | Los eventos detallados se quedan en local; a la nube solo suben eventos resumen (lección, juego, snapshot de repaso) + límite diario por usuario |
| 2 | Fiabilidad | El SMTP por defecto de Supabase no envía a usuarios reales (2/h, solo al equipo) | Crítica | S | SMTP propio gratuito (Brevo o Resend) configurado en 3.1, con dominio verificado (SPF/DKIM) |
| 3 | Retención | Sin cuenta no hay recordatorios, y la mayoría no tendrá cuenta | Crítica | M | Proponer crear cuenta el día 2–3 ("guarda tu racha y recibe recordatorios"); push y email para cuentas; .ics y widget de instalación para el resto |
| 4 | Fiabilidad | Safari borra IndexedDB tras 7 días sin visita si la app no está instalada | Crítica | M | Empujar a instalar la PWA en iOS, ofrecer cuenta para sincronizar, avisar del riesgo y hacer copia automática al exportar |
| 5 | Prompts | 1.4 exige offline antes de que exista el service worker | Alta | S | Quitar el criterio offline de 1.4 y mantenerlo en 1.8 |
| 6 | Prompts | Test de nivel de 10 niveles sin conceptos de N2–N9 | Alta | S | 1.2 crea el esqueleto completo de `concepts.json` (ids y prerrequisitos de todos los niveles) |
| 7 | Prompts | Bloom y mezcla de tipos sin correspondencia definida | Alta | S | Tabla explícita en TEMARIO: categoría de cada tipo (reconocer/producir/aplicar) independiente del Bloom de cada ejercicio, con un ejemplo válido de lección N0 |
| 8 | Privacidad | Id de analítica sin consentimiento previo | Alta | S | Analítica sin identificador por defecto; id persistente solo con consentimiento; retención medida con cuentas |
| 9 | Seguridad | Sin límite de inserción ni CAPTCHA | Alta | S | Función de inserción con tope por usuario y día + Cloudflare Turnstile en el alta |
| 10 | Fiabilidad | Sin backups en Supabase Free | Alta | S | GitHub Action semanal con `pg_dump` cifrado |
| 11 | Calidad técnica | Sin monitorización de errores | Alta | S | Sentry (plan gratuito) desde la Fase 1, sin datos personales |
| 12 | Negocio | Sin modelo de sostenibilidad | Alta | M | Decidir objetivo; preparar "modo clase" B2B y solicitudes de patrocinio institucional |
| 13 | Producto | Unos 9.000 ejercicios × 2 idiomas para revisar a mano: inviable para una persona | Alta | L | Presupuesto de horas por fase, inglés del contenido tras validar el español, revisor adicional para ramas, recortar ramas a 2 al principio |
| 14 | UX | Onboarding largo antes de aportar valor | Alta | S | Primera lección en menos de 60 s (idioma → objetivo → lección); test de nivel después, opcional; edad solo al crear cuenta |
| 15 | Internacional | Racha fijada a Europe/Madrid | Media | S | Zona horaria del dispositivo registrada en cada evento; las ligas siguen en Madrid |
| 16 | UX | Navegación sin definir | Media | S | 5 pestañas: Inicio, Camino, Practicar (incluye juegos), Ligas, Despacho. Glosario y Ajustes dentro |
| 17 | Privacidad | Menores en ligas con nombre visible | Media | S | Seudónimo por defecto en ligas y sin foto |
| 18 | Fiabilidad | Un service worker roto puede bloquear la app | Media | S | Versión mínima forzada + interruptor de emergencia que desregistra el SW |
| 19 | Legal | Faltan aviso legal LSSI, términos, licencia del contenido y comprobación de marca | Media | S | Redactar 3 páginas legales y comprobar la OEPM/EUIPO antes de comprar el dominio |
| 20 | Prompts | "Lighthouse PWA" no existe | Media | S | Sustituir por una checklist de instalabilidad comprobada en Chrome y Safari |
| 21 | Producto | Juego de balance en la beta sin balance aprendido | Media | S | Disponibilidad de juegos por conceptos vistos (JUEGOS §6 nuevo) |
| 22 | Prompts | CLAUDE.md demasiado largo | Media | M | Dejarlo por debajo de unas 120 líneas; mover diseño y motion a DESIGN.md y el larp a PRODUCT.md |
| 23 | Retención | Sin amigos, referidos ni misiones | Media | M | Misiones diarias en la Fase 2; amigos y referidos en la Fase 3 |
| 24 | Seguridad | Trampas en la liga leyendo el JSON | Baja | S | Asumirlo: topes de XP, revisión de valores atípicos, reportar usuario |
| 25 | UX | Jerga larp para principiantes | Baja | S | Etiqueta sencilla junto a cada término larp |
| 26 | Producto | 7 temas antes de validar | Baja | S | 2 temas en la beta; los desbloqueables en la Fase 4 (ya está así; dejarlo explícito) |
| 27 | Rendimiento | Precachear todo el contenido | Baja | S | Precachear el nivel actual y el siguiente; resto bajo demanda, con aviso de "descargar para offline" |

### B) Top 5 urgentes antes de construir
1. **Rediseñar la sincronización** para que suba resúmenes y no cada respuesta (nº 1). Cambia el esquema de datos desde la tarea 1.1.
2. **Arreglar las dependencias rotas de FASES** (nº 5, 6, 7). La IA tropezará en la primera semana.
3. **Decidir la estrategia de retención sin cuenta y el riesgo de Safari** (nº 3, 4). Define el onboarding y la arquitectura.
4. **Decidir el alcance realista del contenido** (nº 13): ¿inglés del contenido en la beta o después? ¿2 ramas o 4?
5. **Privacidad desde el diseño:** analítica con consentimiento, Supabase en la UE y edad solo al crear cuenta (nº 8, 14, 17).

### C) Top 5 quick wins
1. Quitar el criterio offline de 1.4 y "Lighthouse PWA" de 1.8 (5 min).
2. Añadir Sentry, Turnstile y SMTP propio como líneas en las tareas 1.10 y 3.1 (10 min).
3. Onboarding con la lección primero y la edad solo al crear cuenta (15 min de documento).
4. Comprobar "Compuesto" en la OEPM y la EUIPO y reservar dominio y @ (30 min).
5. Tabla de categorías de ejercicio en TEMARIO (15 min).

### D) Lo que falta
- **Observabilidad:** Sentry, logs, panel de salud.
- **Operación:** correo, backups, entornos, interruptor del service worker.
- Recordatorios sin cuenta y aviso de pérdida de datos en Safari.
- Misiones diarias, amigos, referidos, recuperar racha, email semanal.
- **Modo clase** (profesor que crea un grupo y ve el progreso), que además es crecimiento y negocio.
- Buscador y "explícamelo de otra forma".
- Navegación principal definida.
- Páginas legales completas y licencia del contenido.
- Presupuesto de horas de contenido y criterios para decidir tras la beta.
- Fallback del contenido en inglés incompleto.

### E) Riesgos ocultos que explotarán más adelante
1. **Burnout del fundador por volumen de contenido.** Es el riesgo número 1 del proyecto: el código lo hace la IA, pero la revisión es tuya.
2. **Un error fiscal o financiero publicado** que alguien aplica de verdad o que se hace viral.
3. **Base de datos llena o correo bloqueado** justo el día del lanzamiento.
4. **Usuarios de iPhone que pierden la racha** por el borrado de Safari y no vuelven.
5. **Inglés sin revisar** que dañe la credibilidad fuera de España.
6. **El coste de tu plan de Claude** por generar contenido y código durante meses [SUPUESTO].
7. **Dependencia de skills de terceros** que cambian de versión o desaparecen (mitigado: no bloquean).

### F) Plan de acción
- **Esta semana:**
  - Responder las preguntas de abajo.
  - Aplicar los parches de la sección G a los documentos.
  - Comprobar la marca y reservar dominio y @.
  - Crear GitHub, Cloudflare y Supabase (región UE).
  - Hacer el presupuesto de horas de contenido.
- **Este mes:**
  - Fase 0 completa y tareas 1.1–1.4 (rebanada vertical).
  - Probar la unidad 1 con 5 personas: 2 de cero, 2 estudiantes y 1 avanzado.
  - Ajustar el onboarding con lo que veas.
- **3 meses:**
  - Fases 1 y 2 con Sentry, correo y backups.
  - Beta con 20–50 usuarios y objetivos fijados antes de lanzarla [SUPUESTO, orientativos para una app educativa]: D1 ≥ 40 %, D7 ≥ 20 %, D30 ≥ 10 %.
  - Decidir con los datos si sigues con el troncal completo.

### G) Prompts mejorados (texto para pegar)

**CLAUDE.md §3b — sustituir el punto de Sincronización por:**
> **Sincronización** (Fase 3). En local se guardan todos los eventos. A la nube solo suben **eventos resumen**: `lesson_completed` (con precisión y XP), `game_completed`, `placement_completed`, `srs_snapshot` (estado de repaso comprimido, como mucho uno al día) y `settings_changed`. Inserción mediante una función con tope por usuario y día (p. ej. 200 eventos) y validación de tamaño. Unión por `id`, idempotente. Los días se cuentan en la **zona horaria del dispositivo**, registrada en cada evento; las ligas se cierran en Europe/Madrid. Snapshots locales periódicos de las proyecciones para no recalcular desde cero.

**CLAUDE.md §2 — añadir:**
> 9. **Onboarding:** el usuario hace su primera lección en menos de 60 s (idioma → objetivo → lección). El test de nivel se ofrece después de la primera lección. La edad solo se pregunta al crear cuenta.
> 10. **Navegación:** 5 pestañas: Inicio, Camino, Practicar (repaso + juegos), Ligas, Despacho. Glosario y Ajustes dentro de Despacho y del menú.
> 11. **Contenido incompleto en inglés:** se muestra en español con aviso y botón "avísame cuando esté".

**CLAUDE.md §11 — sustituir la frase del id por:**
> Por defecto, analítica **sin identificador persistente** (recuentos agregados). Solo con **consentimiento explícito** (opt-in, en el onboarding y en Ajustes) se guarda un id aleatorio para medir retención. La retención de usuarios con cuenta se mide en Supabase.

**CLAUDE.md §12 — sustituir por:**
> Recordatorios: (a) con cuenta: Web Push (VAPID) y email semanal opcional mediante SMTP propio; (b) sin cuenta: recordatorio al abrir la app, .ics recurrente y propuesta de crear cuenta el día 2–3. iOS: push solo con la PWA instalada (16.4+), con tutorial de instalación. Máx. 1 al día, hora configurable.

**CLAUDE.md — nueva §14 Operación:**
> Supabase en región UE. SMTP propio (Brevo o Resend) con SPF/DKIM. Cloudflare Turnstile en el alta. Sentry (gratis) sin datos personales. Backups: GitHub Action semanal con `pg_dump` cifrado. Entornos: local (Supabase CLI), preview (Cloudflare) con un proyecto Supabase de pruebas, y producción. Service worker con versión mínima forzada e interruptor de emergencia. Aviso en iOS si la app no está instalada: "Safari puede borrar tu progreso si no la instalas o no creas cuenta".

**CLAUDE.md — reducción:** mover las secciones 5–6 a DESIGN.md y la sección 7 a PRODUCT.md, dejando en CLAUDE.md un resumen de 5 líneas y el enlace. Quitar "Comprobado el 13/10/2026" (queda en DECISIONES.md). Quitar la frase duplicada de §12.

**TEMARIO.md §6 — añadir al principio:**
> La **categoría** de mezcla depende del tipo: reconocer = 1–4; producir = 5–11; aplicar = 12–19. El **Bloom** se declara por ejercicio y es independiente (un `fill_blank` puede ser "recordar"). Regla N0–2: ≤40 % reconocer, ≥40 % producir, y ≥50 % del total con Bloom recordar/entender. Ejemplo válido de 10 ejercicios: 3 reconocer (recordar) + 5 producir (2 recordar, 3 aplicar) + 2 aplicar (entender).

**TEMARIO.md §1 — añadir:**
> **Presupuesto de producción:** cada unidad lleva un registro de horas reales de revisión en `CONTENIDO-QA.md`. El contenido en inglés se publica en `reviewed-auto` (revisado por el subagente) con la etiqueta "Beta EN" hasta que lo revise una persona.

**JUEGOS.md — nueva §6:**
> **Disponibilidad:** un juego solo entra en la sesión si el usuario ha visto los conceptos que usa (`concepts` del juego en `concepts.json`). En la beta (N0–N1): Campana de apertura, Mesa de órdenes, ¿Sube o baja?, La magia del compuesto y una versión N0 de Cuadra el balance ("Cuadra tu presupuesto").

**FASES.md:**
- **1.2:** "5. `/content/shared/concepts.json` con el **esqueleto de todos los niveles** (ids, nombre y prerrequisitos) y el detalle completo de N0–N1."
- **1.4:** borrar "sin conexión tras la primera carga" del criterio; dejar "completa la unidad y conserva el progreso al recargar".
- **1.6:** "Onboarding: idioma → objetivo → primera lección; el test de nivel se ofrece al terminarla. La edad se pregunta en 3.2."
- **1.8:** sustituir "Lighthouse PWA sin errores" por "instalable en Chrome Android y Safari iOS (capturas) y manifest validado".
- **1.10:** añadir "Sentry configurado sin datos personales; aviso de riesgo en Safari iOS".
- **2.2:** añadir "misiones diarias (3 por día, calculadas desde eventos)".
- **3.1:** añadir "región UE, SMTP propio, Turnstile, función de inserción con tope diario, backup semanal con `pg_dump` y proyecto Supabase de pruebas separado".
- **3.2:** añadir "seudónimo por defecto en ligas; propuesta de crear cuenta el día 2–3".
- **Nueva 3.8 — Amigos y referidos:** seguir a amigos con código, ligas privadas de clase y enlace de invitación.
- **Nueva 5.5 — Modo clase** (opcional según el modelo de negocio).

**EXECUTION.md — añadir en §2:**
> No inventes comandos de skills ni de herramientas: si no aparecen en `DECISIONES.md` como verificados, compruébalos antes de usarlos. Mantén CLAUDE.md por debajo de 120 líneas; el detalle va en los documentos enlazados.

---

## Notas

- **Producto: 8/10.** Visión, pedagogía y diferencial muy sólidos y únicos en español; fallan la retención sin cuenta y el realismo del volumen de contenido.
- **Técnica: 7,5/10.** Arquitectura y proceso por encima de la media; la sincronización, el correo, los backups y la monitorización romperían el lanzamiento si no se corrigen.
- **Negocio: 3,5/10.** No hay modelo de sostenibilidad ni plan de distribución; hoy es un gran proyecto personal, no un negocio.

---

## Preguntas (máx. 5)
1. ¿Cuál es el objetivo real: portfolio para tu carrera, impacto educativo o negocio que algún día genere ingresos? Cambia la nota de negocio y la prioridad del "modo clase".
2. ¿Cuántas horas a la semana puedes dedicar y hay alguien más que pueda revisar contenido (sobre todo en inglés y en las ramas)?
3. ¿Tu público inicial son universitarios o también chavales de bachillerato (14–17)? Cambia los requisitos legales y de ligas.
4. ¿El contenido en inglés tiene que estar en la beta o puede llegar después de validar el español?
5. ¿Aceptas un gasto mínimo (unos 10 € al año de dominio y, si crece, 25 $ al mes de Supabase), o el coste cero es estricto?

---

**Fuentes:** [Supabase — precios y límites del plan Free](https://supabase.com/pricing) · [Supabase — SMTP propio y límites del correo por defecto](https://supabase.com/docs/guides/auth/auth-smtp) · [Zogo — Business of Business](https://www.businessofbusiness.com/articles/why-the-23-year-old-co-founder-of-zogo-wants-to-gamify-financial-literacy-for-gen-z-bolun-li/) · [Bloomberg Market Concepts — reseña 2026](https://onlinecourseing.com/bloomberg-market-concepts-review/) · [Fantasy Finance — Universidad Pontificia Comillas](https://repositorio.comillas.edu/items/bd47fb08-6868-491f-9811-ad98ad13e419/full) · [Globalcaja — juego de bolsa 2026](https://www.globalcaja.es/sites/default/files/2026-03/ndp-_juego-de-bolsa.pdf) · [Caja Rural de Navarra — Master Markets](https://nuevecuatrouno.com/2025/01/30/caja-rural-navarra-juego-master-markets-educacion-financiera/)

---

## ACTUALIZACIÓN 14/10 — Uso personal (respuesta de Javier)

La app es **solo para uso personal**, sin usuarios externos ni ingresos. Cambios aplicados a CLAUDE.md, FASES.md, TEMARIO.md, JUEGOS.md y EXECUTION.md:

**Hallazgos que desaparecen:** 1 (base de datos llena: con un usuario el volumen es mínimo), 2 (correo: login con contraseña, sin email mágico), 8 (consentimiento de analítica: sin analítica externa), 9 (CAPTCHA: alta pública desactivada), 12 (negocio), 15 (zona horaria: ahora la del dispositivo), 17 (menores en ligas), 19 (páginas legales públicas), 23 (amigos y referidos), 24 (trampas en ligas), y toda el área de competencia y monetización.

**Hallazgos aplicados:**
- Sincronización solo entre tus dispositivos (Fase 3 opcional, 3 tareas), Supabase en la UE con un único usuario y backup semanal.
- Ligas sustituidas por **rivales simulados** (becarios de Albufera Partners con ritmo por semilla) y por tu yo de la semana pasada: misma tensión, sin servidor.
- Estadísticas personales y registro de errores en local, en lugar de analítica.
- Recordatorio por calendario (.ics) por defecto; push opcional.
- Aviso de Safari en iOS e instalación guiada; interruptor de emergencia del service worker.
- Onboarding de 3 pantallas hasta la primera lección; test de nivel inicial sustituido por **tests de salto** por unidad.
- Navegación de 5 pestañas definida.
- Corregidos los prompts rotos: offline fuera de 1.4, `concepts.json` con esqueleto de todos los niveles, regla de mezcla y Bloom explicada con ejemplo, "Lighthouse PWA" sustituido, juego de balance como "Cuadra tu presupuesto" en N0 y disponibilidad de juegos por conceptos vistos.
- Contenido solo en español (i18n preparado para añadir inglés sin rehacer nada).
- Beta sustituida por **prueba personal de 4 semanas**; Fase 5 sin landing ni marketing; ramas ordenadas por tu objetivo: Banca y riesgos primero.

**Riesgo que se hace más importante:** la revisión del contenido. Estás aprendiendo, así que no puedes ser la única garantía de exactitud. Por eso cada dato no trivial lleva fuente obligatoria, el subagente revisor comprueba que la tenga y tu revisión consiste en contrastar con fuentes y apuntes.

**Notas revisadas:** producto 8,5/10 (más enfocado y realista) · técnica 8,5/10 (los fallos graves desaparecen con un solo usuario) · negocio: no aplica.
