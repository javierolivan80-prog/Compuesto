# Spec: lección-juego «¿Cara o barata?» (`n3-u4-l1`)

Motor: `src/engine/games/cheap-or-dear.ts`. Interfaz: `src/features/games/CheapGame.tsx`. Textos: `es.json` → `cheapGame`.

## Reglas
- Tres empresas del universo: Naranjas, Tramuntana y Pirineo. Datos de 2025 de `companies.json`: BPA, EBITDA, deuda financiera neta y acciones.
- Cada empresa tiene cinco comparables anónimos con PER y EV/EBITDA.
  - Cuatro van alrededor de la mediana del sector: PER 15, 14 y 17; EV/EBITDA 8, 6 y 10.
  - El quinto es «raro» (beneficio hundido), con un PER de 3 a 4 veces el del sector. Tira de la media, no de la mediana.
- Precio de hoy (ficticio): el valor por la mediana del PER × 0,7 / 0,8 / 1 / 1,2 / 1,3, según la semilla.
- Paso 1: eliges el PER de referencia (la media, la mediana, el más bajo o el más alto). Se explica por qué la mediana.
- Paso 2: valor por PER y, de contraste, por EV/EBITDA (EV − deuda neta, entre las acciones).
- Paso 3: veredicto. Es «cara» o «barata» si el precio se aleja más de un 10 % del valor por la mediana del PER; si no, «en precio».
- Nota: 40 % por elegir la mediana y 60 % por acertar el veredicto.

## Verificación
`cheap-or-dear.test.ts`, `tests/cheap-game.test.tsx`, `e2e/leccion-juego.spec.ts`, `e2e/peor-caso-juegos.spec.ts`, `e2e/n3u4.spec.ts` y `content:validate`.
