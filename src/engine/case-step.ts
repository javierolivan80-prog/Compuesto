/* Estado de un caso en varios pasos (case_step): se avanza paso a paso y se puede reanudar. Puro y testeado. */

export interface CaseState {
  choices: (number | null)[];
  /** Paso actual (0-based). */
  step: number;
  /** ¿Se ha comprobado ya el paso actual (feedback visible)? */
  revealed: boolean;
}

export const initialCase = (steps: number): CaseState => ({
  choices: Array.from({ length: steps }, () => null),
  step: 0,
  revealed: false,
});

export function chooseOption(s: CaseState, option: number): CaseState {
  if (s.revealed) return s;
  return { ...s, choices: s.choices.map((c, i) => (i === s.step ? option : c)) };
}

/** Comprobar el paso actual: exige haber elegido. */
export function revealStep(s: CaseState): CaseState {
  return s.choices[s.step] === null || s.revealed ? s : { ...s, revealed: true };
}

/** Pasar al siguiente paso (solo tras comprobar y si queda alguno). */
export function nextStep(s: CaseState): CaseState {
  return s.revealed && s.step < s.choices.length - 1
    ? { ...s, step: s.step + 1, revealed: false }
    : s;
}

/** ¿Se han contestado y comprobado todos los pasos? */
export const isCaseComplete = (s: CaseState): boolean =>
  s.revealed && s.step === s.choices.length - 1;

/** Lee un estado guardado; devuelve null si no es válido para un caso de `steps` pasos (datos manipulados o de otra versión). */
export function parseSavedCase(raw: string | null, steps: number): CaseState | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<CaseState>;
    if (
      !Array.isArray(v.choices) ||
      v.choices.length !== steps ||
      !v.choices.every((c) => c === null || (Number.isInteger(c) && (c as number) >= 0)) ||
      !Number.isInteger(v.step) ||
      (v.step as number) < 0 ||
      (v.step as number) >= steps ||
      typeof v.revealed !== 'boolean'
    )
      return null;
    // coherencia: un paso comprobado tiene elección; los pasos anteriores al actual, también
    if (v.revealed && v.choices[v.step as number] === null) return null;
    if (v.choices.slice(0, v.step as number).some((c) => c === null)) return null;
    return v as CaseState;
  } catch {
    return null;
  }
}
