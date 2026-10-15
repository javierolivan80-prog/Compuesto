/* Tests de salto (TEMARIO §5): 8 preguntas por unidad, ≥ 80 % domina la unidad. Lógica pura. */

export const QUESTIONS_PER_TEST = 8;
export const PASS_PCT = 80;

export interface PlacementResult {
  correct: number;
  total: number;
  /** 0–100 */
  pct: number;
  passed: boolean;
}

/** Puntúa un test: las preguntas sin contestar cuentan como falladas (el total es siempre el del banco). */
export function scorePlacement(
  flags: readonly boolean[],
  total = QUESTIONS_PER_TEST,
): PlacementResult {
  const correct = Math.min(total, flags.filter(Boolean).length);
  const pct = total === 0 ? 0 : (correct / total) * 100;
  return { correct, total, pct, passed: pct >= PASS_PCT };
}

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
