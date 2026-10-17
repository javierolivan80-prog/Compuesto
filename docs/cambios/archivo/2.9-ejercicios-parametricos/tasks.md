# Tareas: ejercicios paramétricos

- [x] 1. Spec en `docs/specs/ejercicios-parametricos.md` (escenarios Dado/Cuando/Entonces)
- [x] 2. Motor `src/engine/params.ts` + `params.test.ts`; esquema (`params`, `derived`, `answerDecimals`, `answerRange`, `formula` por fila)
- [x] 3. `content:validate`: marcadores, rejilla, plantilla y 100 semillas (+ tests en `validate.test.ts`)
- [x] 4. UI: `ExerciseRunner` (`variantSeed`, salvaguarda si una variante falla), `ReviewScreen` (semilla «id#día», `params` en el evento), `library.ts` sin marcadores en listados
- [x] 5. Evento `exercise_answered.payload.params` opcional y compatible
- [x] 6. Contenido de muestra: `n0-u1-l2-e4` (numeric_input) y `n0-u2-l3-e3` (spreadsheet), ronda 1 del revisor aplicada
- [x] 7. e2e: repaso con cifras nuevas, la respuesta del enunciado ya no vale y la de la fórmula sí; solver e2e reconoce variantes
- [x] 8. `typecheck`, `lint`, `vitest`, `content:validate`, build y e2e
- [x] 9. Revisión adversarial
- [ ] 10. Ronda 2 del revisor sobre los 2 ejercicios (cortada por límite de uso; pendiente)
