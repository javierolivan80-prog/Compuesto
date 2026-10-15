/** Lógica pura del service worker: versión mínima forzada, interruptor de emergencia y recordatorio de copia. */

export interface SwControl {
  /** Si es true, todos los service workers se desregistran y se vacían las cachés. */
  kill: boolean;
  /** Versión mínima de la app (semver x.y.z); si la instalada es menor, la actualización es obligatoria. */
  minVersion: string;
}

const parts = (v: string): number[] => v.split('.').map((n) => Number.parseInt(n, 10) || 0);

/** Compara dos versiones x.y.z: negativo si a < b, 0 si iguales, positivo si a > b. */
export function compareVersions(a: string, b: string): number {
  const pa = parts(a);
  const pb = parts(b);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/** Valida el JSON de control; cualquier cosa rara se ignora (no se actúa sobre datos dudosos). */
export function parseSwControl(raw: unknown): SwControl | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r['kill'] !== 'boolean') return null;
  if (typeof r['minVersion'] !== 'string' || !/^\d+\.\d+\.\d+$/.test(r['minVersion'])) return null;
  return { kill: r['kill'], minVersion: r['minVersion'] };
}

export type SwAction = 'kill' | 'force-update' | 'none';

export function decideSwAction(control: SwControl | null, appVersion: string): SwAction {
  if (!control) return 'none';
  if (control.kill) return 'kill';
  return compareVersions(appVersion, control.minVersion) < 0 ? 'force-update' : 'none';
}

const DAY_MS = 86_400_000;
export const BACKUP_REMINDER_DAYS = 7;

export interface BackupReminder {
  due: boolean;
  /** Días desde la última copia; null si nunca se ha hecho. */
  days: number | null;
}

/**
 * Recordatorio semanal de exportar copia. Solo avisa si hay progreso que perder (`hasProgress`)
 * y no se ha descartado el aviso en los últimos 7 días.
 */
export function backupReminder(opts: {
  now: Date;
  lastBackupAt: string | null;
  lastDismissedAt: string | null;
  hasProgress: boolean;
}): BackupReminder {
  const since = (iso: string | null) =>
    iso ? (opts.now.getTime() - Date.parse(iso)) / DAY_MS : null;
  const backupDays = since(opts.lastBackupAt);
  const dismissDays = since(opts.lastDismissedAt);
  const days = backupDays === null || Number.isNaN(backupDays) ? null : Math.floor(backupDays);
  if (!opts.hasProgress) return { due: false, days };
  if (dismissDays !== null && dismissDays < BACKUP_REMINDER_DAYS) return { due: false, days };
  const due = backupDays === null || Number.isNaN(backupDays) || backupDays >= BACKUP_REMINDER_DAYS;
  return { due, days };
}
