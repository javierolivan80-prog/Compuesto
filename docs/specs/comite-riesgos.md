# Spec: lección-juego «Comité de riesgos» (`risk-committee`, unidad `n4-u6`)

Motor: `src/engine/games/risk-committee.ts`. Interfaz: `src/features/games/CommitteeGame.tsx` (con `AskStep`). Textos: `es.json` → `committeeGame`. Explicador de la unidad: `CreditRisk`. Ficha de partida: JUEGOS.md, juego 15 («Comité de riesgos», de la rama Banca y riesgos), en una versión troncal de cuatro pasos.

## Reglas
- El comité de riesgos de Banca Malvarrosa, banco comercial ficticio (el de `n4-u5`), con el equipo de Albufera Partners de observador. Cifras en miles de €.
- **Paso 1 (pérdida esperada):** EL = PD × LGD × EAD. Semilla 0: 2 % × 45 % × 1.000 = 9. Distractores: 20 (sin la LGD) y 450 (sin la PD).
- **Paso 2 (decisión), regla del comité:** si el margen anual (margen × EAD) supera la pérdida esperada, se concede; si solo supera la pérdida esperada con la garantía (LGD más baja), se pide la garantía; si no, se deniega. Semilla 0: margen de 8 frente a una EL de 9 sin garantía y de 5 con ella (LGD del 25 %): se pide la garantía. La semilla elige la decisión y pone el margen lejos de los umbrales (nunca coincide con una pérdida esperada).
- **Paso 3 (fase NIIF 9), regla de la mesa:** más de 90 días de retraso, fase 3; más de 30 días o una caída del rating de 3 escalones o más, fase 2; si no, fase 1. Las presunciones de 30 y 90 días son las de la norma; los 3 escalones son una simplificación. Semilla 0: 45 días, fase 2.
- **Paso 4 (provisión):** fase 1, PD a 12 meses × LGD × EAD; fase 2, PD de toda la vida × LGD × EAD; fase 3, LGD × EAD. Las opciones son las tres provisiones. Semilla 0: 8 % × 40 % × 600 = 19,2 (frente a 3,6 y 240). Se corrige con la fase real.
- Las semillas 0–80 cubren las tres decisiones y las tres fases; las opciones son distintas en 10.000 semillas.
- Nota: un cuarto por paso.
- Cifras para la lección (`committeeValues`): `ead`, `pd`, `lgd`, `el`, `margin`, `margin_income`, `lgd_collateral`, `el_collateral`, `ead2`, `pd12`, `pd_life`, `lgd2`, `days`, `notches`, `stage`, `provision` y `hits`.
- Peor caso (`worst-seeds.ts`): semilla 295, solicitud de 2.000 denegada y préstamo en fase 3 con 600 de provisión.

## Verificación
`risk-committee.test.ts`, `tests/committee-game.test.tsx`, la rama `risk-committee` de `e2e/play-game.ts`, `e2e/leccion-juego.spec.ts` («comité de riesgos»), `e2e/peor-caso-juegos.spec.ts` (`n4/u6/l1`) y `e2e/n4u6.spec.ts`.
