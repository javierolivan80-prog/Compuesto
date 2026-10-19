/*
 * Tests de salto en dos fases (TEMARIO §5, tarea 2.12). Lógica pura.
 * Primera fase: 8 preguntas. 7 u 8 aciertos dominan la unidad; 6 abren una segunda fase de 4 preguntas del banco,
 * sin repetir, en la que hacen falta 3; menos de 6 (o menos de 3 en la segunda fase) empieza la unidad.
 * Un banco antiguo de 8 preguntas no tiene segunda fase: con 6 se empieza la unidad.
 */

export const QUESTIONS_PER_TEST = 8;
export const BANK_SIZE = 12;
/** Aciertos de la primera fase que dominan la unidad. */
export const PASS_FIRST = 7;
/** Aciertos de la primera fase que abren la segunda. */
export const SECOND_PHASE_AT = 6;
export const SECOND_PHASE_QUESTIONS = 4;
export const PASS_SECOND = 3;
/** Porcentaje equivalente a PASS_FIRST de 8, para los textos. */
export const PASS_PCT = (PASS_FIRST / QUESTIONS_PER_TEST) * 100;

export interface PlacementResult {
  /** Aciertos de la primera fase. */
  correct: number;
  total: number;
  /** 0–100, de la primera fase. */
  pct: number;
  passed: boolean;
  /** Segunda fase, si la hubo. */
  second?: { correct: number; total: number };
}

export type FirstPhaseDecision = 'dominada' | 'segunda-fase' | 'estudiar';

/** Qué pasa tras la primera fase; sin preguntas de reserva en el banco no hay segunda fase. */
export function firstPhaseDecision(correct: number, bankSize: number): FirstPhaseDecision {
  if (correct >= PASS_FIRST) return 'dominada';
  if (correct === SECOND_PHASE_AT && bankSize >= QUESTIONS_PER_TEST + SECOND_PHASE_QUESTIONS)
    return 'segunda-fase';
  return 'estudiar';
}

/** Preguntas de cada fase: las 8 primeras del banco y, para la segunda, las 4 siguientes (nunca repetidas). */
export function phaseQuestions<T>(bank: readonly T[], phase: 1 | 2): T[] {
  return phase === 1
    ? bank.slice(0, QUESTIONS_PER_TEST)
    : bank.slice(QUESTIONS_PER_TEST, QUESTIONS_PER_TEST + SECOND_PHASE_QUESTIONS);
}

const count = (flags: readonly boolean[], total: number) =>
  Math.min(total, flags.filter(Boolean).length);

/**
 * Resultado del test: `first` son las respuestas de la primera fase y `second`, las de la segunda (si la hubo).
 * Las preguntas sin contestar cuentan como falladas.
 */
export function scorePlacement(
  first: readonly boolean[],
  total = QUESTIONS_PER_TEST,
  second?: readonly boolean[],
): PlacementResult {
  const correct = count(first, total);
  const pct = total === 0 ? 0 : (correct / total) * 100;
  if (second === undefined) return { correct, total, pct, passed: correct >= PASS_FIRST };
  const c2 = count(second, SECOND_PHASE_QUESTIONS);
  return {
    correct,
    total,
    pct,
    passed: correct === SECOND_PHASE_AT && c2 >= PASS_SECOND,
    second: { correct: c2, total: SECOND_PHASE_QUESTIONS },
  };
}

/** Días hasta la comprobación de lo saltado en el repaso. */
export const SKIP_CHECK_DAYS = 7;

export interface ChainState {
  units: string[];
  index: number;
  results: Record<string, PlacementResult>;
  status: 'running' | 'completed' | 'stopped';
}

/** "Saltar nivel completo": encadena los tests de todas sus unidades, en orden. */
export function startChain(unitIds: readonly string[]): ChainState {
  return {
    units: [...unitIds],
    index: 0,
    results: {},
    status: unitIds.length ? 'running' : 'completed',
  };
}

export const currentUnit = (s: ChainState): string | undefined =>
  s.status === 'running' ? s.units[s.index] : undefined;

/** Aprobar avanza a la siguiente unidad; suspender detiene la cadena (la unidad suspendida se estudia normal). */
export function recordChainResult(s: ChainState, result: PlacementResult): ChainState {
  const unit = currentUnit(s);
  if (unit === undefined) throw new Error('La cadena ya terminó');
  const results = { ...s.results, [unit]: result };
  if (!result.passed) return { ...s, results, status: 'stopped' };
  const index = s.index + 1;
  return { ...s, results, index, status: index >= s.units.length ? 'completed' : 'running' };
}

export interface ChainSummary {
  skipped: string[];
  stoppedAt?: string;
  /** Todas las unidades superadas: el nivel entero queda saltado. */
  levelSkipped: boolean;
}

export function chainSummary(s: ChainState): ChainSummary {
  const skipped = s.units.filter((u) => s.results[u]?.passed);
  const stoppedAt = s.status === 'stopped' ? s.units[s.index] : undefined;
  return {
    skipped,
    stoppedAt,
    levelSkipped: s.status === 'completed' && skipped.length === s.units.length,
  };
}
