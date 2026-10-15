/** Minutos al día elegibles y su objetivo de XP (CLAUDE.md §2.6: la sesión está pensada para 20 min). */
export const MINUTE_OPTIONS = [5, 10, 15, 20] as const;
export type Minutes = (typeof MINUTE_OPTIONS)[number];

const XP_PER_MINUTES: Record<Minutes, number> = { 5: 20, 10: 40, 15: 60, 20: 80 };

export const dailyGoalXpFor = (minutes: Minutes): number => XP_PER_MINUTES[minutes];

/**
 * Iniciales para el ticker personal ($JAV): solo letras (sin tildes), en mayúsculas, de 2 a 4.
 * Devuelve null si no son válidas.
 */
export function normalizeInitials(input: string): string | null {
  const s = input
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^A-Za-z]/g, '')
    .toUpperCase();
  return s.length >= 2 && s.length <= 4 ? s : null;
}
