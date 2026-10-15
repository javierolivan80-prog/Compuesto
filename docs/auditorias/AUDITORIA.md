# AUDITORÍA del plan de Compuesto — 13/10/2026

Revisados: `CLAUDE.md`, `FASES.md`, `docs/TEMARIO.md` (v4). Comprobaciones hechas contra el registro de npm el 13/10/2026; lo que no se pudo comprobar está marcado.

---

## 🔴 Crítico

| # | Problema | Por qué importa | Solución aplicada |
|---|---|---|---|
| C1 | **TypeScript sin fijar.** `typescript@latest` es la 7.0.2, pero `typescript-eslint` solo admite TS < 6.1 (comprobado). | Un `npm install` normal rompe el lint desde el primer día. | Fijar TypeScript 6.0.x y todas las versiones exactas tras comprobar peerDependencies en la tarea 0.1. |
| C2 | **Stack desactualizado.** El plan decía React 18; el ecosistema actual (shadcn, @vitejs/plugin-react para Vite 8) trabaja con React 19, y Vite 8 exige Node ≥ 20.19/22.12. | Instalación con conflictos o versiones mezcladas. | React 19, comprobación de Node en el paso previo y en 0.1. |
| C3 | **Sincronización ambigua y con pérdida de datos.** "Gana el mayor progreso por lección" no define cómo fusionar XP, racha ni SRS, y puede duplicar XP o perder repasos. | Bugs de datos difíciles de arreglar después; la arquitectura de Dexie de la Fase 1 depende de esta decisión. | Arquitectura de **registro de eventos inmutables** (CLAUDE.md §3b): el estado es una proyección; sincronizar es unir eventos por id (idempotente). Decidida antes de la Fase 1. |
| C4 | **Ligas manipulables.** El XP se calculaba en el cliente. | Cualquiera puede trucar la liga desde la consola. | XP de liga calculado en el servidor desde los eventos, con límites de plausibilidad; el cliente no escribe su XP semanal. |
| C5 | **Fase 1 enorme en un solo prompt** (infraestructura + 10 tipos de ejercicio + 12 pantallas + 2 niveles de contenido + 120 preguntas). | Ninguna sesión puede hacerlo bien; garantiza trabajo a medias o aparente. | Fase 1 dividida en 10 tareas con dependencias y criterios propios. |
| C6 | **Demasiado contenido antes de validar.** Se producían los niveles 0–1 completos sin revisar la calidad pedagógica, y la beta exigía los niveles 0–3. | Si el formato no engancha, se tira mucho trabajo. | **Rebanada vertical** (tarea 1.4): una sola unidad real de punta a punta con 🛑 revisión humana antes de producir más. Beta con Niveles 0–1 (≈10 semanas, suficiente para medir D30); Niveles 2–3 pasan a después de la beta. |
| C7 | **Sin protocolo de verificación.** Nada impedía declarar tests pasados sin ejecutarlos ni dejar botones vacíos. | Riesgo de "parece que funciona". | `EXECUTION.md`: verificación ejecutada y pegada en el informe, prohibición de mocks/botones sin acción, provisionales marcados, cuándo parar. |

## 🟠 Importante

| # | Problema | Solución aplicada |
|---|---|---|
| I1 | **Cloudflare Web Analytics no admite eventos propios**, pero el plan medía eventos de producto con él. | Umami Cloud (verificar límites en 2.7) o tabla anónima en Supabase; Cloudflare solo para visitas. |
| I2 | **Web Push sin cuenta es imposible** (hace falta un servidor que guarde la suscripción), y la app es local-first. | Push solo con cuenta; sin cuenta, recordatorio al abrir y .ics local. |
| I3 | **Dexie sin estrategia de migraciones** ni de IDs de contenido. Corregir un ejercicio podía romper tarjetas SRS. | Dexie versionado desde v1 con test de migración; IDs inmutables, `version` y `status: retired`. |
| I4 | **Pérdida de progreso sin cuenta** si el navegador borra datos (sobre todo Safari). | `navigator.storage.persist()` + exportar/importar JSON en Ajustes. |
| I5 | **Actualización de la PWA no definida.** Una nueva versión podía recargar a mitad de lección. | Aviso de nueva versión y actualización al aceptar; test e2e. |
| I6 | **"Tu acción personal" sin fórmula.** Imposible de testear. | Fórmula determinista en CLAUDE.md §7, ajustable tras la beta. |
| I7 | **Skills dadas por instaladas.** Los paquetes existen en npm, pero su funcionamiento en el entorno real no estaba comprobado. | Verificación en 0.1; si una falla, se documenta y se aplican sus principios a mano. No bloquea. |
| I8 | **Evaluador de fórmulas:** la librería obvia (HyperFormula) es GPL-3.0 (comprobado). | Evaluador propio, con tests de VNA/TIR contra valores de referencia. |
| I9 | **Edad sin mecanismo.** "Verificación de edad" no es posible sin datos sensibles. | Autodeclaración; se guarda solo "≥14". |
| I10 | **Requisitos difíciles de verificar** ("60 fps", "se ve bien en Instagram", "calidad visual"). | Criterios concretos: CPU ralentizada 4× con traza adjunta, medidas exactas, capturas a 3 anchos y 🛑 revisión humana donde no hay prueba automática. |
| I11 | **Límites de los planes gratuitos** (Supabase pausa por inactividad, cron, cuotas) sin comprobar. | Tareas 2.7 y 3.1 comprueban los límites vigentes antes de construir sobre ellos. |
| I12 | **Duplicación** de reglas de calidad entre CLAUDE.md y FASES.md. | Definición de terminado movida a EXECUTION.md; FASES.md la referencia sin repetirla. |
| I13 | **Contradicción de alcance:** la Fase 1 pedía "Abrir mercado" en Home pero la sesión llega en la 2.2. | Hasta 2.2, "Abrir mercado" lleva a la siguiente lección; funcionalidades futuras ocultas o "Próximamente". |

## 🟢 Opcional (no aplicado, para valorar)

- Presupuesto de rendimiento numérico (KB iniciales, tiempo hasta interacción) en 1.10, en vez de solo "Lighthouse ≥ 90".
- Revisor humano adicional al fundador (un profesor o un compañero de máster) para los niveles 6–9.
- Pruebas de usabilidad con 5 personas antes de la beta (tarea entre 1.10 y 2.1).
- Feature flags para activar juegos o niveles sin desplegar.

## No verificado

- Instalación real de las tres skills y sus comandos (se comprueba en 0.1).
- Límites actuales de Umami Cloud y Supabase Free (se comprueban en 2.7 y 3.1).
- Soporte de Web Push en el iOS que tengan los usuarios de la beta.
