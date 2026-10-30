# Spec: lección-juego «¿Patrón o ruido?» de N5 (`pattern-noise`, unidad `n5-u5`)

Motor: `src/engine/games/pattern-noise.ts`. Interfaz: `src/features/games/PatternNoiseGame.tsx` (con `AskStep` y dos gráficos SVG con descripción para lector de pantalla). Textos: `es.json` → `patternNoiseGame`. Explicador de la unidad: `MarginCall` (del catálogo de ANIMACIONES, nivel 7; se adelanta al 5 para los CFD, en l5). Ficha: ninguna de JUEGOS.md encaja (la 11, «El trader impulsivo», es la de n5-u6), así que es un juego sencillo de cuatro pasos.

## Reglas
- **Paso 1 (patrón o ruido):** dos series de 60 sesiones, «la acción» y «la de la moneda». Las dos son paseos aleatorios de ±1 % diario con semillas distintas. Respuesta correcta: «No se distinguen a simple vista».
- **Paso 2 (medias móviles):** neto = bruto − operaciones × coste. Semilla 0: 18 % − 60 × 0,25 % = 3 %. Distractores: 18 % (bruto) y 17,75 % (un solo coste).
- **Paso 3 (momentum):** se compra la acción con más subida a 12 meses y se vende en corto la de más caída (Jegadeesh y Titman, 1993). Semilla 0: comprar Naranjas del Turia (+24 %) y vender Pirineo Energía (−12 %). Distractores: al revés y «el pasado no dice nada».
- **Paso 4 (CFD):** pérdida = garantía × apalancamiento × caída. Semilla 0: 2.000 € a 20:1 con una caída del 2 %: 800 € (40 % de la garantía). Distractores: 40 € (sin apalancamiento) y 40.000 € (la exposición). La caída nunca llega al cierre del 50 % de la garantía.
- La semilla sortea las series, el bruto (12 a 25 %), las operaciones (40 a 120), el coste (0,10 a 0,30 %), las cuatro rentabilidades a 12 meses (distintas), la garantía, el apalancamiento (5:1 a 30:1, los límites de la ESMA) y la caída; las opciones son distintas en 10.000 semillas.
- Nota: un cuarto por paso.
- Cifras para la lección (`patternValues`): `gross`, `trades`, `cost`, `net`, `best`, `worst`, `deposit`, `lev`, `move`, `exposure`, `loss`, `loss_pct` y `hits`.
- Peor caso (`worst-seeds.ts`): semilla 60, CFD de 5.000 € a 30:1 (150.000 € de exposición) y medias móviles que pierden un 6 % neto.

## Verificación
`pattern-noise.test.ts`, `tests/pattern-noise-game.test.tsx`, la rama `pattern-noise` de `e2e/play-game.ts`, `e2e/leccion-juego.spec.ts` («¿patrón o ruido? de N5»), `e2e/peor-caso-juegos.spec.ts` (`n5/u5/l1`) y `e2e/n5u5.spec.ts`.
