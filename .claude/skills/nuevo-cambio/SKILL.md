---
name: nuevo-cambio
description: Flujo ligero de especificación antes de construir (inspirado en OpenSpec y BMAD). Úsala al empezar cualquier tarea no trivial de FASES.md o un cambio que altere comportamiento visible: propuesta, spec con escenarios, tareas, construcción, revisión adversarial y archivado.
---

# Nuevo cambio (spec → construir → revisar → archivar)

No sustituye a `FASES.md` ni a `EXECUTION.md`: los complementa. Si algo contradice a `CLAUDE.md`, manda `CLAUDE.md`.

1. **Propuesta.** Copia `docs/cambios/_plantilla/` a `docs/cambios/<fase>-<nombre>/` y rellena `proposal.md` (por qué, qué cambia, fuera de alcance, restricciones de CLAUDE.md que aplican).
2. **Spec.** Añade o modifica `docs/specs/<capacidad>.md` con escenarios Dado/Cuando/Entonces. Cada escenario debe poder comprobarse con un test.
3. **Diseño y tareas.** `design.md` breve y `tasks.md` con casillas.
4. **Construir** siguiendo `tasks.md`; motor puro primero, tests de cada rama, luego UI, luego e2e.
5. **Verificar de verdad** (`EXECUTION.md`): `typecheck`, `lint`, `vitest`, `content:validate`, e2e. Informar solo lo ejecutado.
6. **Revisión adversarial** (rol de QA, como en BMAD): relee el diff buscando qué rompe un escenario de la spec, casos límite (vacío, texto largo, offline, teclado, 375 px) y contradicciones con CLAUDE.md §2. Para contenido educativo, además el subagente `revisor-financiero`.
7. **Archivar.** Marca las tareas, mueve la carpeta a `docs/cambios/archivo/` y anota decisiones en `DECISIONES.md`.

Roles (BMAD) que se asumen en orden, sin agentes extra: **producto** (por qué/alcance) → **arquitectura** (diseño) → **UX** (`/impeccable`, `docs/ANIMACIONES.md`) → **desarrollo** → **QA** (paso 6).
