import { DEFAULT_TZ } from './events';

const formatters = new Map<string, Intl.DateTimeFormat>();

/** Día natural (yyyy-mm-dd) de un instante en una zona horaria. Intl gestiona los cambios de hora. */
export function dayKey(iso: string | Date, tz: string = DEFAULT_TZ): string {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    formatters.set(tz, f);
  }
  return f.format(typeof iso === 'string' ? new Date(iso) : iso);
}

/** Suma días a una clave yyyy-mm-dd (aritmética de calendario, inmune al cambio de hora). */
export function addDays(key: string, n: number): string {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Días naturales entre dos claves (b − a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
}
