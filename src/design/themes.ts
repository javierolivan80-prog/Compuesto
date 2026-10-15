export type ThemeId =
  'noche' | 'mayfair' | 'salmon' | 'ginebra' | 'montecarlo' | 'tokio' | 'platino';

export interface ThemeInfo {
  id: ThemeId;
  name: string;
  /** Rango que lo desbloquea; null = disponible desde el inicio. */
  unlockRank: string | null;
}

export const THEMES: readonly ThemeInfo[] = [
  { id: 'noche', name: 'Wall Street Noche', unlockRank: null },
  { id: 'mayfair', name: 'Mayfair', unlockRank: null },
  { id: 'salmon', name: 'Salmón', unlockRank: 'Analista' },
  { id: 'ginebra', name: 'Ginebra', unlockRank: 'Asociado' },
  { id: 'montecarlo', name: 'Monte Carlo', unlockRank: 'VP' },
  { id: 'tokio', name: 'Tokio 3 a.m.', unlockRank: 'Director' },
  { id: 'platino', name: 'Platino', unlockRank: 'Managing Director' },
];

export const DEFAULT_THEME: ThemeId = 'noche';

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((t) => t.id === value);
}
