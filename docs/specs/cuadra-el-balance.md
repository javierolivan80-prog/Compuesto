# Spec: lección-juego «Cuadra el balance» (`n3-u1-l1`)

Motor: `src/engine/games/balance-builder.ts`. Interfaz: `src/features/games/BalanceGame.tsx`. Textos: `es.json` → `balanceGame`.

## Reglas
- Balance de partida: Naranjas del Turia a 31/12/2024, de `companies.json` (miles de €; un test lo comprueba). Simplificación: el resultado de 2024 ya está sumado a reservas, como en `companies.json`; la línea «Resultado del ejercicio» empieza en 0 para 2025.
- **Fase 1:** las ocho partidas llegan en orden barajado por semilla y se colocan en activo, pasivo o patrimonio neto. Si fallas, la partida va a su sitio y se explica por qué. Hasta tener las ocho no se dice si cuadra.
- **Fase 2:** cinco operaciones de enero de 2025 con importes por semilla: préstamo (1.000–3.000), máquina al contado (1.500–3.500), venta a crédito (2.000–4.000, con un coste del 62 %), pago a proveedores (1.000–2.500) y dividendo con cargo a reservas (2.500–3.500).
- Cada operación ofrece tres apuntes barajados: el correcto, uno que descuadra (una sola partida o el signo al revés) y otro que cuadra pero toca la partida equivocada. El balance avanza siempre con el correcto, así que las cifras de la lección no dependen de lo que elijas.
- Nota: 0,4 × aciertos al clasificar / 8 + 0,6 × apuntes correctos / 5.

## Escenarios
- Clasificar: tarjeta de la partida, tres botones, explicación del acierto o del fallo, y el balance que se va llenando con sus dos barras.
- Apuntar: titular de la operación y tres apuntes. Al elegir, se ve si era el correcto, si descuadraba o si cuadraba pero era otro, con el porqué; las partidas que cambian destellan.
- Resumen: total del balance, caja y patrimonio neto de antes y después, resultado del ejercicio y aciertos.

## Verificación
`balance-builder.test.ts`, `e2e/n3u1.spec.ts` (la unidad entera), `e2e/peor-caso-juegos.spec.ts` (320 px y texto al 200 %) y `content:validate`.
