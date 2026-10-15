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
