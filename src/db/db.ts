import Dexie, { type Table } from 'dexie';
import type { AppEvent } from '../engine/events';
import type { LessonProgress, Summary } from '../engine/projections';

export interface SettingRow {
  key: string;
  value: string | number | boolean | null;
}

export interface StatsRow {
  key: string;
  value: Summary;
}

/** Tarjetas de repaso (FSRS). PROVISIONAL(tarea 2.1): la tabla existe desde v1, la proyección llega en 2.1. */
export interface SrsCardRow {
  id: string;
  due: string;
  [field: string]: unknown;
}

export interface ContentReport {
  id: string;
  exerciseId: string;
  text: string;
  createdAt: string;
}

export const DB_NAME = 'compuesto';

/**
 * Versionado desde el día 1 (CLAUDE.md §3b). Nunca se elimina una tabla o campo sin migración:
 * para cambiar el esquema se AÑADE `this.version(n+1).stores({...}).upgrade(...)` y se mantiene la anterior.
 */
export class CompuestoDB extends Dexie {
  events!: Table<AppEvent, string>;
  progress!: Table<LessonProgress, string>;
  stats!: Table<StatsRow, string>;
  srs_cards!: Table<SrsCardRow, string>;
  settings!: Table<SettingRow, string>;
  content_reports!: Table<ContentReport, string>;

  constructor(name: string = DB_NAME) {
    super(name);
    this.version(1).stores({
      events: 'id, type, createdAt',
      progress: 'lessonId',
      stats: 'key',
      srs_cards: 'id, due',
      settings: 'key',
      content_reports: 'id, createdAt',
    });
  }
}

let shared: CompuestoDB | null = null;

export function getDb(): CompuestoDB {
  return (shared ??= new CompuestoDB());
}
