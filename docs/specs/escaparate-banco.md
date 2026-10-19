# Spec: lección-juego «El escaparate del banco» (`n2-u7-l1`)

Motor: `src/engine/games/bank-window.ts`. Interfaz: `src/features/games/WindowGame.tsx` (con `AskStep`). Textos: `es.json` → `windowGame`. Explicador de la unidad: `FuturePayoff` (l4, nuevo en el catálogo).

## Reglas
- En la oficina de un banco ficticio te ofrecen cuatro cosas. Semilla 0: aportación de 1.500 € al plan con un tipo marginal del 30 %, una SOCIMI que gana 1.000 miles de € con alquileres y un futuro de 10 unidades comprado a 100 € que vence a 108 €.
- **Paso 1:** ¿complejo o no complejo? Un depósito y un fondo UCITS indexado son no complejos; un bono estructurado (autocancelable) y un CFD apalancado son complejos.
- **Paso 2:** ahorro de IRPF del plan: aportación × tipo marginal = 450 €. Opciones: 450 (la buena), 1.500 (confundir aportación con ahorro) y 285 (con el 19 %).
- **Paso 3:** dividendo mínimo de la SOCIMI: el 80 % del beneficio por alquileres (Ley 11/2009, art. 6) = 800.000 €. Opciones: 500.000, 800.000 y 1.000.000 €.
- **Paso 4:** resultado del futuro comprado: (108 − 100) × 10 = +80 €. Opciones: +80, −80 (el del vendedor) y +8 (sin multiplicar por las unidades).
- Las demás semillas sortean la aportación (500, 1.000 o 1.500 €), el tipo marginal (24, 30 o 37 %), el beneficio (500, 1.000 o 2.000 miles), el precio al vencer (92, 95, 105 o 108 €) y las unidades (5, 10 o 20).
- Nota: un cuarto por paso; el primero, repartido entre los cuatro productos.

## Verificación
`bank-window.test.ts`, `tests/window-game.test.tsx`, `explainers.test.tsx` (FuturePayoff), `e2e/leccion-juego.spec.ts`, `e2e/peor-caso-juegos.spec.ts`, `e2e/n2u7.spec.ts` y `content:validate`.
