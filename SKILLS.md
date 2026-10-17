# SKILLS.md — Skills para construir Compuesto

> Versión del plan: 17/10/2026 (estrellas leídas en GitHub ese día; cambian rápido). **Regla:** las skills son instrucciones que Claude Code seguirá. Antes de instalar cualquiera se lee su `SKILL.md` y se descarta si pide cosas raras (enviar datos fuera, ejecutar scripts dudosos, claves). Muchas estrellas ≠ adecuada para este proyecto. **Coste:** todas se usan *mientras se construye*; ninguna se ejecuta dentro de la app (coste de API 0 €). `EXECUTION.md` manda sobre el flujo de trabajo de cualquier skill.

**Estado en este repo** (revisado el 17/10/2026): ya instaladas las de diseño, animación y juegos de la lista 1 y 2 (Impeccable, ui-ux-pro-max, Emil Kowalski, vercel-labs, lottiefiles, gamedev, anthropics/skills salvo `frontend-design`) y las skills propias. **Pendientes de revisar e instalar:** superpowers, financial-services, GSAP, scientific-skills, supabase y education-agent-skills. Las de financial-services son las que más suben el nivel del temario: se revisan e instalan antes de la Fase 6 (o antes, si se adelanta Investment Banking).

## 1. Imprescindibles

| Skill / repo | ⭐ | Para qué en Compuesto | Instalación |
|---|---|---|---|
| obra/superpowers | ~300k | Método de desarrollo: TDD, depuración sistemática, «verificar antes de dar por terminado». Encaja con `EXECUTION.md`, pero **manda EXECUTION.md**: se usan sus skills de testing, debugging y verificación, no su flujo de planificación (ya está en FASES.md) | `/plugin install superpowers@claude-plugins-official` |
| anthropics/skills | ~180k | `skill-creator` (skills propias), `webapp-testing` (Playwright), `theme-factory` (variantes de tema). **No** usar su `frontend-design` (choca con Impeccable) | `npx skills add anthropics/skills` |
| nextlevelbuilder/ui-ux-pro-max-skill | ~135k | Design system de partida y `banner-design` para la tarjeta compartible | `npx ui-ux-pro-max-cli init --ai claude` (requiere Python 3) |
| pbakaus/impeccable | ~81k | Lenguaje de diseño: `critique`, `audit`, `polish`, `harden`, `delight` y detector anti-«AI slop» en CI | `npx impeccable install` + `npx impeccable telemetry off` |
| emilkowalski/skills | ~46k | Animación con criterio (curvas, duraciones, rendimiento), sensación de app nativa, `break-ui`, `prototype` | `npx skills@latest add emilkowalski/skills` |
| **anthropics/financial-services** | ~39k | **La clave para subir el nivel del temario.** Skills oficiales que usan los profesionales: `dcf-model`, `comps-analysis`, `lbo-model`, `3-statement-model`, `merger-model`, `cim-builder`, `teaser`, `buyer-list`, `process-letter`, `earnings-analysis`, `initiating-coverage`, `thesis-tracker`, `catalyst-calendar`, `returns-analysis`, `ic-memo`, `dd-checklist`, `unit-economics`, `value-creation-plan`… Se usan para **generar modelos de referencia reales de las empresas ficticias** y para definir qué entregables debe saber hacer Javier en cada rama Pro. Los conectores de datos de pago (FactSet, S&P…) **no** se configuran | `claude plugin marketplace add anthropics/financial-services` → `claude plugin install financial-analysis@claude-for-financial-services` + `investment-banking@…` + `equity-research@…` + `private-equity@…` |
| vercel-labs/agent-skills | ~33k | `react-best-practices` (rendimiento), `composition-patterns` (arquitectura de componentes), `web-design-guidelines` (auditoría de interfaz), `react-view-transitions` | `npx skills add vercel-labs/agent-skills` |
| greensock/gsap-skills | ~14k | GSAP para los **explicadores arrastrables**: una línea de tiempo se controla con un slider (`timeline.progress()`); DrawSVG/MorphSVG dibujan la curva compuesta. Motion sigue para la UI | `npx skills add https://github.com/greensock/gsap-skills` |

## 2. Muy recomendables

| Skill / repo | ⭐ | Para qué | Instalación |
|---|---|---|---|
| K-Dense-AI/claude-scientific-skills | ~52k | Estadística, series temporales y econometría (`statsmodels`, diseño experimental): VaR, regresión, Monte Carlo y backtesting correctos. Instalar **solo** esas skills | `npx skills add K-Dense-AI/scientific-agent-skills --skill <nombre>` |
| supabase/agent-skills | ~2,4k | Buenas prácticas de Postgres, RLS y migraciones para la Fase 3 | `npx skills add supabase/agent-skills` |
| lottiefiles/motion-design-skill | ~2,3k | Principios de animación de Disney para UI; personalidad «Premium» | `npx skills add lottiefiles/motion-design-skill --skill motion-design --agent claude-code` |
| gamedev-skills/awesome-gamedev-agent-skills | ~1,6k | Solo: `game-feel` (juice), `game-ui-ux`, `audio-design`, `pixijs-rendering` (si Canvas no llega a 60 fps), `performance-optimization`, `puzzle`, `card-game` | `npx skills add gamedev-skills/awesome-gamedev-agent-skills --skill <nombre> --agent claude-code` |
| GarethManning/education-agent-skills | ~0,9k | Pocas estrellas pero muy específica y basada en evidencia: práctica de recuperación, espaciado, intercalado, ejemplos resueltos, diseño inverso, rúbricas, validez de evaluación. Solo los dominios 1 (memoria), 3 (instrucción explícita), 7 (diseño curricular y evaluación) y 12 (ciencia del aprendizaje con IA) | Copiar esas carpetas de `skills/` a `.claude/skills/` |

## 3. Catálogos (para buscar más, no para instalar enteros)

hesreallyhim/awesome-claude-code (~56k, índice de skills, hooks y comandos) · VoltAgent/awesome-agent-skills (~36k, +1.000 skills oficiales y de comunidad).

## 4. Descartadas (y por qué)

| Repo | Motivo |
|---|---|
| gsd-build/get-shit-done (~64k) | Archivado; además duplica FASES.md y EXECUTION.md |
| anthropics/skills → `frontend-design` | Impeccable parte de ella; tener las dos da instrucciones contradictorias |
| playableintelligence/game-creator | Orientado a Phaser, monetización y publicar juegos; los nuestros son módulos dentro de una app |
| dylantarre/animation-principles (~75) | Muy pocas estrellas; lo que aporta ya lo cubren motion-design, Emil y game-feel. Pasa a opcional |
| Conectores de datos de financial-services (FactSet, S&P, LSEG, PitchBook…) | Requieren suscripción de pago y no hacen falta: trabajamos con empresas ficticias y documentos públicos |
| Fission-AI/OpenSpec y bmad-code-org/BMAD-METHOD | No se instalan; sus ideas útiles están adoptadas en `.claude/skills/nuevo-cambio` (ver `DECISIONES.md`) |

## 5. Skills propias del proyecto (en `.claude/skills/`)

| Skill | Qué hace |
|---|---|
| `crear-unidad` | Flujo completo de una unidad (TEMARIO §8), con las skills de educación y, en las ramas Pro, la skill de financial-services del entregable que se enseña |
| `revisar-unidad` | Llama al subagente revisor, comprueba fuentes y aplica cambios |
| `nuevo-explicador` | Ficha de ANIMACIONES.md §2 → componente con GSAP o Motion, estado final estático y test |
| `nuevo-juego` | Ficha de JUEGOS.md → juego con el kit de game feel |
| `modelo-referencia` | **Pendiente de crear.** Usa `3-statement-model`, `dcf-model`, `lbo-model`, `merger-model` o `comps-analysis` sobre una empresa de `companies.json` y guarda el resultado como «respuesta oficial» con la que se generan y comprueban los ejercicios |
| `nuevo-cambio` | Spec → construir → revisión adversarial → archivar (ver `DECISIONES.md`) |

## 6. Cuándo se usa cada una

| Momento | Skills |
|---|---|
| Arranque | superpowers (verificación), skill-creator, ui-ux-pro-max, impeccable init |
| Pantallas | impeccable shape/critique/audit/polish, web-design-guidelines, composition-patterns, react-best-practices, emil-design-eng, mobile-native |
| Animación | motion-design → animate (Emil) → gsap-skills (explicadores) / Motion (UI) → review-animations, animation-performance |
| Juegos | nuevo-juego, game-feel, game-ui-ux, audio-design, pixijs-rendering (si hace falta) |
| Temario y contenido | education-agent-skills (dominios 1, 3, 7, 12), crear-unidad, revisar-unidad, modelo-referencia + financial-services, scientific-skills (estadística) |
| Datos y sincronización | supabase/agent-skills |
| Pruebas y cierre | webapp-testing, break-ui, harden, superpowers (verification-before-completion) |

## 7. Skills de nicho instaladas (17/10/2026)

Finanzas profesionales, mercados y ciencia del aprendizaje. Se usan **mientras se construye** (coste de API 0 €); ninguna API, clave ni conector de pago configurado. Detalle de revisión, exclusiones y avisos en `DECISIONES.md`.

| Skill(s) | Repo y commit | Tipo | Para qué en Compuesto |
|---|---|---|---|
| `financial-analysis`, `investment-banking`, `equity-research`, `private-equity` | [anthropics/financial-services](https://github.com/anthropics/financial-services) `574ed36` | Plugins (usuario) | Entregables reales de las ramas Pro: DCF, comps, LBO, 3 estados, merger model, CIM, teaser, initiating coverage, IC memo, DD |
| `creating-financial-models` | [anthropics/claude-cookbooks](https://github.com/anthropics/claude-cookbooks) `a162e01` | Skill | DCF, sensibilidad, Monte Carlo y escenarios para los modelos de referencia |
| `finance` | [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) `33eeda1` | Plugin (usuario) | Contabilidad de cierre: asientos, conciliaciones, estados financieros, varianzas |
| `investment-research`, `investment-checklist`, `quality-screen`, `industry-research`, `earnings-review`, `thesis-tracker` | [xbtlin/ai-berkshire](https://github.com/xbtlin/ai-berkshire) `d5ff30d` | Comandos (en chino) | Marco de análisis value (Buffett/Munger) para la rama Equity Research y Buy-side |
| `financial-analyst`, `stock-analysis` | [alirezarezvani/claude-skills](https://github.com/alirezarezvani/claude-skills) `19392f7` | Skills | Ratios, DCF, presupuesto; análisis fundamental y forense por sector |
| `company-valuation`, `earnings-preview`, `earnings-recap`, `estimate-analysis`, `options-payoff`, `stock-correlation`, `startup-analysis` | [himself65/finance-skills](https://github.com/himself65/finance-skills) `cedadc4` | Skills | Valoración DCF/múltiplos/SOTP, ciclo de resultados, consenso, payoff de opciones, correlaciones, VC |
| `time-value-of-money`, `return-calculations`, `statistics-fundamentals`, `fixed-income-corporate`, `fixed-income-sovereign`, `fixed-income-structured`, `asset-allocation`, `rebalancing`, `performance-attribution`, `historical-risk`, `forward-risk` | [JoelLewis/finance_skills](https://github.com/JoelLewis/finance_skills) `5c498ea` | Skills | Base cuantitativa tipo CFA: TVM, rentabilidades, estadística, renta fija, asignación, atribución, VaR |
| `options-pricing`*, `fixed-income`*, `volatility-modeling`, `portfolio-analytics`, `risk-management`, `correlation-analysis` | [agiprolabs/claude-trading-skills](https://github.com/agiprolabs/claude-trading-skills) `981e1d7` | Skills | Derivados y riesgo de cartera (*marcadas como STUB por su autor; sesgo cripto) |
| `position-sizer`, `backtest-expert`, `options-strategy-advisor`, `scenario-analyzer` | [tradermonty/claude-trading-skills](https://github.com/tradermonty/claude-trading-skills) `b29c6df` | Skills | Tamaño de posición, backtesting sin sesgos, estrategias con opciones, escenarios macro |
| `statistical-analysis`, `statsmodels`, `aeon` | [K-Dense-AI/claude-scientific-skills](https://github.com/K-Dense-AI/claude-scientific-skills) `a1043ef` | Skills | Contraste de hipótesis, regresión/ARIMA y series temporales bien hechas |
| 40 skills de los dominios 1, 3, 7 y 12 (p. ej. `retrieval-practice-generator`, `spaced-practice-scheduler`, `interleaving-unit-planner`, `worked-example-fading-designer`, `backwards-design-unit-planner`, `assessment-validity-checker`, `adaptive-hint-sequence-designer`) | [GarethManning/education-agent-skills](https://github.com/GarethManning/education-agent-skills) `6bbbce4` | Skills | Diseño de lecciones y evaluación basado en evidencia (recuperación, espaciado, intercalado, ejemplos resueltos) |
| `claude-tutor` | [kirilxd/claude-tutor](https://github.com/kirilxd/claude-tutor) `ce19469` | Plugin (usuario) | Tutor personal con repaso espaciado mientras estudias. **No usar `/dashboard`** (lanza Claude sin permisos) |
| financeskills, claude-finance-skills | [GAJETOso](https://github.com/GAJETOso/financeskills) `b0c6239`, [andreworia](https://github.com/andreworia/claude-finance-skills) `e19bba6` | Solo consulta | Clonados en `~/.compuesto-skills-src/`, nada instalado |
