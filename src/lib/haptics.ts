/** Háptica con navigator.vibrate; si no existe (iOS, escritorio) se omite sin error. */
export const HAPTIC = { success: 10, failure: 30, record: [15, 40, 15] } as const;

let enabled = true;
/** Ajustes → háptica. Con false, `haptic()` no hace nada. */
export function setHapticsEnabled(value: boolean): void {
  enabled = value;
}
export const hapticsEnabled = () => enabled;

export function haptic(pattern: number | readonly number[]): boolean {
  if (!enabled) return false;
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false;
  return navigator.vibrate(pattern as number | number[]);
}
