# Spec: lección-juego «¿Suerte o habilidad?» (`n2-u4-l1`)

Motor: `src/engine/games/luck-or-skill.ts`. Interfaz: `src/features/games/LuckGame.tsx`. Textos: `es.json` → `luckGame`. Explicador de la unidad: `NormalTails` (l3).

## Reglas
- Doce rentabilidades mensuales de dos fondos con la misma media (semilla 0: 0,5 %): A tranquilo (desviación típica 0,85) y B volátil (3,42). Las series se generan con semilla y se ajustan para que las dos medias sean exactamente iguales.
- **Paso 1:** la media de A. Las opciones son la buena, la mediana y la suma.
- **Paso 2:** cuál es más volátil.
- **Paso 3:** con qué frecuencia caen los mercados más de tres desviaciones típicas: lo que dice la normal (1,3 meses de cada 1.000) o bastante más a menudo (con una t de Student de 3 grados de libertad reescalada a la misma volatilidad, 6,9 de cada 1.000). A dos desviaciones las colas gordas no dan más caídas, porque con la misma volatilidad tienen más pico (revisión, ronda 1).
- **Paso 4:** 32 becarios lanzan una moneda 5 meses. Lo correcto es no fichar al que acierta todo: de media, uno lo consigue por azar.
- **Simplificación declarada:** si en la tirada nadie acierta los cinco (pasa en ~36 % de las semillas), la partida fija uno para que la historia funcione; el texto habla de la media esperada, que es 1.
- Nota: 25 % por paso.

## Verificación
`luck-or-skill.test.ts`, `tests/luck-game.test.tsx`, `explainers.test.tsx` (NormalTails), `e2e/leccion-juego.spec.ts`, `e2e/peor-caso-juegos.spec.ts`, `e2e/n2u4.spec.ts` y `content:validate`.
