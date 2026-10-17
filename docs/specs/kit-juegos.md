# Capacidad: kit de game feel y motor de mercados (tarea 2.4)

### Requisito: las piezas del kit cumplen docs/JUEGOS.md §2
#### Escenario: pop de número
- Cuando un acierto o fallo emite un pop
- Entonces sube 24 px y se desvanece en 600 ms, con ▲ o ▼ además del color; con reduced-motion se desvanece sin moverse

#### Escenario: combo
- Dado un jugador que encadena aciertos
- Entonces el multiplicador sube a ×2, ×3 y ×4 con 2, 4 y 7 aciertos, pulsa en 180 ms y al fallar se vacía en 250 ms; un fallo con ×1 no cuenta como combo roto

#### Escenario: hit-stop y sacudida
- El hit-stop congela entre 40 y 60 ms y siempre se reanuda (basado en tiempo); la sacudida son 4–6 px, 2 ciclos, 180 ms, solo `transform` (fundido con reduced-motion)

#### Escenario: partículas
- Entre 20 y 40, 700 ms, gravedad suave, deterministas por semilla; no se dibujan con reduced-motion y el bucle se detiene solo

#### Escenario: pantalla de resultado
- La nota AAA–B se estampa (1,4 → 1), se anuncia como «Nota X», muestra lo aprendido y el récord

### Requisito: el sonido es opcional y no molesta
- Sonidos sintetizados (sin archivos), nunca más de uno a la vez, silenciables en Ajustes y en el laboratorio.

### Requisito: el motor de mercados es determinista y estadísticamente correcto
- Misma semilla → misma serie; volatilidad y deriva empíricas coinciden con los parámetros; los saltos engordan las colas; los regímenes cambian y el de pánico es más volátil.

### Requisito: rendimiento
- Con la CPU ralentizada 4×, el kit con ticker, partículas y pops mantiene ≥ 55 fps medios en el código de producción (`npm run e2e:lab`, traza en `docs/trazas/game-kit-fps.json`).
