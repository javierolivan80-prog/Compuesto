---
name: nuevo-explicador
description: Convierte una ficha de docs/ANIMACIONES.md §2 en un componente Explainer de Compuesto con estado final estático y test. Úsala al crear un explicador visual para una lección.
---

# Nuevo explicador

Fuente: `docs/ANIMACIONES.md` §1–§2 y §8, `CLAUDE.md` §6.

1. Lee la ficha del explicador y los tokens de motion (`/src/design/motion.ts`).
2. Crea el componente en `/src/features/lesson/explainers/<Nombre>.tsx` sobre el `<Explainer>` común: ▶, slider/arrastre, pasos numerados sincronizados, "Otra vez", **estado final estático** y descripción para lector de pantalla; evento `explainer_interacted`.
3. Recibe por props los valores reales del ejercicio; nunca datos hardcodeados. Declarable en JSON: `{ "type": "visual", "component": "<Nombre>", "props": {...} }`.
4. Cálculos en `/src/engine` con tests. Solo `transform`/`opacity`; `prefers-reduced-motion` sustituye movimiento por fundidos sin perder información.
5. Test de componente (estado final y descripción accesible). Ejecuta typecheck, lint, test, build.
6. Pasa `review-animations` y `/impeccable critique` si están disponibles.
