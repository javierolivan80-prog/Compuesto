# Spec: lección-juego «Contra el VWAP» de N5 (`vwap-desk`, unidad `n5-u2`)

Motor: `src/engine/games/vwap-desk.ts`. Interfaz: `src/features/games/VwapDeskGame.tsx` (con `AskStep`). Textos: `es.json` → `vwapDeskGame`. Explicador de la unidad: `CostStack` (nuevo, en l4). Ficha: ninguna de JUEGOS.md encaja (la 3 ya se usó en n5-u1 y la 11 es la variante de n5-u6), así que es un juego sencillo de cuatro pasos, como permite DECISIONES (N5, juegos de u2–u5).

## Reglas
- No repite n1-u4 (subasta de apertura, trocear, orden limitada): mide la ejecución de una compra ya hecha con las referencias de una mesa profesional. Acción ficticia española; precios en céntimos (el VWAP, en décimas de céntimo).
- **Paso 1 (VWAP):** Σ(precio × volumen) / Σ volumen de tres tramos (mañana, mediodía y tarde). Semilla 0: 10,04 € × 20.000, 10,10 € × 50.000 y 10,16 € × 30.000: 10,106 €. Distractores: la media simple, 10,100 € (lo que seguiría un TWAP con tramos iguales), y el último precio, 10,160 €.
- **Paso 2 (implementation shortfall):** (tu precio medio − precio de llegada) / precio de llegada, en pb. Semilla 0: llegada 10,00 €, tu precio 10,08 €: 80,0 pb. Distractores: −25,7 pb (tu desviación frente al VWAP: lo batiste y aun así pagaste de más) y 106,0 pb (lo que subió el VWAP desde la llegada).
- **Paso 3 (costes explícitos):** comisión (3, 5, 8 o 10 pb del efectivo) más el impuesto sobre las transacciones financieras (0,2 %) solo si es una compra de una empresa española de más de 1.000 M€. Tres casos: compra en una empresa de 4.000 M€ (lo paga), compra en una de 600 M€ y venta (no lo pagan). Semilla 0: 50.000 acciones a 10,08 €, efectivo de 504.000 €: 252 € + 1.008 € = 1.260 €. Distractores: la comisión sola, el impuesto solo o la suma, según el caso.
- **Paso 4 (dónde ejecutar):** fondo indexado que se valora al cierre → subasta de cierre; orden grande sin prisa medida contra el VWAP → algoritmo VWAP; orden pequeña y urgente → ya, a mercado. Semilla 0: subasta de cierre.
- La semilla sortea precio de llegada (8 a 20 €), tramos siempre al alza, volúmenes de 10.000 a 50.000, tu precio entre el primer y el segundo tramo, tamaño, comisión, caso del impuesto y cliente; se repite el sorteo de precios hasta que las tres opciones de los pasos 1 y 2 se distinguen. Comprobado en 10.000 semillas.
- Nota: un cuarto por paso.
- Cifras para la lección (`vwapValues`): `arrival`, `p1`–`p3`, `v1`–`v3`, `d1_c`–`d3_c` (céntimos de cada tramo sobre la llegada), `fill_c`, `vwap`, `twap`, `fill`, `shortfall_bp`, `vs_vwap_bp`, `drift_bp`, `qty`, `value`, `comm_bp`, `commission`, `itf`, `itf_applies`, `explicit` y `hits`. Los ejercicios de l1 derivan los precios de `arrival` y los céntimos, para que en el repaso los tramos sigan siendo coherentes.
- Peor caso (`worst-seeds.ts`): semilla 158, compra de 100.000 acciones a 20,06 €, efectivo de 2.006.000 € y 5.616,80 € de costes explícitos.

## Verificación
`vwap-desk.test.ts`, `tests/vwap-desk-game.test.tsx`, la rama `vwap-desk` de `e2e/play-game.ts`, `e2e/leccion-juego.spec.ts` («contra el VWAP de N5»), `e2e/peor-caso-juegos.spec.ts` (`n5/u2/l1`) y `e2e/n5u2.spec.ts`.
