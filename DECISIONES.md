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
