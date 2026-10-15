import { expect, test } from '@playwright/test';

// IndexedDB real de Chromium (los tests unitarios usan fake-indexeddb): registrar, exportar, borrar, importar y recargar.
test('la capa de datos funciona en un navegador real y sobrevive a la recarga', async ({
  page,
}) => {
  await page.goto('/');
  // Vite optimiza dexie/zod al primer import y recarga la página: se calienta antes de medir.
  await page
    .evaluate((p: string) => import(/* @vite-ignore */ p), '/src/db/backup.ts')
    .catch(() => undefined);
  await page.waitForLoadState('load');
  await page.waitForTimeout(1500);
  const run = async () =>
    page.evaluate(async () => {
      const load = (p: string) => import(/* @vite-ignore */ p);
      const { CompuestoDB } = await load('/src/db/db.ts');
      const { Repository } = await load('/src/db/repository.ts');
      const { exportBackup, importBackup } = await load('/src/db/backup.ts');
      const db = new CompuestoDB('e2e-db');
      await db.delete();
      await db.open();
      const repo = new Repository(db);
      await repo.record('exercise_answered', {
        exerciseId: 'e1',
        lessonId: 'l1',
        conceptIds: [],
        correct: true,
        timeMs: 1000,
        xp: 25,
      });
      const before = await repo.summary();
      const json = JSON.stringify(await exportBackup(repo));
      await db.events.clear();
      await db.stats.clear();
      await importBackup(repo, json);
      const after = await repo.summary();
      db.close();
      return { before: before.xp.total, after: after.xp.total, streak: after.streak.current };
    });
  const retry = async <T>(fn: () => Promise<T>, n = 3): Promise<T> => {
    try {
      return await fn();
    } catch (e) {
      if (n > 0 && /context was destroyed/.test(String(e))) {
        await page.waitForLoadState('load');
        return retry(fn, n - 1);
      }
      throw e;
    }
  };
  expect(await retry(run)).toEqual({ before: 25, after: 25, streak: 1 });

  await page.reload();
  const persisted = await page.evaluate(async () => {
    const load = (p: string) => import(/* @vite-ignore */ p);
    const { CompuestoDB } = await load('/src/db/db.ts');
    const db = new CompuestoDB('e2e-db');
    const n = await db.events.count();
    await db.delete();
    return n;
  });
  expect(persisted).toBe(1);
});
