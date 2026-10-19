# Spec: lección-juego «La mezcla de la financiación» (`n3-u5-l1`)

Motor: `src/engine/games/wacc-mix.ts`. Interfaz: `src/features/games/WaccGame.tsx`. Textos: `es.json` → `waccGame`. Explicador asociado: `WaccMix` (l4).

## Reglas
- La directora financiera de Naranjas pregunta cuánta deuda le conviene. Hoy se financia con un 20 % de deuda (D/E = 0,25).
- Semilla 0: las hipótesis del modelo DCF de referencia (`content/shared/models/naranjas-del-turia-dcf.json`): rf 3,25 %, prima de mercado 5,5 %, prima por tamaño 2 %, beta desapalancada 0,65, kd 4,5 %, t 25 %. Las demás semillas sortean rf, prima, beta, kd y el umbral.
- Paso 1: eliges la beta apalancada entre tres: la buena (Hamada), la desapalancada y la apalancada sin el (1 − t).
- Paso 2: mueves el peso de la deuda de 0 a 70 % (de 5 en 5; deslizador y botones −/+) y ves en vivo la beta, ke (CAPM + prima por tamaño), kd después de impuestos y el WACC. Propones una estructura.
- Paso 3: las curvas de ke, kd después de impuestos y WACC, con tu propuesta y el mínimo.
- **Simplificación declarada:** kd = kd0 + 0,15 × ((peso − umbral) / 5)², solo por encima del umbral (30 % en la semilla 0). Representa que los bancos encarecen el crédito con el riesgo de impago; no es una curva de mercado.
- Nota: 30 % por la beta y 70 % por la estructura, que pierde con el cuadrado de los puntos de WACC por encima del mínimo (cero a partir de 1 punto).

## Verificación
`wacc-mix.test.ts`, `tests/wacc-game.test.tsx`, `explainers.test.tsx` (WaccMix), `e2e/leccion-juego.spec.ts`, `e2e/peor-caso-juegos.spec.ts`, `e2e/n3u5.spec.ts` y `content:validate`.
