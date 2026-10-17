# Propuesta: ejercicios paramétricos (`params`)

**Fase/tarea:** 2.9  ·  **Fecha:** 2026-10-17

## Por qué
Hoy un repaso de cálculo repite las mismas cifras y se puede acertar recordando el número en vez de rehacer el método (TEMARIO §6, mejora 2 aprobada el 17/10/2026). Con cifras nuevas en cada repaso, Javier tiene que reconstruir el cálculo: es la práctica de recuperación que pide CLAUDE.md §8.

## Qué cambia
- `numeric_input`, `spreadsheet` y `build_statement` pueden declarar `params` (valor del enunciado, mínimo, máximo, paso, decimales) y `derived` (cifras calculadas para el texto). Los textos y fórmulas usan marcadores `{nombre}`.
- En la lección se ve el enunciado con sus cifras (los `value` de cada parámetro). En el repaso (Due diligence, Mis errores, Por tema, examen y bloque de repaso de la sesión) se generan cifras nuevas con semilla «id del ejercicio + día» y la respuesta sale de la fórmula.
- Las cifras usadas se guardan en `exercise_answered.payload.params`.
- `content:validate` prueba cada ejercicio paramétrico con 100 semillas.

## Fuera de alcance
- Calificación Hard en FSRS y variantes por concepto (tarea 2.11).
- Convertir todo el contenido de N0–N1: solo se convierten 2 ejercicios como muestra, revisados por el subagente.
- `modelRef` (tarea 2.10).

## Restricciones de CLAUDE.md que afectan
§2 (coste 0, offline: todo en el navegador, sin red); §3 (evaluador de fórmulas propio, lógica pura en `/src/engine` con tests); §3b (IDs inmutables, eventos inmutables y proyecciones reproducibles: el payload nuevo es opcional y compatible); §8 (práctica de recuperación) y §9 (contenido con fórmula testeada, formatos `Intl` es-ES).

## Riesgos y preguntas abiertas
- Cifras que dan resultados absurdos (negativos, divisiones por cero) → rango declarado y 100 semillas en `content:validate`; `answerRange` opcional.
- Respuestas con muchos decimales → la respuesta de una variante se redondea a `answerDecimals` (2 por defecto).
- Un texto con una cifra fija que depende de los parámetros quedaría incoherente → los textos solo pueden usar cifras de `params`/`derived` y el revisor lo comprueba en los ejercicios convertidos.
