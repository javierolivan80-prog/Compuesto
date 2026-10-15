---
name: crear-unidad
description: Flujo completo para crear una unidad de contenido educativo de Compuesto (una por conversación): generar en draft, validar, revisar con subagente, dejar en reviewed. Úsala cuando se pida crear o ampliar una unidad, lección o ejercicios.
---

# Crear una unidad de contenido

Fuente: `docs/TEMARIO.md` (esquema §7, calidad §8) y `CLAUDE.md` §8–§9. **Una unidad por conversación.**

1. Lee en `docs/TEMARIO.md` la unidad pedida, el mapa de conceptos y el esquema JSON. Confirma que sus dependencias (conceptos previos) existen.
2. Genera la unidad en `/content/es/levels/...` con `status: "draft"`: 6–10 ejercicios por lección, ≥ 40 % de tipo producir, empresas ficticias (reales solo en `document_read` e históricas), IDs inmutables, textos en `es`. Toda fiscalidad o normativa con fuente oficial y fecha (`sources`, `verificarAntesDe`).
3. Ejecuta `npm run content:validate` y `npm run content:check`; corrige hasta que pasen. Si faltan los tests de fórmulas, escríbelos.
4. Usa la skill `revisar-unidad` (subagente `revisor-financiero`) y aplica sus cambios.
5. Deja `status: "reviewed"`. **Nunca `published`**: eso lo decide Javier tras su revisión (🛑). Anótalo en `CONTENIDO-QA.md`.
6. Informe según `EXECUTION.md` §6.
