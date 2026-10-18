# Spec: lección-juego «Tus primeras acciones» (`n1-u1-l6`)

Abre la planta 0 y es lo primero que ve Javier tras el onboarding. Motor: `src/engine/games/first-shares.ts`; interfaz: `src/features/games/FirstSharesGame.tsx`; textos: `es.json` → `firstShares`.

## Reglas
- Tienes 100 de las 12.000.000 acciones de Naranjas del Turia (cifra de `companies.json`, comprobada por test). Precio inicial entre 9,00 y 9,99 € según la semilla.
- Cinco noticias distintas de un banco de nueve: dos suben (+2,5 a +6 %), dos bajan (−2,5 a −6 %) y una no trae nada nuevo (−0,4 a +0,4 %). Los precios se redondean al céntimo tras cada noticia.
- Predices ▲ Sube / ▼ Baja / ＝ Apenas se mueve. Nota corregida por azar: acertar 1 de cada 3 da 0; acertar las 5, 1.
- Cifras que devuelve: `start`, `end`, `shares`, `cap_start`, `cap_end`, `pct`, `free_float`, `float_cap`, `stake`, `stake_start`, `stake_end`, `hits`.

## Escenarios
- **Dado** un usuario nuevo, **cuando** termina el onboarding, **entonces** llega a esta lección (`#/leccion/n1-u1-l6`) y ve el juego, no la teoría.
- **Dada** una noticia, **cuando** elige una dirección, **entonces** se forma la vela, se actualizan precio, capitalización y lo que valen sus acciones, y aparece ✓/✗ con el porqué de la noticia.
- **Cuando** acaba, **entonces** ve precio inicial → final, variación con signo y flecha, capitalización y aciertos; «Ver qué ha pasado» lleva a las tarjetas con sus cifras.
- **En el repaso**, los ejercicios paramétricos usan cifras nuevas dentro de sus rangos.
- Con `prefers-reduced-motion`, la vela sale formada y los puntos de la línea no se animan.

## Verificación
`first-shares.test.ts` (motor), `tests/first-shares-game.test.tsx` (interfaz), `e2e/leccion-juego.spec.ts` (onboarding → juego, axe, 375 px sin scroll horizontal, lección entera) y `content:validate` con tres partidas de referencia.
