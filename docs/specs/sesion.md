# Capacidad: sesión «Abrir mercado» (tarea 2.2)

### Requisito: la sesión se monta según el tiempo elegido
#### Escenario: tiempos 5, 10, 15 y 20 min
- Dado un usuario con contenido pendiente
- Cuando abre una sesión de N minutos
- Entonces el plan sigue el orden briefing → due diligence → lección → repaso → lección → reto/Encargo → cierre, sin superar N minutos estimados y sin huecos

#### Escenario: usuario nuevo o sin contenido nuevo
- Dado un usuario sin tarjetas vencidas o sin lecciones pendientes
- Cuando abre la sesión
- Entonces se omiten los bloques vacíos y nunca queda una sesión sin nada sustancial si hay contenido

### Requisito: la sesión se puede reanudar
#### Escenario: salir a medias
- Dado una sesión de hoy sin cerrar
- Cuando el usuario vuelve a Inicio
- Entonces ve «Reanudar sesión» y continúa en el primer bloque sin completar, con el plan original

### Requisito: el cierre no presiona
#### Escenario: objetivo cumplido
- Dado que el usuario alcanza su objetivo diario
- Cuando llega al cierre
- Entonces ve «Objetivo cumplido», XP, racha y misiones, sin empujar a seguir

### Requisito: el progreso se guarda como eventos
- `session_started` guarda el plan; cada bloque emite `session_block_completed`; el cierre emite `session_completed`.
