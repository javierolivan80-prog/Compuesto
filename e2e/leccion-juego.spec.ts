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

test('el rumor de OPA: captura y axe a 375 px en cada día y lección completa con tus cifras', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 375, height: 812 });
  await completeOnboarding(page);
  await page.goto('/#/leccion/n1-u6-l7');
  await expect(page.getByRole('heading', { name: 'El rumor de OPA' })).toBeVisible();
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
  await scan('rumor');
  await page.screenshot({ path: 'docs/capturas/leccion-juego/opa-rumor-375.png', fullPage: true });
  await page.getByRole('button', { name: /^No hacer nada/ }).click();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('button', { name: /^No operar, no contárselo/ }).click();
  await scan('confidencia');
  await page.screenshot({
    path: 'docs/capturas/leccion-juego/opa-confidencia-375.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await scan('anuncio');
  await page.screenshot({
    path: 'docs/capturas/leccion-juego/opa-anuncio-375.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: /^Vender hoy en bolsa/ }).click();
  await page.getByRole('button', { name: 'Ver el resumen' }).click();
  await scan('resumen');

  await page.goto('/#/');
  await page.goto('/#/leccion/n1-u6-l7');
  const lesson = JSON.parse(readFileSync('content/es/levels/n1/u6/l7.json', 'utf8')) as GameLesson;
  const r = await playGameLesson(page, lesson);
  expect(r.answered).toBe(lesson.exercises.length);
  await expect(page.getByRole('heading', { name: 'Lección completada' })).toBeVisible();
});

test('cuadra el balance: captura y axe a 375 px en cada fase y lección completa con tus cifras', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 375, height: 812 });
  await completeOnboarding(page);
  await page.goto('/#/leccion/n3-u1-l1');
  await expect(page.getByRole('heading', { name: 'Cuadra el balance' })).toBeVisible();
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
  await scan('clasificar');
  await page.screenshot({
    path: 'docs/capturas/leccion-juego/balance-clasificar-375.png',
    fullPage: true,
  });
  // ocho partidas: da igual dónde, el juego las coloca en su sitio
  for (let i = 0; i < 8; i++)
    await page.getByRole('button', { name: 'Activo', exact: true }).click();
  await scan('operación');
  const group = page.getByRole('group', { name: '¿Qué apunte recoge la operación?' });
  await group.getByRole('button').first().click();
  await scan('explicación del apunte');
  await page.screenshot({
    path: 'docs/capturas/leccion-juego/balance-apunte-375.png',
    fullPage: true,
  });
  for (let k = 0; k < 5; k++) {
    await page.getByRole('button', { name: /Siguiente operación|Ver el balance final/ }).click();
    if (k < 4) await group.getByRole('button').first().click();
  }
  await scan('resumen');

  await page.goto('/#/');
  await page.goto('/#/leccion/n3-u1-l1');
  const lesson = JSON.parse(readFileSync('content/es/levels/n3/u1/l1.json', 'utf8')) as GameLesson;
  const r = await playGameLesson(page, lesson);
  expect(r.answered).toBe(lesson.exercises.length);
  await expect(page.getByRole('heading', { name: 'Lección completada' })).toBeVisible();
});

test('ciclo de caja: captura y axe a 375 px en cada paso y lección completa con tus cifras', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 375, height: 812 });
  await completeOnboarding(page);
  await page.goto('/#/leccion/n3-u2-l1');
  await expect(page.getByRole('heading', { name: 'Ciclo de caja' })).toBeVisible();
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
  await scan('cobro');
  await page.screenshot({ path: 'docs/capturas/leccion-juego/caja-plan-375.png', fullPage: true });
  // el plan de siempre con póliza: sin caja
  for (const re of [/^60 días: lo que pide/, /^60 días: lo habitual/, /^50 días de media/]) {
    await page.getByRole('radio', { name: re }).click();
    await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  }
  await scan('financiación');
  await page.getByRole('radio', { name: /^Póliza de crédito/ }).click();
  await page.getByRole('button', { name: 'Cerrar el plan y ver el año' }).click();
  await scan('sin caja');
  await page.screenshot({
    path: 'docs/capturas/leccion-juego/caja-sin-caja-375.png',
    fullPage: true,
  });

  await page.goto('/#/');
  await page.goto('/#/leccion/n3-u2-l1');
  const lesson = JSON.parse(readFileSync('content/es/levels/n3/u2/l1.json', 'utf8')) as GameLesson;
  const r = await playGameLesson(page, lesson);
  expect(r.answered).toBe(lesson.exercises.length);
  await expect(page.getByRole('heading', { name: 'Lección completada' })).toBeVisible();
});

test('¿quién es quién?: captura y axe a 375 px y lección completa con tus cifras', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 375, height: 812 });
  await completeOnboarding(page);
  await page.goto('/#/leccion/n3-u3-l1');
  await expect(page.getByRole('heading', { name: '¿Quién es quién?' })).toBeVisible();
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
  await scan('tarjetas');
  await page.getByRole('button', { name: /^Pedir otro ratio/ }).click();
  for (let i = 0; i < 5; i++)
    await page
      .locator('select')
      .nth(i)
      .selectOption({ index: i + 1 });
  await page.getByRole('button', { name: 'Comprobar' }).click();
  await scan('resultado');
  await page.screenshot({
    path: 'docs/capturas/leccion-juego/ratios-resultado-375.png',
    fullPage: true,
  });

  await page.goto('/#/');
  await page.goto('/#/leccion/n3-u3-l1');
  const lesson = JSON.parse(readFileSync('content/es/levels/n3/u3/l1.json', 'utf8')) as GameLesson;
  const r = await playGameLesson(page, lesson);
  expect(r.answered).toBe(lesson.exercises.length);
  await expect(page.getByRole('heading', { name: 'Lección completada' })).toBeVisible();
});

test('¿cara o barata?: captura y axe a 375 px y lección completa con tus cifras', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 375, height: 812 });
  await completeOnboarding(page);
  await page.goto('/#/leccion/n3-u4-l1');
  await expect(page.getByRole('heading', { name: '¿Cara o barata?' })).toBeVisible();
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
  await scan('comparables');
  await page.getByRole('radio', { name: /^La media:/ }).click();
  await scan('referencia');
  await page.getByRole('radio', { name: 'Barata', exact: true }).click();
  await scan('veredicto');
  await page.screenshot({
    path: 'docs/capturas/leccion-juego/cara-barata-375.png',
    fullPage: true,
  });

  await page.goto('/#/');
  await page.goto('/#/leccion/n3-u4-l1');
  const lesson = JSON.parse(readFileSync('content/es/levels/n3/u4/l1.json', 'utf8')) as GameLesson;
  const r = await playGameLesson(page, lesson);
  expect(r.answered).toBe(lesson.exercises.length);
  await expect(page.getByRole('heading', { name: 'Lección completada' })).toBeVisible();
});

test('la mezcla de la financiación: captura y axe a 375 px en cada paso y lección completa con tus cifras', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 375, height: 812 });
  await completeOnboarding(page);
  await page.goto('/#/leccion/n3-u5-l1');
  await expect(page.getByRole('heading', { name: 'La mezcla de la financiación' })).toBeVisible();
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
  await scan('beta');
  // la beta sin apalancar: el fallo típico
  await page.getByRole('radio', { name: '0,65', exact: true }).click();
  await scan('beta-fallo');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('button', { name: 'Más deuda' }).click();
  await expect(page.getByTestId('wg-wacc')).toHaveText(/8,13/);
  await scan('mezcla');
  await page.getByRole('button', { name: 'Proponer un 25 % de deuda' }).click();
  await expect(page.getByTestId('wg-reveal')).toContainText('35 %');
  await scan('resultado');
  await page.screenshot({
    path: 'docs/capturas/leccion-juego/wacc-375.png',
    fullPage: true,
  });

  await page.goto('/#/');
  await page.goto('/#/leccion/n3-u5-l1');
  const lesson = JSON.parse(readFileSync('content/es/levels/n3/u5/l1.json', 'utf8')) as GameLesson;
  const r = await playGameLesson(page, lesson);
  expect(r.answered).toBe(lesson.exercises.length);
  await expect(page.getByRole('heading', { name: 'Lección completada' })).toBeVisible();
});

test('DCF Express: captura y axe a 375 px en cada reto y lección completa con tus cifras', async ({
  page,
}) => {
  test.setTimeout(150_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 375, height: 812 });
  await completeOnboarding(page);
  await page.goto('/#/leccion/n3-u6-l1');
  await expect(page.getByRole('heading', { name: 'DCF Express' })).toBeVisible();
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
  await scan('mercado');
  await page.getByRole('button', { name: /^Proponer un WACC/ }).click();
  await expect(page.getByTestId('dg-why')).toContainText('✗');
  await scan('mercado-fallo');
  await page.getByRole('button', { name: 'Siguiente reto' }).click();
  await page.getByRole('button', { name: /^Proponer g/ }).click();
  await page.getByRole('radio', { name: /^Sí:/ }).click();
  await scan('jefe');
  await page.getByRole('button', { name: 'Siguiente reto' }).click();
  await scan('comite');
  await page.screenshot({ path: 'docs/capturas/leccion-juego/dcf-375.png', fullPage: true });

  await page.goto('/#/');
  await page.goto('/#/leccion/n3-u6-l1');
  const lesson = JSON.parse(readFileSync('content/es/levels/n3/u6/l1.json', 'utf8')) as GameLesson;
  const r = await playGameLesson(page, lesson);
  expect(r.answered).toBe(lesson.exercises.length);
  await expect(page.getByRole('heading', { name: 'Lección completada' })).toBeVisible();
});

test('la emisión de Naranjas: captura y axe a 375 px en cada paso y lección completa con tus cifras', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 375, height: 812 });
  await completeOnboarding(page);
  await page.goto('/#/leccion/n2-u1-l1');
  await expect(page.getByRole('heading', { name: 'La emisión de Naranjas' })).toBeVisible();
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
  await scan('cupon');
  // el cupón inicial (3 %) se queda corto: bajo la par
  await page.getByRole('button', { name: /^Emitir con un cupón/ }).click();
  await expect(page.getByTestId('bg-why')).toContainText('✗');
  await scan('cupon-fallo');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('radio', { name: '▼ Baja' }).click();
  await scan('un-ano-despues');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await scan('tir');
  await page.screenshot({ path: 'docs/capturas/leccion-juego/bono-375.png', fullPage: true });

  await page.goto('/#/');
  await page.goto('/#/leccion/n2-u1-l1');
  const lesson = JSON.parse(readFileSync('content/es/levels/n2/u1/l1.json', 'utf8')) as GameLesson;
  const r = await playGameLesson(page, lesson);
  expect(r.answered).toBe(lesson.exercises.length);
  await expect(page.getByRole('heading', { name: 'Lección completada' })).toBeVisible();
});

test('curva de tipos: captura y axe a 375 px en cada reto y lección completa con tus cifras', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 375, height: 812 });
  await completeOnboarding(page);
  await page.goto('/#/leccion/n2-u2-l1');
  await expect(page.getByRole('heading', { name: 'Curva de tipos' })).toBeVisible();
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
  await scan('reto-1');
  await page.getByRole('button', { name: 'Empinar la curva' }).click();
  await page.getByRole('button', { name: 'Empinar la curva' }).click();
  await expect(page.getByTestId('cg-price-30')).toContainText('▼');
  await scan('curva-movida');
  await page.screenshot({ path: 'docs/capturas/leccion-juego/curva-375.png', fullPage: true });
  await page.getByRole('button', { name: 'Comprobar' }).click();
  await expect(page.getByTestId('cg-why')).toContainText('✗');
  await page.getByRole('button', { name: 'Siguiente reto' }).click();
  await page.getByRole('button', { name: 'Comprobar' }).click();
  await page.getByRole('button', { name: 'Siguiente reto' }).click();
  await scan('duracion');

  await page.goto('/#/');
  await page.goto('/#/leccion/n2-u2-l1');
  const lesson = JSON.parse(readFileSync('content/es/levels/n2/u2/l1.json', 'utf8')) as GameLesson;
  const r = await playGameLesson(page, lesson);
  expect(r.answered).toBe(lesson.exercises.length);
  await expect(page.getByRole('heading', { name: 'Lección completada' })).toBeVisible();
});

test('dos fondos, veinte años: captura y axe a 375 px en cada paso y lección completa con tus cifras', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 375, height: 812 });
  await completeOnboarding(page);
  await page.goto('/#/leccion/n2-u3-l1');
  await expect(page.getByRole('heading', { name: 'Dos fondos, veinte años' })).toBeVisible();
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
  await scan('comisiones');
  await page.getByRole('radio').first().click();
  await scan('carrera');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  for (let i = 0; i < 4; i++)
    await page
      .getByRole('radiogroup')
      .nth(i)
      .getByRole('radio', { name: 'Fondo', exact: true })
      .click();
  await page.getByRole('button', { name: 'Comprobar' }).click();
  await scan('vehiculos');
  await page.screenshot({ path: 'docs/capturas/leccion-juego/fondos-375.png', fullPage: true });
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('radio', { name: /^Vendo/ }).click();
  await scan('venta');

  await page.goto('/#/');
  await page.goto('/#/leccion/n2-u3-l1');
  const lesson = JSON.parse(readFileSync('content/es/levels/n2/u3/l1.json', 'utf8')) as GameLesson;
  const r = await playGameLesson(page, lesson);
  expect(r.answered).toBe(lesson.exercises.length);
  await expect(page.getByRole('heading', { name: 'Lección completada' })).toBeVisible();
});

test('¿suerte o habilidad?: captura y axe a 375 px en cada paso y lección completa con tus cifras', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 375, height: 812 });
  await completeOnboarding(page);
  await page.goto('/#/leccion/n2-u4-l1');
  await expect(page.getByRole('heading', { name: '¿Suerte o habilidad?' })).toBeVisible();
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
  await scan('media');
  await page.getByRole('radio').first().click();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await scan('volatilidad');
  await page.getByRole('radio', { name: 'El fondo A' }).click();
  await expect(page.getByTestId('lg-why')).toContainText('✗');
  await page.screenshot({ path: 'docs/capturas/leccion-juego/suerte-375.png', fullPage: true });
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await scan('colas');
  await page.getByRole('radio').first().click();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('radio', { name: /^Sí:/ }).click();
  await scan('genio');

  await page.goto('/#/');
  await page.goto('/#/leccion/n2-u4-l1');
  const lesson = JSON.parse(readFileSync('content/es/levels/n2/u4/l1.json', 'utf8')) as GameLesson;
  const r = await playGameLesson(page, lesson);
  expect(r.answered).toBe(lesson.exercises.length);
  await expect(page.getByRole('heading', { name: 'Lección completada' })).toBeVisible();
});

test('el viaje del dólar: captura y axe a 375 px en cada paso y lección completa con tus cifras', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 375, height: 812 });
  await completeOnboarding(page);
  await page.goto('/#/leccion/n2-u5-l1');
  await expect(page.getByRole('heading', { name: 'El viaje del dólar' })).toBeVisible();
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
  await scan('comprar');
  await page.getByRole('radio').first().click();
  await expect(page.getByTestId('xg-why')).toContainText('✗');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('radio', { name: /^Más/ }).click();
  await scan('un-ano');
  await page.screenshot({ path: 'docs/capturas/leccion-juego/dolar-375.png', fullPage: true });
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('radio', { name: /^La normal/ }).click();
  await scan('cobertura');

  await page.goto('/#/');
  await page.goto('/#/leccion/n2-u5-l1');
  const lesson = JSON.parse(readFileSync('content/es/levels/n2/u5/l1.json', 'utf8')) as GameLesson;
  const r = await playGameLesson(page, lesson);
  expect(r.answered).toBe(lesson.exercises.length);
  await expect(page.getByRole('heading', { name: 'Lección completada' })).toBeVisible();
});

test('una noche en la tesorería: captura y axe a 375 px en cada paso y lección completa con tus cifras', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 375, height: 812 });
  await completeOnboarding(page);
  await page.goto('/#/leccion/n2-u6-l1');
  await expect(page.getByRole('heading', { name: 'Una noche en la tesorería' })).toBeVisible();
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
  await scan('repo');
  await page.getByRole('radio').last().click();
  await expect(page.getByTestId('rg-why')).toContainText('✗');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await scan('intereses');
  await page.getByRole('radio').last().click();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('radio', { name: 'La titulización' }).click();
  await scan('recurso');
  await page.screenshot({ path: 'docs/capturas/leccion-juego/tesoreria-375.png', fullPage: true });

  await page.goto('/#/');
  await page.goto('/#/leccion/n2-u6-l1');
  const lesson = JSON.parse(readFileSync('content/es/levels/n2/u6/l1.json', 'utf8')) as GameLesson;
  const r = await playGameLesson(page, lesson);
  expect(r.answered).toBe(lesson.exercises.length);
  await expect(page.getByRole('heading', { name: 'Lección completada' })).toBeVisible();
});

test('el escaparate del banco: captura y axe a 375 px en cada paso y lección completa con tus cifras', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 375, height: 812 });
  await completeOnboarding(page);
  await page.goto('/#/leccion/n2-u7-l1');
  await expect(page.getByRole('heading', { name: 'El escaparate del banco' })).toBeVisible();
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
  await scan('productos');
  // todo «No complejo»: falla los dos complejos
  for (const g of await page.getByRole('radiogroup').all())
    await g.getByRole('radio', { name: 'No complejo', exact: true }).click();
  await page.getByRole('button', { name: 'Comprobar' }).click();
  await expect(page.getByText(/^✗ Complejo/).first()).toBeVisible();
  await scan('productos corregidos');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('radio').last().click();
  await expect(page.getByTestId('wn-why')).toContainText('✗');
  await scan('plan');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('radio').first().click();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('radio').first().click();
  await scan('futuro');
  await page.screenshot({ path: 'docs/capturas/leccion-juego/escaparate-375.png', fullPage: true });

  await page.goto('/#/');
  await page.goto('/#/leccion/n2-u7-l1');
  const lesson = JSON.parse(readFileSync('content/es/levels/n2/u7/l1.json', 'utf8')) as GameLesson;
  const r = await playGameLesson(page, lesson);
  expect(r.answered).toBe(lesson.exercises.length);
  await expect(page.getByRole('heading', { name: 'Lección completada' })).toBeVisible();
});

test('el día del dato: captura y axe a 375 px en cada paso y lección completa con tus cifras', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 375, height: 812 });
  await completeOnboarding(page);
  await page.goto('/#/leccion/n4-u1-l1');
  await expect(page.getByRole('heading', { name: 'El día del dato' })).toBeVisible();
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
  await scan('ipc');
  await page.getByRole('radio').last().click();
  await expect(page.getByTestId('mg-why')).toContainText('✗');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await scan('sorpresa');
  await page.getByRole('radio', { name: 'Baja' }).click();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('radio').first().click();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('radio').first().click();
  await scan('paro');
  await page.screenshot({
    path: 'docs/capturas/leccion-juego/dia-del-dato-375.png',
    fullPage: true,
  });

  await page.goto('/#/');
  await page.goto('/#/leccion/n4-u1-l1');
  const lesson = JSON.parse(readFileSync('content/es/levels/n4/u1/l1.json', 'utf8')) as GameLesson;
  const r = await playGameLesson(page, lesson);
  expect(r.answered).toBe(lesson.exercises.length);
  await expect(page.getByRole('heading', { name: 'Lección completada' })).toBeVisible();
});

test('la reunión del BCE: captura y axe a 375 px en cada paso y lección completa con tus cifras', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 375, height: 812 });
  await completeOnboarding(page);
  await page.goto('/#/leccion/n4-u2-l1');
  await expect(page.getByRole('heading', { name: 'La reunión del BCE' })).toBeVisible();
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
  await scan('taylor');
  await page.getByRole('radio').last().click();
  await expect(page.getByTestId('eg-why')).toContainText('✗');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await scan('decision');
  await page.getByRole('radio', { name: 'Se aprecia', exact: true }).click();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await scan('hipoteca');
  await page.getByRole('radio').first().click();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('radio').first().click();
  await scan('qe');
  await page.screenshot({
    path: 'docs/capturas/leccion-juego/reunion-bce-375.png',
    fullPage: true,
  });

  await page.goto('/#/');
  await page.goto('/#/leccion/n4-u2-l1');
  const lesson = JSON.parse(readFileSync('content/es/levels/n4/u2/l1.json', 'utf8')) as GameLesson;
  const r = await playGameLesson(page, lesson);
  expect(r.answered).toBe(lesson.exercises.length);
  await expect(page.getByRole('heading', { name: 'Lección completada' })).toBeVisible();
});

test('la prima de riesgo: captura y axe a 375 px en cada paso y lección completa con tus cifras', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 375, height: 812 });
  await completeOnboarding(page);
  await page.goto('/#/leccion/n4-u3-l1');
  await expect(page.getByRole('heading', { name: 'La prima de riesgo' })).toBeVisible();
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
  await scan('fase');
  await page.getByRole('radio', { name: 'Recesión', exact: true }).click();
  await expect(page.getByTestId('rg-why')).toContainText('✗');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await scan('rotación');
  await page.getByRole('radio', { name: /^Las defensivas/ }).click();
  await expect(page.getByTestId('rg-why')).toContainText('✓');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await scan('prima');
  await page.getByRole('radio').first().click();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('radio').first().click();
  await scan('deuda');
  await page.screenshot({
    path: 'docs/capturas/leccion-juego/prima-riesgo-375.png',
    fullPage: true,
  });

  await page.goto('/#/');
  await page.goto('/#/leccion/n4-u3-l1');
  const lesson = JSON.parse(readFileSync('content/es/levels/n4/u3/l1.json', 'utf8')) as GameLesson;
  const r = await playGameLesson(page, lesson);
  expect(r.answered).toBe(lesson.exercises.length);
  await expect(page.getByRole('heading', { name: 'Lección completada' })).toBeVisible();
});

test('la mesa de divisas: captura y axe a 375 px en cada paso y lección completa con tus cifras', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 375, height: 812 });
  await completeOnboarding(page);
  await page.goto('/#/leccion/n4-u4-l1');
  await expect(page.getByRole('heading', { name: 'La mesa de divisas' })).toBeVisible();
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
  await scan('balanza');
  await page.getByRole('radio', { name: '20 (superávit)', exact: true }).click();
  await expect(page.getByTestId('fd-why')).toContainText('✗');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await scan('forward');
  await page.getByRole('radio', { name: '1,1216', exact: true }).click();
  await expect(page.getByTestId('fd-why')).toContainText('✓');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await scan('carry');
  await page.getByRole('radio').first().click();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('radio').first().click();
  await scan('emergentes');
  await page.screenshot({
    path: 'docs/capturas/leccion-juego/mesa-divisas-375.png',
    fullPage: true,
  });

  await page.goto('/#/');
  await page.goto('/#/leccion/n4-u4-l1');
  const lesson = JSON.parse(readFileSync('content/es/levels/n4/u4/l1.json', 'utf8')) as GameLesson;
  const r = await playGameLesson(page, lesson);
  expect(r.answered).toBe(lesson.exercises.length);
  await expect(page.getByRole('heading', { name: 'Lección completada' })).toBeVisible();
});

test('stress test: captura y axe a 375 px en cada paso y lección completa con tus cifras', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 375, height: 812 });
  await completeOnboarding(page);
  await page.goto('/#/leccion/n4-u5-l1');
  await expect(page.getByRole('heading', { name: 'Stress test' })).toBeVisible();
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
  await scan('margen');
  await page.getByRole('radio', { name: /^600\sM€$/ }).click();
  await expect(page.getByTestId('sg-why')).toContainText('✗');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await scan('cet1');
  await page.getByRole('radio', { name: /^13,0\s%$/ }).click();
  await expect(page.getByTestId('sg-why')).toContainText('✓');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await scan('estrés');
  await page.getByRole('radio').first().click();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('radio').first().click();
  await scan('liquidez');
  await page.screenshot({
    path: 'docs/capturas/leccion-juego/stress-test-375.png',
    fullPage: true,
  });

  await page.goto('/#/');
  await page.goto('/#/leccion/n4-u5-l1');
  const lesson = JSON.parse(readFileSync('content/es/levels/n4/u5/l1.json', 'utf8')) as GameLesson;
  const r = await playGameLesson(page, lesson);
  expect(r.answered).toBe(lesson.exercises.length);
  await expect(page.getByRole('heading', { name: 'Lección completada' })).toBeVisible();
});

test('comité de riesgos: captura y axe a 375 px en cada paso y lección completa con tus cifras', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 375, height: 812 });
  await completeOnboarding(page);
  await page.goto('/#/leccion/n4-u6-l1');
  await expect(page.getByRole('heading', { name: 'Comité de riesgos' })).toBeVisible();
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
  await scan('pérdida esperada');
  await page.getByRole('radio', { name: /^20\smil\s€$/ }).click();
  await expect(page.getByTestId('cg-why')).toContainText('✗');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await scan('decisión');
  await page.getByRole('radio', { name: 'Pedir la garantía', exact: true }).click();
  await expect(page.getByTestId('cg-why')).toContainText('✓');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await scan('fase');
  await page.getByRole('radio').first().click();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('radio').first().click();
  await scan('provisión');
  await page.screenshot({
    path: 'docs/capturas/leccion-juego/comite-riesgos-375.png',
    fullPage: true,
  });

  await page.goto('/#/');
  await page.goto('/#/leccion/n4-u6-l1');
  const lesson = JSON.parse(readFileSync('content/es/levels/n4/u6/l1.json', 'utf8')) as GameLesson;
  const r = await playGameLesson(page, lesson);
  expect(r.answered).toBe(lesson.exercises.length);
  await expect(page.getByRole('heading', { name: 'Lección completada' })).toBeVisible();
});

test('qué banco compras: captura y axe a 375 px en cada paso y lección completa con tus cifras', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 375, height: 812 });
  await completeOnboarding(page);
  await page.goto('/#/leccion/n4-u7-l1');
  await expect(page.getByRole('heading', { name: '¿Qué banco compras?' })).toBeVisible();
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
  await scan('rote');
  await page.getByRole('radio', { name: /^10,5\s%$/ }).click();
  await expect(page.getByTestId('bv-why')).toContainText('✗');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await scan('pvtc');
  await page.getByRole('radio', { name: '1,10x', exact: true }).click();
  await expect(page.getByTestId('bv-why')).toContainText('✓');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await scan('justificado');
  await page.getByRole('radio').first().click();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('radio').first().click();
  await scan('elección');
  await page.screenshot({
    path: 'docs/capturas/leccion-juego/que-banco-compras-375.png',
    fullPage: true,
  });

  await page.goto('/#/');
  await page.goto('/#/leccion/n4-u7-l1');
  const lesson = JSON.parse(readFileSync('content/es/levels/n4/u7/l1.json', 'utf8')) as GameLesson;
  const r = await playGameLesson(page, lesson);
  expect(r.answered).toBe(lesson.exercises.length);
  await expect(page.getByRole('heading', { name: 'Lección completada' })).toBeVisible();
});

test('mesa de órdenes de N5: captura y axe a 375 px en cada paso y lección completa con tus cifras', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 375, height: 812 });
  await completeOnboarding(page);
  await page.goto('/#/leccion/n5-u1-l1');
  await expect(page.getByRole('heading', { name: 'Mesa de órdenes' })).toBeVisible();
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
  await scan('efectiva');
  await page.getByRole('radio', { name: /^40,0\spb$/ }).click();
  await expect(page.getByTestId('od-why')).toContainText('✗');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await scan('realizada');
  await page.getByRole('radio', { name: /^10,0\spb$/ }).click();
  await expect(page.getByTestId('od-why')).toContainText('✓');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await scan('dark pool');
  await page.getByRole('radio').first().click();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('radio').first().click();
  await scan('market maker');
  await page.screenshot({
    path: 'docs/capturas/leccion-juego/mesa-ordenes-n5-375.png',
    fullPage: true,
  });

  await page.goto('/#/');
  await page.goto('/#/leccion/n5-u1-l1');
  const lesson = JSON.parse(readFileSync('content/es/levels/n5/u1/l1.json', 'utf8')) as GameLesson;
  const r = await playGameLesson(page, lesson);
  expect(r.answered).toBe(lesson.exercises.length);
  await expect(page.getByRole('heading', { name: 'Lección completada' })).toBeVisible();
});

test('contra el VWAP de N5: captura y axe a 375 px en cada paso y lección completa con tus cifras', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 375, height: 812 });
  await completeOnboarding(page);
  await page.goto('/#/leccion/n5-u2-l1');
  await expect(page.getByRole('heading', { name: 'Contra el VWAP' })).toBeVisible();
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
  await scan('vwap');
  await page.getByRole('radio', { name: /^10,100\s€$/ }).click();
  await expect(page.getByTestId('vw-why')).toContainText('✗');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await scan('shortfall');
  await page.getByRole('radio', { name: /^80,0\spb$/ }).click();
  await expect(page.getByTestId('vw-why')).toContainText('✓');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await scan('costes');
  await page.getByRole('radio').first().click();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('radio').first().click();
  await scan('dónde ejecutar');
  await page.screenshot({
    path: 'docs/capturas/leccion-juego/contra-el-vwap-n5-375.png',
    fullPage: true,
  });

  await page.goto('/#/');
  await page.goto('/#/leccion/n5-u2-l1');
  const lesson = JSON.parse(readFileSync('content/es/levels/n5/u2/l1.json', 'utf8')) as GameLesson;
  const r = await playGameLesson(page, lesson);
  expect(r.answered).toBe(lesson.exercises.length);
  await expect(page.getByRole('heading', { name: 'Lección completada' })).toBeVisible();
});

test('la posición corta de N5: captura y axe a 375 px en cada paso y lección completa con tus cifras', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 375, height: 812 });
  await completeOnboarding(page);
  await page.goto('/#/leccion/n5-u3-l1');
  await expect(page.getByRole('heading', { name: 'La posición corta' })).toBeVisible();
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
  await scan('préstamo');
  await page.getByRole('radio', { name: /^875\s€$/ }).click();
  await expect(page.getByTestId('sd-why')).toContainText('✗');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await scan('resultado');
  await page.getByRole('radio', { name: /^20\.000\s€$/ }).click();
  await expect(page.getByTestId('sd-why')).toContainText('✓');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await scan('margin call');
  await page.getByRole('radio').first().click();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('radio').first().click();
  await scan('CNMV');
  await page.screenshot({
    path: 'docs/capturas/leccion-juego/posicion-corta-n5-375.png',
    fullPage: true,
  });

  await page.goto('/#/');
  await page.goto('/#/leccion/n5-u3-l1');
  const lesson = JSON.parse(readFileSync('content/es/levels/n5/u3/l1.json', 'utf8')) as GameLesson;
  const r = await playGameLesson(page, lesson);
  expect(r.answered).toBe(lesson.exercises.length);
  await expect(page.getByRole('heading', { name: 'Lección completada' })).toBeVisible();
});

test('¿ventaja real? de N5: captura y axe a 375 px en cada paso y lección completa con tus cifras', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 375, height: 812 });
  await completeOnboarding(page);
  await page.goto('/#/leccion/n5-u4-l1');
  await expect(page.getByRole('heading', { name: '¿Ventaja real?' })).toBeVisible();
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
  await scan('valor esperado');
  await page.getByRole('radio', { name: /^66\s€$/ }).click();
  await expect(page.getByTestId('et-why')).toContainText('✗');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await scan('estadístico t');
  await page.getByRole('radio', { name: /^1,60$/ }).click();
  await expect(page.getByTestId('et-why')).toContainText('✓');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await scan('multiple testing');
  await page.getByRole('radio').first().click();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('radio').first().click();
  await scan('Bayes');
  await page.screenshot({
    path: 'docs/capturas/leccion-juego/ventaja-real-n5-375.png',
    fullPage: true,
  });

  await page.goto('/#/');
  await page.goto('/#/leccion/n5-u4-l1');
  const lesson = JSON.parse(readFileSync('content/es/levels/n5/u4/l1.json', 'utf8')) as GameLesson;
  const r = await playGameLesson(page, lesson);
  expect(r.answered).toBe(lesson.exercises.length);
  await expect(page.getByRole('heading', { name: 'Lección completada' })).toBeVisible();
});

test('¿patrón o ruido? de N5: captura y axe a 375 px en cada paso y lección completa con tus cifras', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 375, height: 812 });
  await completeOnboarding(page);
  await page.goto('/#/leccion/n5-u5-l1');
  await expect(page.getByRole('heading', { name: '¿Patrón o ruido?' })).toBeVisible();
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
  await scan('gráfico');
  await page.getByRole('radio', { name: 'La serie A' }).click();
  await expect(page.getByTestId('pn-why')).toContainText('✗');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await scan('medias móviles');
  await page.getByRole('radio', { name: /^3\s%$/ }).click();
  await expect(page.getByTestId('pn-why')).toContainText('✓');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await scan('momentum');
  await page.getByRole('radio').first().click();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('radio').first().click();
  await scan('CFD');
  await page.screenshot({
    path: 'docs/capturas/leccion-juego/patron-o-ruido-n5-375.png',
    fullPage: true,
  });

  await page.goto('/#/');
  await page.goto('/#/leccion/n5-u5-l1');
  const lesson = JSON.parse(readFileSync('content/es/levels/n5/u5/l1.json', 'utf8')) as GameLesson;
  const r = await playGameLesson(page, lesson);
  expect(r.answered).toBe(lesson.exercises.length);
  await expect(page.getByRole('heading', { name: 'Lección completada' })).toBeVisible();
});

test('el trader con stop de N5: captura y axe a 375 px en cada paso y lección completa con tus cifras', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 375, height: 812 });
  await completeOnboarding(page);
  await page.goto('/#/leccion/n5-u6-l1');
  await expect(page.getByRole('heading', { name: 'El trader con stop' })).toBeVisible();
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
  await scan('tamaño');
  await page.getByRole('radio', { name: '500 acciones' }).click();
  await expect(page.getByTestId('st-why')).toContainText('✗');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await scan('riesgo y beneficio');
  await page.getByRole('radio', { name: /^33,3\s%$/ }).click();
  await expect(page.getByTestId('st-why')).toContainText('✓');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await scan('30 sesiones');
  await page.getByRole('radio').first().click();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('radio').first().click();
  await scan('tentación');
  await page.screenshot({
    path: 'docs/capturas/leccion-juego/trader-con-stop-n5-375.png',
    fullPage: true,
  });

  await page.goto('/#/');
  await page.goto('/#/leccion/n5-u6-l1');
  const lesson = JSON.parse(readFileSync('content/es/levels/n5/u6/l1.json', 'utf8')) as GameLesson;
  const r = await playGameLesson(page, lesson);
  expect(r.answered).toBe(lesson.exercises.length);
  await expect(page.getByRole('heading', { name: 'Lección completada' })).toBeVisible();
});
