# Benchmark Canvas 2D vs PixiJS (tarea 2.4)

N elementos que se mueven y rotan cada fotograma; 1 s de calentamiento y 3 s medidos; CPU ralentizada 4× con CDP.
No forma parte del producto: `pixi.js` **no** es dependencia del proyecto. Para repetirlo:

```
mkdir /tmp/bench && cd /tmp/bench && cp <repo>/scripts/bench/* . && npm init -y && npm i pixi.js esbuild
npx esbuild canvas-vs-pixi.bench.js --bundle --format=iife --outfile=bench.out.js
# bench.html: <script src="bench.out.js"></script>
N=200 PLAYWRIGHT_CHROMIUM_PATH=<chromium> node run.mjs
```

Resultados del 17/10/2026 (Chromium sin cabeza, **render por software** SwiftShader, 4 núcleos; indicativo, no un móvil real):

| N | Canvas 2D 1× | Pixi 1× | Canvas 2D 4× | Pixi 4× |
|---|---|---|---|---|
| 100 | – | – | 58,7 fps | 58,3 fps |
| 200 | – | – | 56,9 fps | 59,6 fps |
| 500 | 44,7 fps | 59,0 fps | 34,5 fps | 46,2 fps |

Decisión (DECISIONES.md): Canvas 2D con un presupuesto de ≤ 200 elementos móviles por tablero; PixiJS solo si un juego futuro necesita más.
