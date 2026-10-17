# Spec viva: rivales simulados y estadísticas (tarea 2.7)

- La liga se **deriva de los eventos** (XP por día): no hay evento ni tabla propios. Semanas de lunes a domingo en la zona del dispositivo (`weekStart`); la semana cerrada se juega al abrir el lunes.
- 8 rivales fijos (`RIVALS`) con personalidad (constante, sprinter, madrugador, irregular) y factor de ritmo; su XP diario sale de una semilla `liga:<rival>:<semana>:<división>` (reproducible entre dispositivos).
- El ritmo de los rivales sigue tu media de las 4 semanas anteriores (suelo 150, 300 sin historial); cada división sube un 4 %.
- 5 divisiones Bronce → Wall Street. Top 3 asciende (con XP > 0), últimos 3 descienden; nada por encima de Wall Street ni por debajo de Bronce.
- «Tu yo de la semana pasada» es una comparación fija (acumulado hasta el mismo día), fuera de la clasificación.
- Sin XP no se muestra liga (nada falso en pantalla).
- Equilibrio fijado en tests: a ritmo normal ganar la semana <15 % y ascender 5–50 %; +40 % de esfuerzo asciende >75 %; medio ritmo baja >75 %.
- Estadísticas (§11): sesiones cerradas, minutos reales por sesión (tope 60), conceptos flojos (≥3 intentos), abandonadas; CSV incluye sesiones y minutos. El registro de errores y el panel de diagnóstico ya existían en Ajustes (1.x).
