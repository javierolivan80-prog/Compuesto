# Capacidad: ejercicios de aplicar y argumentar (tarea 2.3)

### Requisito: los gráficos son deterministas y describibles
#### Escenario: misma semilla
- Dado un `chart_read` con semilla S
- Cuando se genera el gráfico en cualquier dispositivo
- Entonces la serie es idéntica y el hecho `truth` del contenido se cumple (lo comprueba el validador)

#### Escenario: lector de pantalla
- Cuando se muestra el gráfico
- Entonces tiene descripción textual (`altText` + resumen) y una tabla de datos

### Requisito: `case_step` se reanuda
- Dado un caso a medias, al volver se retoma en el paso guardado; un estado guardado inválido se descarta.

### Requisito: `self_explain` no premia la autoevaluación
- Hay que escribir, ver el modelo y marcar la rúbrica; con 2 de 3 criterios cuenta como bueno y da la mitad de XP.

### Requisito: todo se hace con teclado
- Cada tipo se completa solo con teclado y pasa axe (WCAG 2.1 AA).
