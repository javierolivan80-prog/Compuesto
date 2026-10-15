---
name: revisar-unidad
description: Pasa una unidad de contenido de Compuesto por el subagente revisor-financiero y aplica sus correcciones hasta aprobar. Úsala tras generar o editar contenido educativo.
---

# Revisar una unidad

1. Ejecuta `npm run content:validate`; no sigas si falla.
2. Invoca el subagente `revisor-financiero` (herramienta Agent) indicando las rutas de la unidad. No le pases tu opinión sobre si es correcta: debe resolver los ejercicios por su cuenta.
3. Por cada error: `critico` y `mayor` se corrigen siempre; `menor` se corrige salvo motivo anotado. Si el revisor se equivoca, comprueba el cálculo a mano y justifica el rechazo en `CONTENIDO-QA.md`.
4. Si se corrigió un ejercicio ya `published`: el `id` no cambia, sube `version`.
5. Repite 1–4 hasta veredicto `aprobada`. Máximo 3 rondas: si no converge, para y explica.
6. Registra rondas y resultado en `CONTENIDO-QA.md`. No marques `published`.
