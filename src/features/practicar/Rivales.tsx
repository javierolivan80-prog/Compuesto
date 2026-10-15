import { ComingSoon } from '../../components/States';

/** Rivales simulados (Fase 2, tarea 2.7): ahora solo se explica qué llegará, sin controles. */
export function Rivales() {
  return (
    <div className="grid gap-6">
      <h1 className="text-3xl">Rivales</h1>
      <ComingSoon title="La liga de becarios de Albufera Partners">
        <p>
          Competirás cada semana contra becarios ficticios del banco y contra tu yo de la semana
          pasada, con divisiones de Bronce a Wall Street. Todo funciona en tu dispositivo, sin
          servidores ni otras personas. Llega en la Fase 2.
        </p>
      </ComingSoon>
    </div>
  );
}
