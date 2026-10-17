# Especificaciones vivas

Una spec por **capacidad** (qué hace la app, no cómo está programada), con escenarios comprobables. Es la referencia de comportamiento: si el código y la spec difieren, se arregla uno de los dos en el mismo cambio. Idea tomada de OpenSpec (specs + cambios archivados); el formato y el flujo son propios y viven en este repo.

Formato de cada requisito:

```
### Requisito: <frase en presente>
#### Escenario: <nombre>
- Dado <estado>
- Cuando <acción>
- Entonces <resultado observable>
```

Specs actuales: `sesion.md`, `ejercicios-aplicados.md`, `ejercicios-parametricos.md` (entre otras de esta carpeta). Cambios en curso o archivados: `docs/cambios/`.
