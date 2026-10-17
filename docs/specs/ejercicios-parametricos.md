# Spec: ejercicios paramétricos

Capacidad: un ejercicio de cálculo puede presentarse con cifras distintas en cada repaso, corrigiéndose con su propia fórmula. Tarea 2.9 (TEMARIO §6).

### Requisito: la primera aparición usa las cifras del enunciado
#### Escenario: lección
- Dado un `numeric_input` con `params` y marcadores `{nombre}` en el enunciado
- Cuando aparece en una lección
- Entonces el enunciado muestra los `value` de cada parámetro con formato es-ES y la respuesta correcta es su `answer`

### Requisito: el repaso usa cifras nuevas y deterministas
#### Escenario: misma semilla, mismas cifras
- Dado un ejercicio paramétrico y la semilla «id + día»
- Cuando se genera la variante dos veces
- Entonces las cifras son idénticas
#### Escenario: cifras dentro de rango y paso
- Dado un parámetro con mínimo, máximo, paso y decimales
- Cuando se genera cualquier variante
- Entonces su valor está en [mínimo, máximo], cae en la rejilla del paso y tiene esos decimales
#### Escenario: distintas a las de la lección
- Dado un ejercicio paramétrico con al menos un parámetro que admite otro valor
- Cuando se repasa
- Entonces al menos una cifra es distinta de las del enunciado
#### Escenario: la corrección sale de la fórmula
- Dado una variante de `numeric_input`
- Cuando se escribe el resultado de la fórmula con las cifras de la variante (redondeado a `answerDecimals`)
- Entonces se corrige como acierto, y la respuesta del enunciado original como fallo si difiere

### Requisito: hojas de cálculo y estados financieros también varían
#### Escenario: spreadsheet
- Dado un `spreadsheet` con celdas `{nombre}`
- Cuando se genera la variante
- Entonces las celdas toman las cifras nuevas y `expected` y los casos ocultos se recalculan con `solution`
#### Escenario: build_statement
- Dado un `build_statement` con filas que declaran `formula`
- Cuando se genera la variante
- Entonces cada fila vale su fórmula con las cifras nuevas y el balance sigue cuadrando

### Requisito: compatible con lo que ya existe
#### Escenario: ejercicio sin params
- Dado un ejercicio sin `params`
- Cuando se instancia con o sin semilla
- Entonces es idéntico al original
#### Escenario: eventos antiguos
- Dado un `exercise_answered` sin `params`
- Cuando se reconstruyen las proyecciones
- Entonces el resultado es el mismo que antes del cambio

### Requisito: se registran las cifras usadas
#### Escenario: payload
- Dado un repaso de un ejercicio paramétrico
- Cuando se contesta
- Entonces `exercise_answered.payload.params` guarda las cifras de la variante

### Requisito: el contenido se valida con 100 semillas
#### Escenario: fórmula que se rompe en el rango
- Dado un ejercicio paramétrico cuya fórmula da división por cero, NaN o infinito con alguna cifra del rango
- Cuando se ejecuta `content:validate`
- Entonces falla con el código `params` e indica la semilla
#### Escenario: respuesta fuera de rango
- Dado un `answerRange` declarado
- Cuando alguna de las 100 variantes da una respuesta fuera
- Entonces `content:validate` falla
#### Escenario: marcador sin definir
- Dado un texto o fórmula con `{x}` que no es parámetro ni derivado
- Cuando se valida
- Entonces falla con el código `params`
