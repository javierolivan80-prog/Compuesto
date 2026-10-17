# Spec: La Mesa (mercado vivo)

Capacidad: Javier gestiona una cartera ficticia sobre el universo de Compuesto, día de mercado a día de mercado, y aprende por qué se mueven los precios.

### Requisito: cotizaciones deterministas
#### Escenario: mismo día, mismo precio
- Dado el día de mercado n de una empresa
- Cuando se calcula su vela dos veces (o en otro dispositivo)
- Entonces apertura, máximo, mínimo y cierre son idénticos

### Requisito: el teletipo explica el movimiento
#### Escenario: noticia de empresa
- Dado un día con noticia positiva de una empresa
- Cuando se cierra el día
- Entonces su variación incluye el impacto de la noticia (mismo signo que la noticia salvo ruido acotado) y la mesa muestra la explicación y el concepto

### Requisito: operar cuesta
#### Escenario: compra a mercado
- Dado 10.000 € de caja
- Cuando compro q acciones a mercado
- Entonces pago q × apertura × (1 + media horquilla) + comisión (0,1 %, mínimo 1 €) y la caja nunca queda negativa
#### Escenario: venta sin posición
- Dado que no tengo acciones de una empresa
- Cuando intento venderla
- Entonces la orden se rechaza (sin cortos en la v1)

### Requisito: la cartera es una proyección de eventos
#### Escenario: reconstrucción
- Dado un historial de órdenes y cierres
- Cuando se recalcula desde cero en cualquier orden de llegada
- Entonces caja, posiciones y valor coinciden

### Requisito: comparación honesta
#### Escenario: cartera frente a índice e inflación
- Dado un día cerrado
- Cuando se muestra el resumen
- Entonces aparecen la rentabilidad de la cartera, la del Índice Compuesto (media de los valores) y la inflación acumulada de referencia, con ▲▼, signo y texto

### Requisito: ritmo y XP por proceso
#### Escenario: tope diario
- Dado que hoy ya he cerrado 5 días de mercado
- Cuando intento cerrar otro
- Entonces la mesa me dice que vuelva mañana
#### Escenario: XP
- Dado un día cerrado
- Cuando se calcula el XP
- Entonces es 5 por cerrar + 5 si la cartera está diversificada (≥ 3 valores y ninguno > 40 %), con independencia de ganar o perder
