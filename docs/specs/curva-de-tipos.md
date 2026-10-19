# Spec: lección-juego «Curva de tipos» (`n2-u2-l1`)

Motor: `src/engine/games/yield-curve.ts`. Interfaz: `src/features/games/CurveGame.tsx`. Textos: `es.json` → `curveGame`. Ficha 13 de `docs/JUEGOS.md`. Explicador de la unidad: `Duration` (l3).

## Reglas
- Cinco bonos del Estado ficticios (1, 2, 5, 10 y 30 años), emitidos hoy a la par: el cupón de cada uno es su rentabilidad de hoy. Cupones anuales.
- Curvas de partida:
  - semilla 0: normal (2,2 · 2,4 · 2,8 · 3,2 · 3,6 %);
  - semilla 1: plana;
  - semilla 2: invertida (la de peor caso).
- **Palancas** (deslizador y botones −/+):
  - nivel, de −2 a +2 puntos en pasos de 0,25;
  - pendiente, de −1,5 a +1,5 en pasos de 0,25. Gira alrededor de los 5 años con un peso logarítmico: 0 a 5 años, 1 a 30 años y unos −0,9 a 1 año.
- **Reto 1:** el bono a 30 años cae más de un 10 %.
- **Reto 2:** el de 2 años baja y el de 30 sube a la vez (aplanar).
- **Reto 3:** sin mover nada, cuánto cae el bono a 10 años si todos los tipos suben un punto. Las opciones son las caídas de los bonos a 2, 10 y 30 años, y la explicación enlaza con la duración modificada.
- Nota: 35 / 35 / 30.
- **Pendiente para la ficha completa:** el arrastre directo de la curva con física de cuerda (JUEGOS §13) queda para una mejora; hoy se mueve con dos palancas accesibles.

## Verificación
`yield-curve.test.ts`, `tests/curve-game.test.tsx`, `explainers.test.tsx` (Duration), `e2e/leccion-juego.spec.ts`, `e2e/peor-caso-juegos.spec.ts`, `e2e/n2u2.spec.ts` y `content:validate`.
