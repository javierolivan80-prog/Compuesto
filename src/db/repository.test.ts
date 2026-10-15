import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ev, uuid, xpAt } from '../../tests/helpers';
import { projectAll } from '../engine/projections';
import { exportBackup, importBackup, parseBackup, BackupError, requestPersistence } from './backup';
import { CompuestoDB } from './db';
import { Repository } from './repository';

let db: CompuestoDB;
let clock: Date;
let repo: Repository;
let dbName = 0;

beforeEach(() => {
  clock = new Date('2026-02-10T10:00:00Z');
  db = new CompuestoDB(`test-${++dbName}`);
  repo = new Repository(db, { now: () => clock });
});
afterEach(async () => {
  db.close();
  await Dexie.delete(db.name);
});

async function seed() {
  await repo.record('lesson_started', { lessonId: 'l1', unitId: 'u1', level: 0 });
  await repo.record('exercise_answered', {
    exerciseId: 'e1',
    lessonId: 'l1',
    conceptIds: ['c1'],
    correct: true,
    timeMs: 3000,
    xp: 10,
  });
  await repo.record('lesson_completed', {
    lessonId: 'l1',
    unitId: 'u1',
    level: 0,
    xp: 30,
    accuracy: 1,
  });
  clock = new Date('2026-02-11T10:00:00Z');
  await repo.record('settings_changed', { key: 'dailyGoalXp', value: 80 });
  await repo.record('exercise_answered', {
    exerciseId: 'e2',
    lessonId: 'l2',
    conceptIds: [],
    correct: false,
    timeMs: 2000,
    xp: 0,
  });
}

describe('repositorio', () => {
  it('añade eventos y actualiza las proyecciones cacheadas', async () => {
    await seed();
    const s = await repo.summary();
    expect(s.xp.total).toBe(40);
    expect(s.streak.current).toBe(1);
    expect((await db.progress.get('l1'))?.status).toBe('completed');
    expect((await db.settings.get('dailyGoalXp'))?.value).toBe(80);
  });

  it('añadir dos veces el mismo evento no duplica nada (idempotencia)', async () => {
    const e = xpAt('2026-02-10T09:00:00Z', 10);
    expect(await repo.addEvents([e, e])).toBe(1);
    expect(await repo.addEvents([e])).toBe(0);
    expect(await db.events.count()).toBe(1);
    expect((await repo.summary()).xp.total).toBe(10);
  });

  it('rechaza eventos inválidos sin tocar la base', async () => {
    const bad = { ...xpAt('2026-02-10T09:00:00Z'), payload: { nope: true } };
    await expect(repo.addEvents([xpAt('2026-02-10T08:00:00Z'), bad])).rejects.toThrow();
    expect(await db.events.count()).toBe(0);
  });

  it('eventos llegados desordenados dan el mismo estado', async () => {
    const events = [
      xpAt('2026-02-08T10:00:00Z'),
      xpAt('2026-02-09T10:00:00Z'),
      xpAt('2026-02-10T09:00:00Z'),
    ];
    const db2 = new CompuestoDB(`test-${++dbName}`);
    const repo2 = new Repository(db2, { now: () => clock });
    await repo.addEvents(events);
    await repo2.addEvents([...events].reverse());
    expect(await repo2.summary()).toEqual(await repo.summary());
    db2.close();
    await Dexie.delete(db2.name);
  });

  it('reconstruir desde eventos da el mismo estado que las proyecciones cacheadas', async () => {
    await seed();
    const cachedSummary = (await db.stats.get('summary'))!.value;
    const cachedProgress = await db.progress.toArray();
    const cachedSettings = (await db.settings.toArray()).filter(
      (r) => !r.key.startsWith('device.'),
    );
    // destruye todas las proyecciones y reconstruye
    await db.progress.clear();
    await db.stats.clear();
    await db.settings.clear();
    const rebuilt = await repo.rebuild();
    expect(rebuilt).toEqual(cachedSummary);
    expect(await db.progress.toArray()).toEqual(cachedProgress);
    expect((await db.settings.toArray()).filter((r) => !r.key.startsWith('device.'))).toEqual(
      cachedSettings,
    );
    expect(rebuilt).toEqual(projectAll(await repo.allEvents(), '2026-02-11'));
  });

  it('el resumen se recalcula al cambiar el día (la racha depende de hoy)', async () => {
    await repo.addEvents([xpAt('2026-02-10T10:00:00Z')]);
    expect(await repo.summary()).toMatchObject({
      asOfDay: '2026-02-10',
      streak: { current: 1, atRisk: false },
    });
    clock = new Date('2026-02-11T10:00:00Z'); // al día siguiente sin jugar: en riesgo, aún viva
    expect(await repo.summary()).toMatchObject({
      asOfDay: '2026-02-11',
      streak: { current: 1, atRisk: true },
    });
    clock = new Date('2026-02-12T10:00:00Z'); // un día entero sin jugar: se rompe
    expect(await repo.summary()).toMatchObject({ asOfDay: '2026-02-12', streak: { current: 0 } });
  });

  it('el id de dispositivo se crea una vez y sobrevive a la reconstrucción', async () => {
    const id = await repo.deviceId();
    await repo.record('settings_changed', { key: 'tema', value: 'noche' });
    await repo.rebuild();
    expect(await repo.deviceId()).toBe(id);
  });
});

describe('exportar / importar', () => {
  it('exportar → borrar → importar recupera exactamente el estado', async () => {
    await seed();
    await repo.addReport('e1', 'La respuesta B también es correcta');
    const before = await repo.summary();
    const beforeProgress = await db.progress.toArray();
    const json = JSON.stringify(await exportBackup(repo, clock));

    await db.events.clear();
    await db.progress.clear();
    await db.stats.clear();
    await db.content_reports.clear();
    expect((await repo.rebuild()).xp.total).toBe(0);

    const r = await importBackup(repo, json);
    expect(r).toEqual({ events: 5, reports: 1 });
    expect(await repo.summary()).toEqual(before);
    expect(await db.progress.toArray()).toEqual(beforeProgress);
    expect(await db.content_reports.count()).toBe(1);
    // un segundo export es idéntico (salvo la fecha de exportación)
    expect((await exportBackup(repo, clock)).events).toEqual(JSON.parse(json).events);
  });

  it('importar en modo "merge" suma solo lo que falta', async () => {
    const a = xpAt('2026-02-09T10:00:00Z', 10);
    const b = xpAt('2026-02-10T09:00:00Z', 20);
    await repo.addEvents([a]);
    const other = new CompuestoDB(`test-${++dbName}`);
    const repoB = new Repository(other, { now: () => clock });
    await repoB.addEvents([a, b]);
    const json = JSON.stringify(await exportBackup(repoB, clock));
    await importBackup(repo, json, 'merge');
    expect(await db.events.count()).toBe(2);
    expect((await repo.summary()).xp.total).toBe(30);
    other.close();
    await Dexie.delete(other.name);
  });

  it('rechaza copias corruptas o de otro formato sin tocar los datos', async () => {
    await seed();
    const before = await db.events.count();
    expect(() => parseBackup('{no json')).toThrow(BackupError);
    expect(() => parseBackup(JSON.stringify({ format: 'otro', version: 1 }))).toThrow(
      /Copia no válida/,
    );
    const bad = JSON.stringify({
      format: 'compuesto-backup',
      version: 1,
      exportedAt: 'x',
      events: [{ id: 'x' }],
    });
    await expect(importBackup(repo, bad)).rejects.toThrow(BackupError);
    expect(await db.events.count()).toBe(before);
  });
});

describe('persistencia y migraciones', () => {
  it('navigator.storage.persist: devuelve el resultado o false si no existe', async () => {
    const original = Object.getOwnPropertyDescriptor(navigator, 'storage');
    Object.defineProperty(navigator, 'storage', {
      value: { persisted: async () => false, persist: async () => true },
      configurable: true,
    });
    expect(await requestPersistence()).toBe(true);
    Object.defineProperty(navigator, 'storage', { value: undefined, configurable: true });
    expect(await requestPersistence()).toBe(false);
    if (original) Object.defineProperty(navigator, 'storage', original);
  });

  it('una base creada con el esquema v1 se abre con la clase actual sin perder datos', async () => {
    const name = `legacy-${++dbName}`;
    const legacy = new Dexie(name);
    legacy.version(1).stores({
      events: 'id, type, createdAt',
      progress: 'lessonId',
      stats: 'key',
      srs_cards: 'id, due',
      settings: 'key',
      content_reports: 'id, createdAt',
    });
    const e = ev('settings_changed', { key: 'k', value: 1 }, '2026-01-01T10:00:00Z', {
      id: uuid(900),
    });
    await legacy.table('events').add(e);
    legacy.close();

    const current = new CompuestoDB(name);
    expect(await current.events.get(uuid(900))).toEqual(e);
    expect(current.verno).toBeGreaterThanOrEqual(1);
    current.close();
    await Dexie.delete(name);
  });
});
