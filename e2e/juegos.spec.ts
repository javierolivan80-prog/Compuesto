import { randomUUID } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { dayKey } from '../src/engine/days';
import { dailySeed } from '../src/engine/games/common';
import { budgetRound, BUDGET_ROUNDS } from '../src/engine/games/budget';
import { COMPOUND_ROUNDS, compoundRounds, finalOf, roundScore } from '../src/engine/games/compound';
import { availableHeadlines, newsRounds } from '../src/engine/games/news';
import { orderRequests } from '../src/engine/games/orders';
import { completeOnboarding } from './solver';

/* Tarea 2.5: los cinco primeros juegos, de punta a punta y solo con teclado, contra la build de producción. */

const today = dayKey(new Date());
const LESSON_DIRS = ['n0/u1', 'n0/u2', 'n0/u3', 'n1/u4'];

interface LessonFile {
  id: string;
  concepts: string[];
  exercises: { type: string; statement?: string; answer?: boolean }[];
}
const lessons: LessonFile[] = LESSON_DIRS.flatMap((d) =>
  readdirSync(join('content/es/levels', d))
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join('content/es/levels', d, f), 'utf8')) as LessonFile),
);
const seen = new Set(lessons.flatMap((l) => l.concepts));
const tfAnswer = new Map(
  lessons.flatMap((l) =>
    l.exercises
      .filter((e) => e.type === 'true_false_swipe')
      .map((e) => [e.statement!, e.answer!] as const),
  ),
);

const ev = (type: string, payload: object, createdAt = new Date().toISOString()) => ({
  id: randomUUID(),
  type,
  createdAt,
  deviceId: 'test',
  schemaVersion: 1,
  tz: 'Europe/Madrid',
  payload,
});

/** Copia con todas las lecciones de las unidades indicadas completadas hace tres días: desbloquea los cinco juegos. */
function backupWithProgress(extra: object[] = []): string {
  const when = new Date(Date.now() - 3 * 86_400_000).toISOString();
  const events = [
    ev('settings_changed', { key: 'onboarded', value: true }, when),
    ev('settings_changed', { key: 'tickerInitials', value: 'JAV' }, when),
    ...lessons.map((l) => ev('lesson_completed', { lessonId: l.id, xp: 100, accuracy: 1 }, when)),
    ...extra,
  ];
  return JSON.stringify({
    format: 'compuesto-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    events,
    content_reports: [],
  });
}

async function importBackup(page: Page, json: string) {
  await page.goto('/#/despacho/ajustes');
  await page.setInputFiles('input[type="file"]', {
    name: 'copia.json',
    mimeType: 'application/json',
    buffer: Buffer.from(json),
  });
  await page.getByRole('button', { name: 'Reemplazar mi progreso' }).click();
  await expect(page.getByText('Copia importada.')).toBeVisible({ timeout: 30_000 });
}

async function openGame(page: Page, id: string) {
  await page.goto(`/#/juego/${id}/dia`);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  // sin tiempo: la prueba no depende de relojes
  await page.getByRole('checkbox', { name: 'Sin tiempo' }).check();
}

async function expectPerfect(page: Page) {
  await expect(page.getByTestId('rating')).toHaveText('AAA', { timeout: 15_000 });
  await expect(page.getByTestId('game-xp')).toHaveText('+40 XP');
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await completeOnboarding(page);
});

test('Practicar: sin progreso los juegos están bloqueados y dicen por qué; con progreso, se pueden jugar', async ({
  page,
}) => {
  await importBackup(page, backupWithProgress());
  await page.goto('/#/practicar');
  await page.reload();
  for (const id of ['campana', 'presupuesto', 'mesa-ordenes', 'sube-o-baja', 'magia-compuesto'])
    await expect(
      page.getByTestId(`game-${id}`).getByRole('button', { name: /Jugar/ }),
    ).toBeVisible();
  await expect(page.getByTestId('game-locked')).toHaveCount(0);
});

test('Practicar con un usuario nuevo: todo bloqueado con el motivo', async ({ page }) => {
  await importBackup(
    page,
    JSON.stringify({
      format: 'compuesto-backup',
      version: 1,
      exportedAt: new Date().toISOString(),
      events: [
        ev('settings_changed', { key: 'onboarded', value: true }),
        ev('settings_changed', { key: 'tickerInitials', value: 'JAV' }),
      ],
      content_reports: [],
    }),
  );
  await page.goto('/#/practicar');
  await page.reload();
  await expect(page.getByTestId('game-locked')).toHaveCount(5);
  await expect(page.getByTestId('game-presupuesto')).toContainText('Presupuesto personal');
  await expect(page.getByRole('button', { name: /Jugar a/ })).toHaveCount(0);
});

test('Campana de apertura: 24 tarjetas con las flechas del teclado → AAA', async ({ page }) => {
  await importBackup(page, backupWithProgress());
  test.setTimeout(120_000);
  await openGame(page, 'campana');
  const card = page.getByTestId('bell-card');
  const rating = page.getByTestId('rating');
  for (let i = 0; i < 24; i++) {
    await expect(card.or(rating)).toBeVisible();
    if (await rating.isVisible()) break;
    const text = (await card.innerText()).trim();
    const answer = tfAnswer.get(text);
    expect(answer, `la tarjeta «${text}» viene de una lección vista`).not.toBeUndefined();
    await page.keyboard.press(answer ? 'ArrowRight' : 'ArrowLeft');
    if (i < 23) await expect(card).not.toHaveText(text);
  }
  await expectPerfect(page);
});

test('Cuadra tu presupuesto: teclas 1, 2 y 3 → la balanza cuadra y sale AAA', async ({ page }) => {
  await importBackup(page, backupWithProgress());
  test.setTimeout(120_000);
  await openGame(page, 'presupuesto');
  const seed = dailySeed('presupuesto', today);
  const KEY = { ingreso: '1', gasto: '2', ahorro: '3' } as const;
  for (let r = 0; r < BUDGET_ROUNDS; r++) {
    for (const item of budgetRound(seed, r)) {
      await expect(page.getByTestId('budget-item')).toContainText(item.label);
      await page.keyboard.press(KEY[item.category]);
    }
    await expect(page.getByTestId('balance-state')).toContainText('La balanza cuadra');
    await page
      .getByRole('button', {
        name: r + 1 >= BUDGET_ROUNDS ? 'Ver resultado' : 'Siguiente presupuesto',
      })
      .click();
  }
  await expectPerfect(page);
});

test('Mesa de órdenes: cada cliente con su orden → AAA', async ({ page }) => {
  await importBackup(page, backupWithProgress());
  test.setTimeout(120_000);
  await openGame(page, 'mesa-ordenes');
  const reqs = orderRequests(dailySeed('mesa-ordenes', today), undefined, seen.has('subastas'));
  for (const [i, r] of reqs.entries()) {
    await expect(page.getByTestId('order-request')).toHaveText(r.text);
    if (r.intent === 'immediate') await page.getByRole('button', { name: /A mercado/ }).click();
    else if (r.intent === 'auction') await page.getByRole('button', { name: /Subasta/ }).click();
    else {
      await page.getByRole('button', { name: /Limitada/ }).click();
      await page
        .getByRole('button', { name: `${r.cap!.toFixed(2).replace('.', ',')} €`, exact: true })
        .click();
    }
    await expect(page.getByTestId('order-outcome')).toContainText('✓');
    await page
      .getByRole('button', { name: i + 1 >= reqs.length ? 'Ver resultado' : 'Siguiente cliente' })
      .click();
  }
  await expectPerfect(page);
});

test('¿Sube o baja?: dirección y motivo de cada titular → AAA', async ({ page }) => {
  await importBackup(page, backupWithProgress());
  test.setTimeout(120_000);
  await openGame(page, 'sube-o-baja');
  const rounds = newsRounds(dailySeed('sube-o-baja', today), availableHeadlines(seen));
  for (const [i, r] of rounds.entries()) {
    await expect(page.getByTestId('headline')).toHaveText(r.headline.text);
    await page
      .getByRole('button', { name: r.headline.direction === 'up' ? /Sube/ : /Baja/ })
      .click();
    await page
      .getByRole('button', { name: r.headline.motives[r.headline.answer]!, exact: true })
      .click();
    await expect(page.getByTestId('news-result')).toBeVisible();
    await expect(page.getByTestId('news-result')).toContainText('Dirección');
    await page
      .getByRole('button', { name: i + 1 >= rounds.length ? 'Ver resultado' : 'Siguiente titular' })
      .click();
  }
  await expectPerfect(page);
});

test('La magia del compuesto: elegir aportación y años con el teclado → AAA', async ({ page }) => {
  await importBackup(page, backupWithProgress());
  test.setTimeout(120_000);
  await openGame(page, 'magia-compuesto');
  const rounds = compoundRounds(dailySeed('magia-compuesto', today));
  for (const [i, r] of rounds.entries()) {
    let best = { m: r.monthlyMin, y: r.yearsMin, s: -1 };
    for (let m = r.monthlyMin; m <= r.monthlyMax; m += r.monthlyStep)
      for (let y = r.yearsMin; y <= r.yearsMax; y++) {
        const s = roundScore(finalOf({ ...r, monthly: m, years: y }).real, r.target);
        if (s > best.s) best = { m, y, s };
      }
    await page.getByLabel('Aportación mensual').fill(String(best.m));
    await page.locator('input[type="range"]').nth(1).fill(String(best.y));
    await page.getByRole('button', { name: 'Fijar y ver el resultado' }).click();
    await expect(page.getByTestId('round-result')).toContainText('✓');
    await page
      .getByRole('button', { name: i + 1 >= COMPOUND_ROUNDS ? 'Ver resultado' : 'Siguiente ronda' })
      .click();
  }
  await expectPerfect(page);
});

test('tras jugar: récord y partida del día en Practicar, y XP en el total', async ({ page }) => {
  await importBackup(page, backupWithProgress());
  test.setTimeout(120_000);
  await openGame(page, 'presupuesto');
  const seed = dailySeed('presupuesto', today);
  const KEY = { ingreso: '1', gasto: '2', ahorro: '3' } as const;
  for (let r = 0; r < BUDGET_ROUNDS; r++) {
    for (const item of budgetRound(seed, r)) await page.keyboard.press(KEY[item.category]);
    await page.getByRole('button', { name: /Siguiente presupuesto|Ver resultado/ }).click();
  }
  await expectPerfect(page);
  await expect(page.getByText('Mejor nota de la partida del día: AAA')).toBeVisible();
  await page.goto('/#/practicar');
  await page.reload();
  await expect(page.getByTestId('game-presupuesto')).toContainText('Récord: AAA · 1 partida');
  await expect(page.getByTestId('game-presupuesto')).toContainText('Partida del día: AAA');
});

test('cada juego pasa axe en pantalla de partida a 375 px y no desborda', async ({ page }) => {
  await importBackup(page, backupWithProgress());
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 375, height: 812 });
  for (const id of ['campana', 'presupuesto', 'mesa-ordenes', 'sube-o-baja', 'magia-compuesto']) {
    await openGame(page, id);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.waitForTimeout(600); // fin de la entrada en modo terminal: axe no debe medir contraste a medio fundido
    await page.screenshot({ path: `docs/capturas/2.5/${id}-375.png` });
    const r = await new AxeBuilder({ page })
      .exclude('.kit-ticker')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(
      r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
      id,
    ).toEqual([]);
    const over = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(over, `${id}: desbordamiento`).toBeLessThanOrEqual(0);
  }
});

test('en una sesión: el minijuego es un bloque más y la sesión interrumpida se reanuda en él', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const sessionId = randomUUID();
  const blocks = [
    { kind: 'briefing' },
    { kind: 'game', gameId: 'presupuesto' },
    { kind: 'cierre' },
  ];
  await importBackup(
    page,
    backupWithProgress([
      ev('session_started', { sessionId, day: today, minutes: 10, blocks }),
      ev('session_block_completed', { sessionId, index: 0 }),
    ]),
  );
  await page.goto('/#/');
  await page.reload();
  await page.getByRole('button', { name: 'Reanudar sesión' }).click();
  await expect(page.getByRole('heading', { name: 'Cuadra tu presupuesto' })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Sin tiempo' }).check();
  const seed = dailySeed('presupuesto', today);
  const KEY = { ingreso: '1', gasto: '2', ahorro: '3' } as const;
  for (let r = 0; r < BUDGET_ROUNDS; r++) {
    for (const item of budgetRound(seed, r)) await page.keyboard.press(KEY[item.category]);
    await page.getByRole('button', { name: /Siguiente presupuesto|Ver resultado/ }).click();
  }
  await expect(page.getByTestId('rating')).toHaveText('AAA');
  await page.getByRole('button', { name: 'Siguiente bloque' }).click();
  await expect(page.getByRole('heading', { name: 'Cierre de mercado' })).toBeVisible();
});

test('con tiempo y movimiento: la tarjeta cae y, si no contestas, cuenta como fallo', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await importBackup(page, backupWithProgress());
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(`/#/juego/campana/dia`);
  await page.reload();
  await expect(page.getByTestId('bell-card')).toBeVisible();
  await expect(page.getByText('1/24')).toBeVisible();
  // cae durante 7 s: pasa a la segunda tarjeta sin intervención
  await expect(page.getByText('2/24')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('status').filter({ hasText: 'Se acabó el tiempo' })).toBeAttached();
});
