# Spec: lección-juego «La reunión del BCE» (`ecb-meeting`, unidad `n4-u2`)

Motor: `src/engine/games/ecb-meeting.ts`. Interfaz: `src/features/games/EcbGame.tsx` (con `AskStep`). Textos: `es.json` → `ecbGame`. El contenido de las lecciones de la unidad se escribe aparte.

## Reglas
- El día de la reunión del BCE en una economía ficticia, desde la mesa de Albufera Partners. Semilla 0: tipo neutral real del 1 %, inflación del 3 %, objetivo del 2 %; el mercado descontaba +25 pb y el BCE sube 50 pb; hipoteca variable de 150.000 € al Euríbor + 1 %, con el Euríbor del 3 % al 3,5 %.
- **Paso 1 (regla de Taylor simplificada):** tipo = neutral + inflación + 0,5 × (inflación − 2 %) = 1 + 3 + 0,5 × 1 = 4,5 %. Distractores: 4 % (sin el término de la brecha) y 5 % (la brecha entera, sin el 0,5).
- **Paso 2 (decisión frente a lo descontado):** sorpresa de +25 pb → el euro se aprecia frente al dólar, a igualdad de lo demás. Respuestas fijas: `up` (se aprecia), `down` (se deprecia) y `flat` (apenas se mueve). Sin sorpresa, `flat`; menos de lo esperado, `down`.
- **Paso 3 (transmisión):** subida aproximada del interés del primer año = 150.000 × 0,5 % = 750 €. Distractores: 75 € (falta un cero) y 5.250 € (150.000 × 3,5 %, el interés al Euríbor nuevo).
- **Paso 4 (QE):** las compras del banco central suben el precio del bono a 10 años y bajan su rentabilidad. Opciones: eso, lo contrario y «no les afecta».
- Las demás semillas sortean el neutral (0,5, 1 o 1,5 %), la inflación (1,5, 2,5, 3 o 4 %; nunca el objetivo, para que la regla y «sin brecha» no coincidan), lo descontado (0, 25 o 50 pb), la sorpresa (−25, 0 o +25 pb), el principal (100.000, 150.000 o 200.000 €) y la subida del Euríbor (0,25, 0,5 o 0,75 puntos, desde el 3 %).
- Nota: un cuarto por paso.
- Cifras para la lección (`ecbValues`): `neutral`, `inflation`, `target`, `taylor`, `priced_bp`, `move_bp`, `surprise_bp`, `principal`, `euribor0`, `euribor1`, `extra_interest` y `hits`.

## Verificación
`ecb-meeting.test.ts` (semilla 0 exacta; opciones distintas con la buena en las semillas 0–60), `tests/ecb-game.test.tsx` y la rama `ecb-meeting` de `e2e/play-game.ts`. Las pruebas E2E y `content:validate` de la unidad llegan con su contenido.
