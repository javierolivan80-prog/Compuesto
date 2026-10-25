# Spec: lección-juego «¿Qué banco compras?» (`bank-valuation`, unidad `n4-u7`)

Motor: `src/engine/games/bank-valuation.ts`. Interfaz: `src/features/games/BankGame.tsx` (con `AskStep`). Textos: `es.json` → `bankGame`. Explicador de la unidad: `BankMultiple`. No había ficha en JUEGOS.md; el juego es nuevo.

## Reglas
- El equipo de research de Albufera Partners compara dos bancos comerciales ficticios: Banca Malvarrosa (la de `n4-u5` y `n4-u6`) y Banco Russafa. Cifras en millones de €.
- **Paso 1 (ROTE):** beneficio neto / (patrimonio − intangibles), con 1 decimal. Semilla 0: 168 / (1.600 − 200) = 12 %. Distractores: 10,5 % (el ROE) y 9,3 % (sumando los intangibles).
- **Paso 2 (P/VTC):** capitalización / patrimonio tangible, con 2 decimales. Semilla 0: 1.540 / 1.400 = 1,10x. Distractores: 0,96x (el P/VC) y 0,86x (sumando los intangibles).
- **Paso 3 (P/VTC justificado):** (ROTE − g) / (Ke − g). Semilla 0: (12 − 2) / (10 − 2) = 1,25x. Distractores: 1,20x (ROTE / Ke) y 1,00x ((ROTE − g) / Ke). El ROTE nunca iguala al Ke, porque entonces el justificado (1) coincidiría con ROTE / Ke.
- **Paso 4 (elección):** Banco Russafa da su ROTE y su P/VTC, con el mismo Ke y el mismo g. Se compra el banco con más recorrido hasta su justificado (justificado / cotizado − 1). Semilla 0: Russafa, con un ROTE del 15 % y a 1,70x, vale 1,63x (−4 %); Malvarrosa, a 1,10x, vale 1,25x (+14 %). Se compra Malvarrosa aunque su ROTE sea menor.
- Rangos: Malvarrosa cotiza entre un 20 % por debajo y un 20 % por encima de su justificado; el recorrido de Russafa se separa del de Malvarrosa 15 o 20 puntos, y su P/VTC queda entre 0,4x y 2,8x (si el sentido sorteado lo saca de ahí, se usa el otro). Comprobado en 10.000 semillas.
- Nota: un cuarto por paso.
- Cifras para la lección (`bankValues`): `ni`, `equity`, `intangibles`, `tangible`, `rote`, `roe`, `cap`, `f_pvtc` (el factor del sorteo, para que l1 recalcule la capitalización), `pvtc`, `pvc`, `ke`, `g`, `justified`, `rote_r`, `pvtc_r`, `justified_r` y `hits`.
- Peor caso (`worst-seeds.ts`): semilla 111, patrimonio de 1.900, capitalización de 3.200 y Russafa como ganador.

## Verificación
`bank-valuation.test.ts`, `tests/bank-game.test.tsx`, la rama `bank-valuation` de `e2e/play-game.ts`, `e2e/leccion-juego.spec.ts` («qué banco compras»), `e2e/peor-caso-juegos.spec.ts` (`n4/u7/l1`) y `e2e/n4u7.spec.ts`.
