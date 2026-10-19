# Spec: lección-juego «Dos fondos, veinte años» (`n2-u3-l1`)

Motor: `src/engine/games/fund-fees.ts`. Interfaz: `src/features/games/FundGame.tsx`. Textos: `es.json` → `fundGame`. Explicador de la unidad: `TerDrain` (l2).

## Reglas
- **Paso 1:** 10.000 € durante 20 años en dos fondos que invierten igual (semilla 0: 6 % bruto) y solo cambian en sus gastos corrientes (1,8 % y 0,2 %). Se predice la diferencia final entre tres opciones:
  - la buena, redondeada a centenas;
  - la ingenua, que suma los puntos sin componer;
  - la del capital final del barato menos lo invertido.
  - Después se ven las dos curvas.
- **Paso 2:** cuatro situaciones que se clasifican como fondo o ETF: comprar a media sesión, traspasar sin tributar, comprar desde el bróker, aportar 100 € al mes sin corretaje.
- **Paso 3:** el fondo caro vale 14.000 € con 4.000 € de ganancia, y hay que pasarse al barato:
  - con un traspaso no se tributa ahora;
  - si se vende, se pagan 760 € (19 %) y se reinvierten 13.240 €;
  - se compara el valor a 20 años, antes de los impuestos finales.
- **Simplificaciones declaradas:**
  - rentabilidad neta = bruta − TER, compuesta anual;
  - tipo ilustrativo del primer tramo de la base del ahorro (19 %), con fuente y `verificarAntesDe`.
- Nota: 35 % la diferencia, 35 % las situaciones (a partes iguales) y 30 % el traspaso.

## Verificación
`fund-fees.test.ts`, `tests/fund-game.test.tsx`, `explainers.test.tsx` (TerDrain), `e2e/leccion-juego.spec.ts`, `e2e/peor-caso-juegos.spec.ts`, `e2e/n2u3.spec.ts` y `content:validate`.
