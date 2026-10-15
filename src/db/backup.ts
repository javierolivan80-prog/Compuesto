import { z } from 'zod';
import { eventSchema, type AppEvent } from '../engine/events';
import type { Repository } from './repository';

export const BACKUP_FORMAT = 'compuesto-backup';
export const BACKUP_VERSION = 1;

const backupSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.literal(BACKUP_VERSION),
  exportedAt: z.string(),
  events: z.array(eventSchema),
  content_reports: z
    .array(
      z.object({ id: z.string(), exerciseId: z.string(), text: z.string(), createdAt: z.string() }),
    )
    .default([]),
});

export type Backup = z.infer<typeof backupSchema>;

/** Exporta lo que no se puede recalcular: eventos y reportes. Las proyecciones se reconstruyen al importar. */
export async function exportBackup(repo: Repository, now: Date = new Date()): Promise<Backup> {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    events: (await repo.allEvents()) as Backup['events'],
    content_reports: await repo.db.content_reports.orderBy('createdAt').toArray(),
  };
}

export class BackupError extends Error {}

/** Valida el JSON antes de tocar nada: un archivo corrupto no puede dejar la base a medias. */
export function parseBackup(json: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new BackupError('El archivo no es un JSON válido.');
  }
  const r = backupSchema.safeParse(data);
  if (!r.success) {
    const first = r.error.issues[0];
    throw new BackupError(
      `Copia no válida en ${first?.path.join('.') || 'raíz'}: ${first?.message}`,
    );
  }
  return r.data;
}

export interface ImportResult {
  events: number;
  reports: number;
}

/**
 * `replace` (por defecto) sustituye todo; `merge` añade los eventos que faltan (unión por id, idempotente).
 */
export async function importBackup(
  repo: Repository,
  json: string,
  mode: 'replace' | 'merge' = 'replace',
): Promise<ImportResult> {
  const backup = parseBackup(json);
  const { db } = repo;
  if (mode === 'replace') {
    await db.transaction('rw', [db.events, db.content_reports], async () => {
      await db.events.clear();
      await db.content_reports.clear();
      await db.content_reports.bulkPut(backup.content_reports);
    });
  } else {
    await db.content_reports.bulkPut(backup.content_reports);
  }
  await repo.addEvents(backup.events as AppEvent[]);
  await repo.rebuild();
  return { events: backup.events.length, reports: backup.content_reports.length };
}

/** Pide al navegador que no borre los datos; devuelve si quedó persistente. */
export async function requestPersistence(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false;
  try {
    return (await navigator.storage.persisted?.()) || (await navigator.storage.persist());
  } catch {
    return false;
  }
}
