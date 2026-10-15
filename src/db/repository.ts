import { dayKey } from '../engine/days';
import { DEFAULT_TZ, makeEvent, parseEvent, type AppEvent, type EventType } from '../engine/events';
import { normalizeEvents, projectAll, type Summary } from '../engine/projections';
import type { z } from 'zod';
import type { payloads } from '../engine/events';
import type { CompuestoDB, ContentReport } from './db';

const DEVICE_KEY = 'device.id';
const SUMMARY_KEY = 'summary';
/** Ajustes de dispositivo: no son proyección de eventos, así que la reconstrucción no los toca. */
const isDeviceSetting = (key: string) => key.startsWith('device.');

export interface RepoOptions {
  /** Reloj inyectable (tests). */
  now?: () => Date;
  tz?: string;
}

/** Añade eventos y mantiene las proyecciones cacheadas; todo se puede reconstruir desde `events`. */
export class Repository {
  constructor(
    readonly db: CompuestoDB,
    private readonly opts: RepoOptions = {},
  ) {}

  private now() {
    return this.opts.now?.() ?? new Date();
  }
  private get tz() {
    return this.opts.tz ?? DEFAULT_TZ;
  }
  private today() {
    return dayKey(this.now(), this.tz);
  }

  async deviceId(): Promise<string> {
    const row = await this.db.settings.get(DEVICE_KEY);
    if (typeof row?.value === 'string') return row.value;
    const id = crypto.randomUUID();
    await this.db.settings.put({ key: DEVICE_KEY, value: id });
    return id;
  }

  /** Crea y guarda un evento del dispositivo actual. */
  async record<T extends EventType>(
    type: T,
    payload: z.input<(typeof payloads)[T]>,
  ): Promise<AppEvent> {
    const event = makeEvent(type, payload, {
      deviceId: await this.deviceId(),
      now: this.now(),
      tz: this.tz,
    });
    await this.addEvents([event]);
    return event;
  }

  /**
   * Guarda eventos ya existentes (p. ej. importados). Valida con Zod; los ids repetidos se ignoran
   * (idempotente: los eventos son inmutables). Devuelve cuántos eran nuevos.
   */
  async addEvents(input: readonly unknown[]): Promise<number> {
    const events = input.map(parseEvent);
    let added = 0;
    await this.db.transaction(
      'rw',
      [this.db.events, this.db.progress, this.db.stats, this.db.settings],
      async () => {
        const existing = new Set(
          (await this.db.events.bulkGet(events.map((e) => e.id))).filter(Boolean).map((e) => e!.id),
        );
        const fresh = events.filter(
          (e, i) => !existing.has(e.id) && events.findIndex((x) => x.id === e.id) === i,
        );
        if (fresh.length) await this.db.events.bulkAdd(fresh);
        added = fresh.length;
        if (added) await this.writeProjections();
      },
    );
    return added;
  }

  async allEvents(): Promise<AppEvent[]> {
    return normalizeEvents(await this.db.events.toArray());
  }

  private async writeProjections(): Promise<Summary> {
    const summary = projectAll(await this.db.events.toArray(), this.today());
    await this.db.progress.clear();
    await this.db.progress.bulkPut(Object.values(summary.progress.lessons));
    await this.db.stats.put({ key: SUMMARY_KEY, value: summary });
    const keep = (await this.db.settings.toArray()).filter((r) => isDeviceSetting(r.key));
    await this.db.settings.clear();
    await this.db.settings.bulkPut([
      ...keep,
      ...Object.entries(summary.settings).map(([key, value]) => ({ key, value })),
    ]);
    return summary;
  }

  /** Reconstrucción completa de todas las proyecciones desde los eventos. */
  async rebuild(): Promise<Summary> {
    return this.db.transaction(
      'rw',
      [this.db.events, this.db.progress, this.db.stats, this.db.settings],
      () => this.writeProjections(),
    );
  }

  /** Resumen cacheado; si es de otro día (la racha depende de "hoy") se recalcula. */
  async summary(): Promise<Summary> {
    const row = await this.db.stats.get(SUMMARY_KEY);
    if (row && row.value.asOfDay === this.today()) return row.value;
    return this.rebuild();
  }

  async listReports(): Promise<ContentReport[]> {
    return this.db.content_reports.orderBy('createdAt').reverse().toArray();
  }

  async deleteReport(id: string): Promise<void> {
    await this.db.content_reports.delete(id);
  }

  /** Borra TODO el progreso y los reportes de este dispositivo (acción destructiva: la UI pide confirmación). */
  async deleteAllData(): Promise<void> {
    const { db } = this;
    await db.transaction(
      'rw',
      [db.events, db.progress, db.stats, db.settings, db.srs_cards, db.content_reports],
      async () => {
        await Promise.all([
          db.events.clear(),
          db.progress.clear(),
          db.stats.clear(),
          db.srs_cards.clear(),
          db.content_reports.clear(),
        ]);
        const keep = (await db.settings.toArray()).filter((r) => isDeviceSetting(r.key));
        await db.settings.clear();
        await db.settings.bulkPut(keep);
      },
    );
  }

  async addReport(exerciseId: string, text: string): Promise<ContentReport> {
    const report = {
      id: crypto.randomUUID(),
      exerciseId,
      text,
      createdAt: this.now().toISOString(),
    };
    await this.db.content_reports.add(report);
    return report;
  }
}
