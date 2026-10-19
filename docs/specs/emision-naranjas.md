# Spec: lección-juego «La emisión de Naranjas» (`n2-u1-l1`)

Motor: `src/engine/games/bond-issue.ts`. Interfaz: `src/features/games/BondGame.tsx`. Textos: `es.json` → `bondGame`. Explicador de la unidad: `BondSeesaw` (l2).

## Reglas
- Naranjas emite 20 millones de € en bonos de 1.000 € a 5 años, con cupón anual. Los precios van por cada 100 de nominal y no hay cupón corrido: la emisión y la compra son en fecha de cupón.
- Rentabilidad pedida = Bono del Estado a 5 años + diferencial de Naranjas. Semilla 0: 2,8 % + 1,4 = 4,2 %. Las demás semillas sortean 2,5/2,8/3,1 y 1,2/1,4/1,6.
- **Paso 1:** eliges el cupón (del 2 % al 6 %, en pasos de 0,1; empieza en el 3 %) y ves en vivo el precio, lo que se capta y los cupones al año. Se acierta con el precio entre 99,5 y 100,5.
- **Paso 2:** un año después los tipos se mueven (semilla 0: +1 punto; las demás, ±1 o ±0,5). Predices si el precio sube o baja y lo ves.
- **Paso 3:** un inversor compra a ese precio. Eliges su TIR entre la del mercado (la buena), el cupón y la rentabilidad de emisión.
- **Simplificación declarada:** el movimiento de tipos se traslada uno a uno a la rentabilidad que piden a Naranjas (el diferencial no cambia).
- Nota: 40 % la par, 30 % la dirección y 30 % la TIR.

## Verificación
`bond-issue.test.ts`, `tests/bond-game.test.tsx`, `explainers.test.tsx` (BondSeesaw), `e2e/leccion-juego.spec.ts`, `e2e/peor-caso-juegos.spec.ts`, `e2e/n2u1.spec.ts` y `content:validate`.
