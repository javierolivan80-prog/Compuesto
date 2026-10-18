import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { expect, type Page } from '@playwright/test';
import { playLesson, type Lesson } from './play';
import { playGameLesson, type GameLesson } from './play-game';

type AnyLesson = Lesson & { game?: GameLesson['game'] };

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.json') ? [p] : [];
  });

/** Todas las lecciones del contenido, para reconocer la que esté en pantalla por su título. */
export const ALL_LESSONS: AnyLesson[] = walk('content/es/levels').map(
  (f) => JSON.parse(readFileSync(f, 'utf8')) as AnyLesson,
);

/**
 * Juega la lección que esté abierta (desde Inicio, el Camino o una sesión), sea normal o lección-juego: la
 * reconoce por el título de la cabecera («N1-U1 · título»). Así los flujos no dependen de cuál es la primera.
 */
export async function playCurrentLesson(page: Page, opts: Parameters<typeof playLesson>[2] = {}) {
  const header = page.getByText(/^N\d+-U\d+ · /).first();
  await expect(header).toBeVisible();
  const title = (await header.textContent())!.replace(/^N\d+-U\d+ · /, '').trim();
  const lesson = ALL_LESSONS.find((l) => l.title === title);
  if (!lesson) throw new Error(`No reconozco la lección «${title}»`);
  const result = lesson.game
    ? await playGameLesson(page, lesson as GameLesson, opts)
    : await playLesson(page, lesson, opts);
  return { ...result, lesson };
}
