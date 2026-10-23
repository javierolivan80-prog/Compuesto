# Spec: lección-juego «La prima de riesgo» (`risk-premium`, unidad `n4-u3`)

Motor: `src/engine/games/risk-premium.ts`. Interfaz: `src/features/games/RiskGame.tsx` (con `AskStep`). Textos: `es.json` → `riskGame`. Explicador de la unidad: `RiskPremiumGap`.

## Reglas
- La mesa de Albufera Partners lee la economía de un país ficticio. Semilla 0: PIB real +1 % con un potencial del 1,5 %, inflación del 3,4 % al 3,2 %, PMI 50,8; España a 10 años al 3,45 % y Bund al 2,6 %; deuda de 1.050 y PIB nominal de 1.000 (miles de millones de €), déficit de 30 y crecimiento nominal del 4 %.
- **Paso 1 (fase del ciclo), regla determinista de la mesa:** si el PIB real crece por encima de su potencial, decide la inflación (subiendo → auge o sobrecalentamiento; bajando → expansión); si crece por debajo, decide el PMI (> 50 → desaceleración; < 50 → recesión). Semilla 0: desaceleración. Opciones fijas: las cuatro fases.
- **Paso 2 (rotación sectorial):** en expansión y auge **suelen** ir mejor las cíclicas; en desaceleración y recesión, las defensivas. Se corrige con la fase real, no con la elegida. Semilla 0: defensivas.
- **Paso 3 (prima de riesgo):** (España − Bund) × 100 = 85 pb. Distractores: 0,85 pb (sin × 100) y −85 pb (al revés).
- **Paso 4 (deuda/PIB):** (deuda + déficit) / (PIB × (1 + g)) = 1.080 / 1.040 = 103,8 % (1 decimal), desde el 105 %. Distractores: 108 % (sin crecer el PIB) y 101 % (sin sumar el déficit).
- Las demás semillas sortean primero la fase (las cuatro salen en las semillas 0–80) y después datos coherentes con ella: potencial 1,5 o 2 %; PMI > 50 siempre que el PIB supere su potencial; Bund del 2,2 al 2,75 %; prima de 55 a 245 pb; PIB de 1.000 o 1.200; deuda/PIB inicial del 65 al 110 %; déficit del 1 al 5 % del PIB; crecimiento nominal del 2 al 6 %. Todas las opciones de deuda/PIB quedan entre el 60 y el 120 %.
- Nota: un cuarto por paso.
- Cifras para la lección (`premiumValues`): `growth`, `potential`, `infl_prev`, `infl_now`, `pmi`, `spain`, `bund`, `spread_bp`, `debt`, `gdp`, `deficit`, `nominal_growth`, `debt_ratio0`, `debt_ratio1` y `hits`.
- Peor caso (`worst-seeds.ts`): semilla 1453, recesión con PIB de 1.200 y prima de 245 pb.

## Verificación
`risk-premium.test.ts` (semilla 0 exacta; opciones distintas con la buena y cifras en rango en las semillas 0–80; las cuatro fases), `tests/risk-game.test.tsx`, la rama `risk-premium` de `e2e/play-game.ts`, `e2e/leccion-juego.spec.ts` («la prima de riesgo»), `e2e/peor-caso-juegos.spec.ts` (`n4/u3/l1`) y `e2e/n4u3.spec.ts`.
