# Spec: lección-juego «¿Quién mueve el índice?» (`n1-u3-l6`)

Motor: `src/engine/games/index-mover.ts`. Interfaz: `src/features/games/IndexGame.tsx`. Textos: `es.json` → `indexMover`.

## Reglas
- Turia 6: AZA, PIR, TRA, MED, NAR, ALB. Peso = capitalización ajustada por free float ÷ total, sin topes. Base: 1.000 puntos.
- Cuatro sesiones, una de cada tipo y en el orden que marca la semilla:
  - `small-big`: una pequeña sube entre un 6 % y un 9 % y la grande baja entre un 0,8 % y un 1,4 %;
  - `big-up`: la grande sube entre un 1,5 % y un 2,5 % y todas las demás bajan;
  - `second-down`: la segunda cae entre un 3 % y un 4,5 % y una pequeña sube entre un 2 % y un 4 %;
  - `all-up`: todas suben entre un 0,3 % y un 1,2 %.

  El resto de las empresas se mueve entre −0,6 % y +0,6 %.
- Variación del índice = Σ peso × variación. Los pesos se recalculan cada día.
- Predicción entre −3 % y +3 %, en décimas. Acierto a ≤ 0,15 p. p. (1) o a ≤ 0,5 p. p. (0,5).

## Escenarios
- **Dada** una sesión, **entonces** ves el peso y la variación de cada empresa (con ▲▼ y signo) y el nivel del Turia 6.
- **Cuando** predices y pulsas «Ver el cierre», **entonces** el índice se actualiza, ves ✓/≈/✗ y las aportaciones como barras que salen del centro, ordenadas por tamaño, con la explicación del tipo de sesión.
- **Al terminar**, ves los puntos inicial y final, la variación y los aciertos; «Ver qué ha pasado» lleva a las tarjetas con tus cifras.

## Verificación
`index-mover.test.ts`, `tests/index-game.test.tsx`, `e2e/leccion-juego.spec.ts` (axe y 375 px), `e2e/n1u3.spec.ts` (la unidad entera) y `content:validate` con tres partidas de referencia.
