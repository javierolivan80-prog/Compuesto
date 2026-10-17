---
name: revisar-unidad
description: Pasa una unidad de contenido de Compuesto por el subagente revisor-financiero, contrasta los cálculos con la skill de dominio y el modelo de referencia que toquen, y aplica sus correcciones hasta aprobar. Úsala tras generar o editar contenido educativo.
---

# Revisar una unidad

1. Ejecuta `npm run content:validate`; no sigas si falla.
2. **Elige la lista de comprobación de dominio** según el tipo de unidad (tabla de `crear-unidad` y la de abajo) y pásasela al revisor junto con las rutas. No le pases tu opinión sobre si es correcta: debe resolver los ejercicios por su cuenta.
3. Invoca el subagente `revisor-financiero` (herramienta Agent).
4. Por cada error: `critico` y `mayor` se corrigen siempre; `menor` se corrige salvo motivo anotado. Si el revisor se equivoca, comprueba el cálculo a mano y justifica el rechazo en `CONTENIDO-QA.md`.
5. Si se corrigió un ejercicio ya `published`: el `id` no cambia, sube `version`.
6. Repite 1–5 hasta veredicto `aprobada`. Máximo 3 rondas: si no converge, para y explica.
7. Registra rondas y resultado en `CONTENIDO-QA.md`. No marques `published`.

## Qué comprobar además, por tipo de unidad

Las skills sirven para saber **qué mirar**; la corrección se decide con la bibliografía de TEMARIO §3b y la fuente oficial.

| Tipo de unidad | Comprobación | Skill que da la lista |
|---|---|---|
| Cualquier unidad con modelo (3 estados, DCF, LBO, merger) | Cada cifra coincide con el JSON de `/content/shared/models/` y su test pasa | `modelo-referencia` |
| Contabilidad | Asientos que cuadran; criterio PGC vs NIIF explícito cuando difieren (fondo de comercio, arrendamientos, gastos de I+D) | knowledge-work `finance`, `3-statement-model` (Core Linkages) |
| Valoración | FCFF vs FCFE coherentes con la tasa; mitad de año; g < WACC; caja neta con signo correcto; dilución (treasury stock method) | `dcf-model`, `comps-analysis`, `company-valuation` |
| LBO / PE | Fuentes = usos; interés sobre saldo inicial; barrido con prioridad; TIR y MOIC con signos correctos; art. 16 LIS | `lbo-model`, `returns-analysis` |
| M&A | Acreción con BPA, no con beneficio; acciones nuevas al precio de la compradora; PPA e impuesto diferido | `merger-model`, andreworia `accretion-dilution-tester` (consulta) |
| Renta fija | Convención de días y frecuencia; duración modificada vs Macaulay; signo de la convexidad | `fixed-income-sovereign`, `fixed-income-corporate` |
| Derivados | Paridad put-call; payoff neto de prima; unidades de las griegas | `options-payoff`, `options-strategy-advisor` |
| Carteras, riesgo, estadística | n − 1 en varianza muestral; anualización (√252 vs √12); VaR con horizonte y nivel; sesgo de supervivencia y look-ahead | `statistics-fundamentals`, `historical-risk`, `forward-risk`, `backtest-expert` |
| Banca | Fases IFRS 9 y pérdida esperada 12 meses vs vida; colchones de capital y requisitos vigentes con fecha | GAJETOso `ecl-computation`, `banking-compliance` (consulta) |
| Buy-side | Tesis con percepción diferencial, catalizador y qué la invalidaría; no es recomendación sobre empresas reales | ai-berkshire `/investment-checklist`, `/thesis-tracker` (marco) |
| Evaluación (Jefe final, test de salto) | Mide el objetivo de la unidad y no la lectura; una sola respuesta correcta; distractores plausibles | `assessment-validity-checker` |
