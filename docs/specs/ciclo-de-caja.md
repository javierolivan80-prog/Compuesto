# Spec: lección-juego «Ciclo de caja» (`n3-u2-l1`)

Motor: `src/engine/games/cash-cycle.ts`. Interfaz: `src/features/games/CashGame.tsx`. Textos: `es.json` → `cashGame`.

## Reglas
- Preparas el plan de circulante de Naranjas para 2026 (miles de €). Datos por semilla:
  - ventas con los plazos de siempre: 60.000–64.000;
  - caja disponible para el circulante: 5.000–11.000;
  - límite de la póliza: 2.000–5.000;
  - tipo de la póliza: 5–9 %;
  - comisión del factoring: 1,5–2 % por factura.
- **Cobro a la cadena (30 / 45 / 60 días):** cobrar antes vende un 3 % / 1 % / 0 % menos.
- **Existencias (45 / 60 / 75 días):** con 45 días las roturas cuestan un 3 % de las ventas; con 75, las compras en campaña son un 1 % más baratas.
- **Pago medio a proveedores (30 / 40 / 50 días):** descuento por pronto pago del 2 % / 1 % / 0 %. Son medias: la fruta fresca se paga como mucho a 30 días (Ley 12/2013) y los envases hasta a 60 (Ley 3/2004), así que 50 es «la fruta a 30 y los envases a 60». El coste de ventas es el 62 % de las ventas.
- Todos los plazos están dentro de los 60 días de la Ley 3/2004. Una opción de cobro a 90 días queda fuera porque es ilegal; el ejercicio e5 lo trata.
- Saldos: clientes = ventas × días de cobro / 365; existencias = coste × días / 365; proveedores = coste × días de pago / 365. NOF = clientes + existencias − proveedores. Hueco = NOF − caja disponible.
- **Financiación del hueco:**
  - con póliza, interés anual sobre el hueco; si el hueco supera el límite, **te quedas sin caja** y hay que rehacer el plan (la nota final se queda en la mitad);
  - con factoring, comisión × 365 / días de cobro sobre el hueco, sin más límite que las facturas.
- Margen del plan = ventas − coste de ventas − coste de la financiación.
- Nota: 1 con el mejor margen factible (búsqueda entre los 54 planes); baja 1 punto por cada 1.000 de diferencia, con un suelo de 0,3.

## Escenarios
- Pasos 1–3: tres opciones con su efecto. El panel muestra en vivo el reloj de días (pago, venta y cobro, con el hueco que financias) y la barra de NOF frente a la caja y la póliza; parpadea en rojo si te pasas.
- Paso 4, si hay hueco: póliza o factoring. Después, el resultado del año: a salvo, o sin caja en plena campaña y «Rehacer el plan».
- Resumen: tu plan, ciclo de caja, NOF, coste de la financiación, margen, el mejor margen posible y el mejor plan.

## Verificación
`cash-cycle.test.ts`, `tests/cash-game.test.tsx`, `e2e/leccion-juego.spec.ts` (axe a 375 px), `e2e/peor-caso-juegos.spec.ts`, `e2e/n3u2.spec.ts` y `content:validate`.
