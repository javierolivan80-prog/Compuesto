import { expect, type Page } from '@playwright/test';
import type { Exercise } from '../src/content/schemas';
import { BROKERS, cheapestBroker, setupDividend } from '../src/engine/games/dividend-day';
import { setupFirstShares } from '../src/engine/games/first-shares';
import { outcomeAt, PRICES, setupIpo } from '../src/engine/games/ipo-book';
import { playSessions, setupIndex } from '../src/engine/games/index-mover';
import { referenceValues, type LessonGameKind } from '../src/engine/games/lesson-games';
import { instantiate, isParametric } from '../src/engine/params';
import { playLesson, type Lesson } from './play';
import type { Ex } from './solver';

export type GameLesson = Lesson & { game: { kind: LessonGameKind; seed: number } };

/**
 * Lección-juego por la interfaz: juega la partida de referencia 0 del juego (la que content:validate ya comprueba),
 * pasa a la explicación y resuelve los ejercicios con las cifras de esa partida.
 */
export async function playGameLesson(
  page: Page,
  lesson: GameLesson,
  opts: Parameters<typeof playLesson>[2] = {},
) {
  const { kind, seed } = lesson.game;
  if (kind === 'block-trade') {
    // referencia 0: las 600 de golpe a mercado
    await expect(page.getByRole('heading', { name: 'La compra grande' })).toBeVisible();
    await page.getByRole('button', { name: /^Lo que queda/ }).click();
    await page.getByRole('button', { name: /^Comprar \d+ a mercado$/ }).click();
  } else if (kind === 'ipo-book') {
    // referencia 0: el primer precio que se cubre, de abajo arriba (9,00 €)
    await expect(page.getByRole('heading', { name: 'La salida a bolsa' })).toBeVisible();
    await page.getByRole('button', { name: 'Abrir el libro de órdenes' }).click();
    const first = PRICES.find((p) => outcomeAt(setupIpo(seed), p) !== 'failed')!;
    const label = first.toFixed(2).replace('.', ',');
    await page.getByRole('radio', { name: new RegExp(`^${label}`) }).click();
    await page.getByRole('button', { name: new RegExp(`^Fijar el precio en ${label}`) }).click();
    await page.getByRole('button', { name: 'Ver el resumen' }).click();
  } else if (kind === 'dividend-day') {
    // referencia 0: el bróker más barato, sin cazar el dividendo y acertando la fecha ex
    await expect(page.getByRole('heading', { name: 'El primer dividendo' })).toBeVisible();
    const s = setupDividend(seed);
    const name = { llave: 'Llave Valores', fijo: 'Fijo Bolsa', banco: 'Ancla Inversión' }[
      BROKERS[cheapestBroker(s)]!.id
    ];
    await page.getByRole('button', { name: new RegExp(`^${name}`) }).click();
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await page.getByRole('button', { name: /^No hacer nada/ }).click();
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await page.getByRole('button', { name: /^El cierre menos el dividendo/ }).click();
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await page.getByRole('button', { name: 'Pasar un mes y vender' }).click();
  } else if (kind === 'index-mover') {
    // referencia 0: clavar las cuatro sesiones
    await expect(page.getByRole('heading', { name: '¿Quién mueve el índice?' })).toBeVisible();
    const out = playSessions(setupIndex(seed));
    for (const [i, o] of out.entries()) {
      await page
        .getByLabel('¿Cuánto se mueve hoy el índice?')
        .fill(String(Math.round(o.pct * 10) / 10));
      await page.getByRole('button', { name: 'Ver el cierre' }).click();
      await page
        .getByRole('button', {
          name: i === out.length - 1 ? 'Ver el resultado' : 'Siguiente sesión',
        })
        .click();
    }
  } else if (kind === 'opening-auction') {
    // referencia 0: a mercado desde las 8:30
    await expect(page.getByRole('heading', { name: 'La subasta de apertura' })).toBeVisible();
    await page.getByRole('button', { name: 'A mercado' }).click();
    await page.getByRole('button', { name: 'Enviar la orden' }).click();
    await page.getByRole('button', { name: 'Confirmar y esperar a las 9:00' }).click();
  } else {
    // referencia 0: acertar las cinco noticias
    await expect(page.getByRole('heading', { name: 'Tus primeras acciones' })).toBeVisible();
    const label = { up: /^▲ Sube$/, down: /^▼ Baja$/, flat: /^＝ Apenas se mueve$/ } as const;
    const rounds = setupFirstShares(seed).rounds;
    for (const [i, r] of rounds.entries()) {
      await page.getByRole('button', { name: label[r.news.move] }).click();
      await page
        .getByRole('button', {
          name: i === rounds.length - 1 ? 'Ver el resultado' : 'Siguiente noticia',
        })
        .click();
    }
  }
  await page.getByRole('button', { name: 'Ver qué ha pasado' }).click();
  const values = referenceValues(kind, seed)[0]!;
  const exercises = lesson.exercises.map((e) =>
    isParametric(e as unknown as Exercise)
      ? (instantiate(e as unknown as Exercise, undefined, values).exercise as unknown as Ex)
      : e,
  );
  return playLesson(page, { ...lesson, exercises }, opts);
}
