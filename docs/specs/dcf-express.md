# Spec: lección-juego «DCF Express» (`n3-u6-l1`)

Motor: `src/engine/games/dcf-express.ts`. Interfaz: `src/features/games/DcfGame.tsx`. Textos: `es.json` → `dcfGame`. Explicador asociado: `DcfTimeTravel` (l4). Ficha 8 de `docs/JUEGOS.md`.

## Reglas
- Base: el DCF del modelo de referencia de Naranjas (`content/shared/models/naranjas-del-turia-dcf.json`): FCFF 2026–2030, mitad de año, valor terminal por Gordon descontado con el factor del último flujo, deuda neta −3.385 y 12 millones de acciones.
- WACC del modelo redondeado a 8,27 % para la rejilla de 0,1. Da 9,35 € frente a los 9,3486 € del modelo.
- Palancas:
  - WACC, del 6 % al 12 % en pasos de 0,1;
  - g, del 0 % al 4 % en pasos de 0,1;
  - margen EBIT, de −3 a +3 pp sobre el plan en pasos de 0,5. Cada punto suma ingresos × 1 % × (1 − t) al FCFF de cada año.
- **Reto 1 (qué descuenta el mercado):** solo el WACC. Se acierta si el DCF queda a ±2 % de la cotización (semilla 0: 7,50 €, que da 9,9 %).
- **Reto 2 (el precio del jefe):** solo g. Se acierta si llega a ±2 % del objetivo (semilla 0: 12 €, que da g = 3,7 %). Después hay que decir si se defendería: lo correcto es no, porque supera el 2,5 % que acepta el comité.
- **Reto 3 (caso base):** se parte de WACC 7 %, g 3 % y margen +2 pp, con un valor de 16,21 €. El comité aprueba con WACC entre 7,5 % y 9,5 %, g ≤ 2,5 %, margen entre −2 y +2 pp y un valor entre 8,80 € y 9,90 €. El sello «Aprobado» aparece en vivo.
- Nota: 30 % el WACC implícito, 20 % la g del jefe, 20 % el criterio y 30 % la aprobación.
- Semillas distintas de 0: cotización de 7, 7,5 u 8 € y objetivo de 11, 11,5 o 12 €. Todas alcanzables en la rejilla y con una g del jefe no defendible (test).

## Verificación
`dcf-express.test.ts`, `tests/dcf-game.test.tsx`, `explainers.test.tsx` (DcfTimeTravel), `e2e/leccion-juego.spec.ts`, `e2e/peor-caso-juegos.spec.ts`, `e2e/n3u6.spec.ts` y `content:validate`.
