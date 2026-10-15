---
name: nuevo-juego
description: Crea un minijuego de Compuesto a partir de su ficha en docs/JUEGOS.md usando el kit de game feel compartido. Úsala al implementar o modificar un juego.
---

# Nuevo juego

Fuente: `docs/JUEGOS.md` §2–§5, `docs/ANIMACIONES.md` §6, `CLAUDE.md` §6.

1. Lee la ficha del juego y el kit (`/src/features/games/kit`). Si el kit no existe, para y dilo.
2. Lógica pura y determinista (semilla) en `/src/engine` con tests de todas las ramas; la UI solo la dibuja.
3. Estructura de partida de JUEGOS §3: entrada 400 ms, tutorial jugable la primera vez, dificultad creciente cada 20–30 s, final con rating AAA–B, frase de aprendizaje, tarjeta de repaso si hubo fallo.
4. Usa las piezas del kit (no las reimplementes). Tableros densos en Canvas 2D.
5. Criterios de §5: empezar a jugar ≤ 5 s; azar ≤ B (test); misma semilla = misma partida (test); teclado, modo sin tiempo y reduced-motion; 60 fps con CPU 4× (traza).
6. Cierra con `review-animations` y `/impeccable critique`; la primera vez que se abre es 🛑 de Javier.
