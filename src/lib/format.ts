const nf = (digits: number) =>
  new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    useGrouping: 'always',
  });

/** 1234.5 → "1.234,50 €". useGrouping 'always': el español no agrupa miles de 4 cifras por defecto. */
export function formatEur(value: number, digits = 2): string {
  return `${nf(digits).format(value)}\u00a0€`;
}

export function formatNumber(value: number, digits = 0): string {
  return nf(digits).format(value);
}

/** Variación con signo y flecha: nunca solo color (CLAUDE.md §5). */
export function formatDelta(pct: number, digits = 1): string {
  if (pct === 0) return `${formatNumber(0, digits)} %`;
  const arrow = pct > 0 ? '▲' : '▼';
  const sign = pct > 0 ? '+' : '−';
  return `${arrow} ${sign}${formatNumber(Math.abs(pct), digits)} %`;
}
