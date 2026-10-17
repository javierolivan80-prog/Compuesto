# EXECUTION.md — Cómo se ejecuta y verifica el trabajo en Compuesto

> `CLAUDE.md` dice **qué** es el producto. `FASES.md` dice **qué** construir y en qué orden. Este documento dice **cómo** trabajar, comprobar e informar. Se aplica a cada tarea.

---

## 1. Antes de tocar nada

1. **Mira el estado real del repositorio:** `git status`, últimos commits, estructura, `package.json`, `DECISIONES.md` y el último informe de tarea. No supongas que algo existe porque un documento lo mencione.
2. **Confirma las dependencias de la tarea** (campo "Depende de" en `FASES.md`). Si alguna no está cumplida, para y dilo.
3. **Escribe un plan breve** (5–10 líneas): qué harás, qué módulos tocarás, cómo lo comprobarás. Si la tarea no cabe en una sesión, divídela en hitos y anúncialos.
4. **Para tareas no triviales, usa la skill `nuevo-cambio`:** propuesta, spec con escenarios en `docs/specs/`, tareas y revisión adversarial antes de dar la tarea por terminada.

## 2. Mientras trabajas

- **Incrementos funcionales.** Cada hito deja algo que funciona de punta a punta (aunque sea pequeño), no solo archivos o pantallas vacías.
- **Nada aparente.** Prohibido: botones sin acción, mocks escondidos, datos inventados mostrados como reales, `TODO` sin anotar, tests saltados (`skip`/`only`) en commits. Si algo debe quedar provisional, se marca en el código con `// PROVISIONAL(tarea X.Y): motivo` y se lista en el informe.
- **Lógica primero, UI después.** La lógica va en `/src/engine` con sus tests antes de conectarla a la interfaz.
- **Decisiones técnicas** relevantes (librería elegida, versión fijada, cambio de enfoque, excepción a una regla) → una entrada en `DECISIONES.md`: fecha, decisión, motivo, alternativas descartadas.
- **No amplíes el alcance.** Lo que veas fuera de la tarea se anota en el informe como "siguiente paso", no se hace.
- **Commits pequeños** y convencionales (`feat:`, `fix:`, `content:`, `design:`, `test:`, `chore:`).

## 3. Verificación obligatoria

Ejecuta lo que aplique a la tarea y **pega el resultado real** en el informe:

| Comprobación | Comando | Cuándo |
|---|---|---|
| Tipos | `npm run typecheck` | Siempre |
| Lint | `npm run lint` | Siempre |
| Tests unitarios | `npm test` | Siempre |
| Build | `npm run build` | Siempre |
| Contenido | `npm run content:validate` | Si tocas `/content` o esquemas |
| E2E | `npm run e2e` | Si cambia un flujo de usuario |
| Diseño | `npx impeccable detect src/` | Si cambia UI |
| Accesibilidad y rendimiento | Lighthouse / axe en Playwright | Al cerrar cada pantalla y cada fase |

Reglas:
- **Nunca declares una prueba superada si no la has ejecutado** y has visto el resultado. Si no puedes ejecutarla (falta navegador, red, credenciales), dilo como "no verificado" y explica por qué.
- Un test que falla no se borra ni se debilita para que pase: se arregla el código o se justifica el cambio del test en el informe.
- Para lo que no se puede automatizar del todo (calidad visual, tono, pedagogía), haz capturas a 375/768/1440 px con Playwright y adjúntalas; la decisión final es humana.

## 4. Definición de terminado

Una tarea está terminada cuando:
- [ ] Cumple **todos** los criterios de aceptación de su prompt en `FASES.md`.
- [ ] Typecheck, lint, tests y build en verde (ejecutados, no supuestos).
- [ ] Textos nuevos en `es` y `en`.
- [ ] Pantallas con estados vacío, carga, error y offline.
- [ ] Usable con teclado y lector de pantalla; reduced-motion respetado.
- [ ] UI nueva revisada con critique + audit + polish (o motivo documentado si una skill no está disponible).
- [ ] Sin provisionales sin anotar.

## 5. Cuándo parar

Detente, explica el problema y propone opciones si:
- Un criterio de aceptación no se puede cumplir tal como está escrito.
- Falta una dependencia, credencial, cuenta o decisión que solo puede tomar el usuario.
- Una herramienta o versión resulta incompatible y la alternativa cambia una decisión de `CLAUDE.md`.
- Hay errores críticos (datos que se pierden, build roto, fallo de seguridad) que no se resuelven en un intento razonable.
- El prompt pide expresamente una revisión humana (puntos de control marcados con 🛑 en `FASES.md`).

No avances al siguiente hito con errores críticos o requisitos obligatorios pendientes.

## 6. Informe al terminar cada tarea

```
## Informe tarea X.Y — <título>
Estado: completada | parcial | bloqueada
Qué funciona ahora: (en lenguaje de usuario)
Archivos creados/modificados: (lista)
Verificación ejecutada: (comando → resultado real, una línea por comprobación)
No verificado y por qué:
Provisionales y limitaciones:
Decisiones añadidas a DECISIONES.md:
Siguiente paso recomendado:
```

## 7. Contenido educativo (resumen operativo)

El flujo completo está en `docs/TEMARIO.md` §8. Operativamente: **una unidad por conversación** → generar en `draft` → `content:validate` → subagente revisor → corregir → `reviewed` → 🛑 revisión de Javier → `published`. Claude nunca marca contenido como `published`.
