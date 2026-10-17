# Diseño: ejercicios paramétricos

## Enfoque
Una función pura `instantiate(ejercicio, semilla?)` en `src/engine/params.ts` devuelve un **ejercicio concreto del mismo tipo**: sin semilla, con los `value` del enunciado; con semilla, con cifras generadas. Las vistas y `grade()` no cambian: reciben siempre un ejercicio concreto. El `ExerciseRunner` instancia (prop `variantSeed`), así ningún camino de render enseña marcadores.

Descartado: generar las variantes en build y guardarlas en el JSON (multiplica el contenido, no da cifras nuevas cada día y obliga a revisar cada variante); y cambiar cada corrector para que lea parámetros (toca 3 correctores y sus vistas).

## Piezas
- Motor puro (`/src/engine/params.ts`): `instantiate`, `generateValues`, `fillText`, `fillFormula`, `markersOf`. PRNG `mulberry32` con hash FNV del texto de semilla.
- Contenido (`schemas.ts`): `params`, `derived`, `answerDecimals`, `answerRange` en los 3 tipos; `formula` opcional por fila de `build_statement`.
- Validación (`validate.ts`): marcadores definidos, `value` en rango y rejilla, la plantilla instanciada pasa las comprobaciones de siempre y 100 variantes también (+ `answerRange`).
- UI: `ExerciseRunner` (`variantSeed`), `ReviewScreen` (semilla «id#día» y registro de `params`).
- Datos/eventos: `exercise_answered.payload.params` opcional. Sin migración Dexie (el payload es JSON).

## Pruebas
- Unitarias: todas las ramas de `params.ts`; validación (fixtures con marcador desconocido, fórmula que divide por cero, `answerRange`); payload antiguo sin `params`.
- e2e: repasar un ejercicio paramétrico real enseña cifras distintas a las de la lección y corrige con la fórmula.
