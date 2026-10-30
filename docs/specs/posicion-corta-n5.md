# Spec: lección-juego «La posición corta» de N5 (`short-desk`, unidad `n5-u3`)

Motor: `src/engine/games/short-desk.ts`. Interfaz: `src/features/games/ShortDeskGame.tsx` (con `AskStep`). Textos: `es.json` → `shortDeskGame`. Explicador de la unidad: `ShortSelling` (del catálogo de ANIMACIONES, nivel 5; se construye ahora, en l2). Ficha: ninguna de JUEGOS.md trata los cortos, así que es un juego sencillo de cuatro pasos, como permite DECISIONES (N5, juegos de u2–u5).

## Reglas
- Venta en corto de una acción ficticia; precios en céntimos.
- **Paso 1 (préstamo):** comisión = acciones × precio de venta × tipo anual × días / 360. Semilla 0: 10.000 acciones a 20 €, 2 % anual, 90 días: 1.000 €. Distractores: 4.000 € (un año entero) y 875 € (calculada con el precio de recompra).
- **Paso 2 (resultado):** acciones × (venta − recompra) − comisión − dividendo manufacturado. Semilla 0: recompra a 17,50 €, dividendo de 0,40 €: 25.000 − 1.000 − 4.000 = 20.000 €. Distractores: 24.000 € (sin el dividendo) y 25.000 € (bruto). Hay semillas con pérdidas.
- **Paso 3 (margin call):** garantía del 150 % de lo vendido (convención del ejercicio; cada bróker fija la suya); la llamada llega cuando lo que sobra de la garantía tras descontar el valor de las acciones debidas baja del margen de mantenimiento: P0 × 1,5 / (1 + mm). Semilla 0, mm del 30 %: 23,08 €. Distractores: 26,00 € (P0 × (1 + mm)) y 30,00 € (P0 × 1,5, donde se pierde toda la garantía).
- **Paso 4 (CNMV):** Reglamento (UE) 236/2012 con el umbral de notificación del 0,1 % (Reglamento Delegado (UE) 2022/27) y el de publicación del 0,5 %. Semilla 0: 0,15 %, que se notifica. Posiciones posibles: 0,05 %, 0,08 %, 0,15 %, 0,3 %, 0,6 % y 0,8 %, nunca justo en un umbral.
- La semilla sortea acciones (5.000 a 20.000), precio (10 a 40 €), variación (−15 % a +20 %), tipo (1 a 8 %), días (30 a 180), dividendo (0,20 a 0,60 €), mantenimiento (25 a 35 %) y posición; las opciones de cada paso son distintas en 10.000 semillas.
- Nota: un cuarto por paso.
- Cifras para la lección (`shortValues`): `qty`, `p0`, `p1`, `move_pct`, `rate`, `days`, `fee`, `gross`, `div`, `div_paid`, `pnl`, `mm`, `call_price`, `wipe_price`, `short_pct`, `duty` (0, 1 o 2) y `hits`.
- Peor caso (`worst-seeds.ts`): semilla 640, corto de 20.000 acciones a 40 € que pierde 58.666,67 €, comisión con céntimos y posición publicada.

## Verificación
`short-desk.test.ts`, `tests/short-desk-game.test.tsx`, la rama `short-desk` de `e2e/play-game.ts`, `e2e/leccion-juego.spec.ts` («la posición corta de N5»), `e2e/peor-caso-juegos.spec.ts` (`n5/u3/l1`) y `e2e/n5u3.spec.ts`.
