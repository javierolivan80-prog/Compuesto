# Spec: lección-juego «Una noche en la tesorería» (`n2-u6-l1`)

Motor: `src/engine/games/repo-night.ts`. Interfaz: `src/features/games/RepoGame.tsx` (con `AskStep`). Textos: `es.json` → `repoGame`. Explicador de la unidad: `RepoFlow` (l3, nuevo en el catálogo).

## Reglas
- La tesorería de Albufera necesita liquidez para esta noche. Semilla 0: 10 millones de € en bonos del Estado, con un recorte del 2 %, al 3,2 % y a 1 día.
- **Paso 1:** cuánto prestan. Opciones: 9,8 (la buena), 10 (sin recorte) y 10,2 (sumando el recorte).
- **Paso 2:** intereses con actual/360. Opciones: 871 € (la buena), 859 € (con 365) y 313.600 € (un año entero).
- **Paso 3:** en qué instrumento se puede reclamar además al banco emisor: la cédula hipotecaria (doble garantía) o la titulización (solo los préstamos del fondo).
- Las demás semillas sortean la garantía (10, 20 o 50 millones), el recorte (1, 2 o 5 %), el tipo (2,5 · 3,2 · 4 %) y el plazo (1 o 7 días).
- Nota: un tercio por paso.

## Verificación
`repo-night.test.ts`, `tests/repo-game.test.tsx`, `explainers.test.tsx` (RepoFlow), `e2e/leccion-juego.spec.ts`, `e2e/peor-caso-juegos.spec.ts`, `e2e/n2u6.spec.ts` y `content:validate`.
