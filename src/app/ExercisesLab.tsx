import { useState } from 'react';
import { Toaster } from '../components/Toaster';
import { ExerciseRunner, type ExerciseOutcome } from '../features/exercises/ExerciseRunner';
import { SAMPLE_TYPES, sampleExercise, type SampleType } from '../features/exercises/samples';

/** /exercises-lab?type=… (solo desarrollo): un ejercicio de ejemplo de cada tipo, para probar a mano y en e2e. */
export function ExercisesLab() {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get('type') as SampleType | null;
  const type = requested && SAMPLE_TYPES.includes(requested) ? requested : 'multiple_choice';
  const [outcome, setOutcome] = useState<ExerciseOutcome | null>(null);

  return (
    <main id="contenido" className="mx-auto grid max-w-xl grid-cols-[minmax(0,1fr)] gap-6 p-6">
      <Toaster />
      <h1 className="text-3xl">Ejercicios · {type}</h1>
      <nav aria-label="Tipos de ejercicio" className="flex flex-wrap gap-2 text-sm">
        {SAMPLE_TYPES.map((t) => (
          <a
            key={t}
            href={`?type=${t}`}
            className="border-line min-h-12 rounded-full border px-3 py-3"
            aria-current={t === type ? 'page' : undefined}
          >
            {t}
          </a>
        ))}
      </nav>
      {outcome ? (
        <p role="status" data-testid="outcome">
          Completado: {outcome.correct ? 'correcto' : 'incorrecto'}
        </p>
      ) : (
        <ExerciseRunner key={type} exercise={sampleExercise(type)} onComplete={setOutcome} />
      )}
    </main>
  );
}
