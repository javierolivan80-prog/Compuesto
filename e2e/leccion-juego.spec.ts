import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { playGameLesson, type GameLesson } from './play-game';
import { completeOnboarding } from './solver';

/* Lección-juego (docs/cambios/rumbo-juego-mercado): se juega primero y la teoría y los ejercicios usan tus cifras. */

test('la compra grande: juego → explicación con tus cifras → ejercicios con tus cifras', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await completeOnboarding(page);
  await page.goto('/#/leccion/n1-u4-l7');
  await expect(page.getByRole('heading', { name: 'La compra grande' })).toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: 'docs/capturas/leccion-juego/juego-375.png', fullPage: true });

  await page.getByRole('button', { name: '300' }).click();
  await page.getByRole('button', { name: 'Comprar 300 a mercado' }).click();
  await page.getByRole('button', { name: 'Lo que queda (300)' }).click();
  await page.getByRole('button', { name: 'Comprar 300 a mercado' }).click();
  const avg = (await page.getByTestId('bt-avg').textContent())!.trim();
  await page.screenshot({ path: 'docs/capturas/leccion-juego/resultado-375.png', fullPage: true });
  await page.getByRole('button', { name: 'Ver qué ha pasado' }).click();

  // la primera tarjeta cita tu precio medio real
  await expect(page.getByText(`Pagaste de media ${avg}`)).toBeVisible();
  await page.screenshot({
    path: 'docs/capturas/leccion-juego/explicacion-375.png',
    fullPage: true,
  });
  for (let i = 0; i < 3; i++)
    await page.getByRole('button', { name: /Siguiente|Empezar los ejercicios/ }).click();

  // el primer ejercicio usa lo que pagaste en tu partida: el precio medio es la respuesta
  const n = avg.replace(/\s?€/, '').trim();
  await expect(page.getByRole('heading', { level: 3 })).toContainText(
    /Pagaste [\d.,]+ € por 600 acciones/,
  );
  await page.getByRole('textbox', { name: /Tu respuesta/ }).fill(n.replace(/\./g, ''));
  await page.getByRole('button', { name: 'Comprobar' }).click();
  await expect(page.getByRole('status')).toContainText('Correcto');
});

test('tus primeras acciones: el onboarding abre el juego; captura, axe y lección completa con tus cifras', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 375, height: 812 });
  await completeOnboarding(page);
  await expect(page).toHaveURL(/#\/leccion\/n1-u1-l6$/); // la primera lección es este juego
  await expect(page.getByRole('heading', { name: 'Tus primeras acciones' })).toBeVisible();
  const axe = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(
    axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
  ).toEqual([]);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  expect(overflow).toBe(false);
  await page.screenshot({ path: 'docs/capturas/leccion-juego/acciones-375.png', fullPage: true });
  await page.getByRole('button', { name: /^▼ Baja$/ }).click();
  await expect(page.getByRole('status')).toBeVisible();
  await page.screenshot({
    path: 'docs/capturas/leccion-juego/acciones-noticia-375.png',
    fullPage: true,
  });

  // de nuevo desde el principio, jugando la partida de referencia y la lección entera
  await page.goto('/#/');
  await page.goto('/#/leccion/n1-u1-l6');
  const lesson = JSON.parse(readFileSync('content/es/levels/n1/u1/l6.json', 'utf8')) as GameLesson;
  const r = await playGameLesson(page, lesson);
  expect(r.answered).toBe(lesson.exercises.length);
  await expect(page.getByRole('heading', { name: 'Lección completada' })).toBeVisible();
});

test('la subasta de apertura: captura y axe a 375 px y lección completa con tus cifras', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 375, height: 812 });
  await completeOnboarding(page);
  await page.goto('/#/leccion/n1-u4-l8');
  await expect(page.getByRole('heading', { name: 'La subasta de apertura' })).toBeVisible();
  const scan = async (label: string) => {
    const axe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(
      axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
      label,
    ).toEqual([]);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    expect(overflow, label).toBe(false);
  };
  await scan('8:30');
  await page.screenshot({
    path: 'docs/capturas/leccion-juego/subasta-830-375.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Enviar la orden' }).click();
  await expect(page.getByTestId('oa-shock')).toBeVisible();
  await scan('8:59');
  await page.screenshot({
    path: 'docs/capturas/leccion-juego/subasta-859-375.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Confirmar y esperar a las 9:00' }).click();
  await expect(page.getByTestId('oa-done')).toBeVisible();
  await scan('resultado');
  await page.screenshot({
    path: 'docs/capturas/leccion-juego/subasta-resultado-375.png',
    fullPage: true,
  });

  await page.goto('/#/');
  await page.goto('/#/leccion/n1-u4-l8');
  const lesson = JSON.parse(readFileSync('content/es/levels/n1/u4/l8.json', 'utf8')) as GameLesson;
  const r = await playGameLesson(page, lesson);
  expect(r.answered).toBe(lesson.exercises.length);
  await expect(page.getByRole('heading', { name: 'Lección completada' })).toBeVisible();
});

test('¿quién mueve el índice?: captura y axe a 375 px y lección completa con tus cifras', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 375, height: 812 });
  await completeOnboarding(page);
  await page.goto('/#/leccion/n1-u3-l6');
  await expect(page.getByRole('heading', { name: '¿Quién mueve el índice?' })).toBeVisible();
  const scan = async (label: string) => {
    const axe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(
      axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
      label,
    ).toEqual([]);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    expect(overflow, label).toBe(false);
  };
  await scan('sesión');
  await page.screenshot({ path: 'docs/capturas/leccion-juego/indice-375.png', fullPage: true });
  await page.getByRole('button', { name: 'Ver el cierre' }).click();
  await page.waitForTimeout(400); // el aviso de fallo es un fundido de 180 ms: medir el contraste al terminar
  await scan('cierre');
  await page.screenshot({
    path: 'docs/capturas/leccion-juego/indice-cierre-375.png',
    fullPage: true,
  });

  await page.goto('/#/');
  await page.goto('/#/leccion/n1-u3-l6');
  const lesson = JSON.parse(readFileSync('content/es/levels/n1/u3/l6.json', 'utf8')) as GameLesson;
  const r = await playGameLesson(page, lesson);
  expect(r.answered).toBe(lesson.exercises.length);
  await expect(page.getByRole('heading', { name: 'Lección completada' })).toBeVisible();
});

test('el primer dividendo: captura y axe a 375 px en cada paso y lección completa con tus cifras', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 375, height: 812 });
  await completeOnboarding(page);
  await page.goto('/#/leccion/n1-u5-l7');
  await expect(page.getByRole('heading', { name: 'El primer dividendo' })).toBeVisible();
  const scan = async (label: string) => {
    await page.waitForTimeout(400); // fundidos de acierto o fallo
    const axe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(
      axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
      label,
    ).toEqual([]);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    expect(overflow, label).toBe(false);
  };
  await scan('bróker');
  await page.getByRole('button', { name: /^Fijo Bolsa/ }).click();
  await scan('bróker elegido');
  await page.screenshot({
    path: 'docs/capturas/leccion-juego/dividendo-broker-375.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('button', { name: /^Comprar 300 más/ }).click();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('button', { name: /^Igual que el cierre/ }).click();
  await expect(page.getByTestId('dv-capture')).toBeVisible();
  await scan('fecha ex');
  await page.screenshot({
    path: 'docs/capturas/leccion-juego/dividendo-ex-375.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await scan('pago');
  await page.screenshot({
    path: 'docs/capturas/leccion-juego/dividendo-pago-375.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Pasar un mes y vender' }).click();
  await scan('resultado');

  await page.goto('/#/');
  await page.goto('/#/leccion/n1-u5-l7');
  const lesson = JSON.parse(readFileSync('content/es/levels/n1/u5/l7.json', 'utf8')) as GameLesson;
  const r = await playGameLesson(page, lesson);
  expect(r.answered).toBe(lesson.exercises.length);
  await expect(page.getByRole('heading', { name: 'Lección completada' })).toBeVisible();
});

test('la salida a bolsa: captura y axe a 375 px en cada paso y lección completa con tus cifras', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 375, height: 812 });
  await completeOnboarding(page);
  await page.goto('/#/leccion/n1-u2-l6');
  await expect(page.getByRole('heading', { name: 'La salida a bolsa' })).toBeVisible();
  const scan = async (label: string) => {
    await page.waitForTimeout(400);
    const axe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(
      axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
      label,
    ).toEqual([]);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    expect(overflow, label).toBe(false);
  };
  await scan('folleto');
  await page.screenshot({
    path: 'docs/capturas/leccion-juego/opv-folleto-375.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Abrir el libro de demanda' }).click();
  await page.getByRole('radio', { name: /^10,50/ }).click();
  await page.getByRole('button', { name: /^Fijar el precio en 10,50/ }).click();
  await expect(page.getByTestId('ipo-failed')).toBeVisible();
  await scan('libro');
  await page.screenshot({ path: 'docs/capturas/leccion-juego/opv-libro-375.png', fullPage: true });
  await page.getByRole('radio', { name: /^10,00/ }).click();
  await page.getByRole('button', { name: /^Fijar el precio en 10,00/ }).click();
  await scan('estreno');
  await page.screenshot({
    path: 'docs/capturas/leccion-juego/opv-estreno-375.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Ver el resumen' }).click();
  await scan('resumen');

  await page.goto('/#/');
  await page.goto('/#/leccion/n1-u2-l6');
  const lesson = JSON.parse(readFileSync('content/es/levels/n1/u2/l6.json', 'utf8')) as GameLesson;
  const r = await playGameLesson(page, lesson);
  expect(r.answered).toBe(lesson.exercises.length);
  await expect(page.getByRole('heading', { name: 'Lección completada' })).toBeVisible();
});
