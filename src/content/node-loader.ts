/** Carga de /content desde disco (solo scripts y tests; nunca se importa desde la app). */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { ContentBundle, RawFile } from './validate';

const readJson = (p: string): unknown => JSON.parse(readFileSync(p, 'utf8'));

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

function jsonFiles(root: string, sub: string): RawFile[] {
  return walk(join(root, sub))
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => {
      try {
        return { path: relative(root, f), data: readJson(f) };
      } catch (e) {
        return { path: relative(root, f), data: { __parseError: (e as Error).message } };
      }
    });
}

export function loadContent(root = 'content'): ContentBundle {
  return {
    concepts: readJson(join(root, 'shared/concepts.json')),
    companies: readJson(join(root, 'shared/companies.json')),
    games: readJson(join(root, 'shared/games.json')),
    realCompanies: readJson(join(root, 'shared/real-companies-blocklist.json')) as string[],
    idsLock: readJson(join(root, 'shared/ids-lock.json')) as Record<string, string>,
    glossary: readJson(join(root, 'es/glossary.json')),
    curriculum: readJson(join(root, 'es/curriculum.json')),
    lessons: [...jsonFiles(root, 'es/levels'), ...jsonFiles(root, 'es/tracks')],
    placements: jsonFiles(root, 'es/placement'),
  };
}
