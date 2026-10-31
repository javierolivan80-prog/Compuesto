# Spec: lección-juego «Máquina del tiempo» de N6 (`time-machine`, unidad `n6-u3`)

Motor: `src/engine/games/time-machine.ts`. Interfaz: `src/features/games/TimeMachineGame.tsx` (con `AskStep`). Textos: `es.json` → `timeMachineGame`. Explicador de la unidad: `VarTail` (catálogo, nivel 6; en l3). Ficha 6 de JUEGOS.md en su versión de N6: la mesa de riesgos rebobina a 2007-2008 para medir el riesgo y salta a otra crisis (2000, 2012 o 2020) para un punto de decisión. La pantalla avisa de que las cifras de las crisis son aproximadas e ilustrativas, y la cartera es ficticia.

## Reglas
- **Paso 1 (VaR paramétrico, 2007):** VaR a un día = z × σ × valor, con media diaria cero y z = 1,645 (95 %) o 2,33 (99 %); el porcentaje se redondea a 2 decimales. Semilla 0: 1.000.000 €, σ 1 %, 99 %: 23.300 €. Distractores: con el z del otro nivel (16.500 €) y sin z (10.000 €).
- **Paso 2 (CVaR, otoño de 2008):** media de los cinco peores días, todos por encima del VaR. Semilla 0: 9; 7,6; 6,9; 6,1 y 5,4 % → 7 %. Distractores: el peor día (9 %) y el VaR (2,33 %).
- **Paso 3 (backtesting en 2008):** excepciones esperadas = 250 × (1 − confianza). Semilla 0: 2,5 frente a 12 observadas, zona roja del semáforo de Basilea (al 99 %: verde 0–4, amarilla 5–9, roja 10 o más; al 95 % no se muestra zona). Distractores: las observadas y 1.
- **Paso 4 (decisión en otra crisis):** con la cartera muy por debajo y titulares alarmistas: mantener el plan y rebalancear (bien), venderlo todo o pedir prestado para comprar más. La explicación compara con quien no hizo nada: vender fija la pérdida y apalancarse arriesga un margin call; quien mantuvo se recuperó (años tras 2000 y 2012, meses tras 2020).
- La semilla sortea valor (1, 2 o 5 millones), σ (0,8; 1 o 1,2 %), confianza, los peores días, las excepciones observadas (8 a 18) y la crisis del paso 4, y repite el sorteo hasta que las opciones de cada paso se distinguen y todos los peores días superan el VaR (comprobado en 10.000 semillas, con las tres crisis).
- Nota: un cuarto por paso.
- Cifras para la lección (`machineValues`): `value`, `sigma`, `conf`, `tail`, `z`, `var_pct`, `var_eur`, `worst`, `cvar_pct`, `cvar_eur`, `days`, `expected`, `observed` y `hits`.
- Peor caso (`worst-seeds.ts`): semilla 31, 5.000.000 € al 95 % con σ 1,2 %: VaR de 98.500 € y CVaR del 7,66 %.

## Verificación
`time-machine.test.ts`, `tests/time-machine-game.test.tsx`, la rama `time-machine` de `e2e/play-game.ts`, `e2e/leccion-juego.spec.ts` («la máquina del tiempo de N6»), `e2e/peor-caso-juegos.spec.ts` (`n6/u3/l1`) y `e2e/n6u3.spec.ts`.
