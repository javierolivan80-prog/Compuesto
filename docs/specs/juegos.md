# Capacidad: los cinco primeros minijuegos (tarea 2.5)

### Requisito: un juego solo aparece si sus conceptos ya se han visto
#### Escenario: usuario nuevo
- Dado un usuario sin lecciones completadas
- Cuando abre Practicar
- Entonces los cinco juegos aparecen bloqueados con el motivo («Se desbloquea al ver: Presupuesto personal») y no hay botón de jugar

#### Escenario: conceptos vistos o saltados
- Dado un usuario que completó las lecciones de un concepto o saltó su unidad con el test de salto
- Entonces el juego correspondiente se puede jugar (Campana: al menos 8 afirmaciones V/F de lecciones vistas)

### Requisito: la partida del día es comparable
- La semilla del día es `hash(juego:día)`, igual en cualquier dispositivo y versión (valores de referencia fijados en tests); Practicar muestra el récord y la mejor nota de la partida del día.

### Requisito: jugar al azar no da buena nota
- Con la puntuación corregida por azar, responder al azar da B casi siempre y nunca AAA ni AA (test con 1.000 partidas por juego).

### Requisito: cada partida es accesible
- Jugable con teclado (Campana: ← →; Presupuesto: 1, 2, 3; resto con Tab y Enter), con «Sin tiempo» y con reduced-motion; el resultado se anuncia al lector de pantalla y cada gesto tiene alternativa.

### Requisito: los juegos dan XP sin ser una granja
- La nota da 5–40 XP y solo cuentan las tres primeras partidas del día. El juego de la sesión es un bloque más y se reanuda con la sesión.

### Requisito: lo fallado lleva al repaso
- El resultado lista los conceptos fallados con un botón a su práctica por tema.
