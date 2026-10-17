# Capacidad: tu acción, el trader impulsivo y la tarjeta compartible (tarea 2.6)

### Requisito: el perfil cotiza con ticker propio
#### Escenario: fórmula de CLAUDE.md §7.2
- Dado un día con XP y precisión
- Entonces el precio sube `0,002 × min(XP, 100) / 10 × f` con `f = 0,5 + precisión` (0,5–1,5); un día intermedio sin actividad corrige −1 %, con suelo en el 50 % del máximo; hoy no corrige hasta que acaba

#### Escenario: proyección de eventos
- Mismos eventos, en cualquier orden y con duplicados → misma serie de velas (mechas deterministas por día); sin eventos, 100 y sin velas («empezará a cotizar»)

### Requisito: la tarjeta es exacta, local y sin dinero
- Historia 1080×1920 y post 1080×1080, en 3 estilos (Terminal, Papel, Carreras) con contraste AA; se genera sin conexión con las fuentes de la app (Instrument Serif, Geist Sans y Mono); solo XP y progreso, y los puntos de la acción se rotulan «no es dinero».
- En móvil se comparte el archivo con la Web Share API; si el navegador no la tiene, solo hay botón de descarga (no se muestra un botón que no hace nada).

### Requisito: el trader impulsivo enseña el coste de operar
- 30 días, noticias tentadoras que son ruido, cada operación cuesta un 1 %; no operar da AAA, una operación AA, y operar al azar da B (1.000 partidas).

### Requisito: las celebraciones no estorban
- Subir de rango o de planta se celebra dentro del cierre de la lección (sin botón extra ni pasos nuevos); el cierre de la sesión imprime el ticket y ofrece compartir.
