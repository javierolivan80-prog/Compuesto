import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

/* CLAUDE.md §1: todos los textos en archivos de idioma. Este test recorre los componentes (.tsx) y busca
   texto fijo en JSX (nodos de texto y atributos aria-label/title/placeholder/alt/label).
   Trinquete: los archivos antiguos están en `tests/i18n-legacy.json` y solo pueden salir de la lista;
   cualquier archivo nuevo o ya migrado debe estar limpio. */

const ATTRS = new Set(['aria-label', 'title', 'placeholder', 'alt', 'label']);
const LETTERS = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{2,}/;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory()
      ? walk(p)
      : p.endsWith('.tsx') && !p.endsWith('.test.tsx')
        ? [p]
        : [];
  });
}

export function hardcodedTexts(source: string): string[] {
  const sf = ts.createSourceFile('x.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found: string[] = [];
  const visit = (n: ts.Node) => {
    if (ts.isJsxText(n)) {
      const text = n.getText().trim();
      if (LETTERS.test(text)) found.push(text);
    } else if (
      ts.isJsxAttribute(n) &&
      ATTRS.has(n.name.getText()) &&
      n.initializer &&
      ts.isStringLiteral(n.initializer) &&
      LETTERS.test(n.initializer.text)
    ) {
      found.push(n.initializer.text);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return found;
}

const LEGACY_FILE = 'tests/i18n-legacy.json';

describe('i18n: sin textos fijos en los componentes', () => {
  it('detecta texto en JSX y atributos, e ignora expresiones y t()', () => {
    expect(hardcodedTexts('const a = <p>Hola mundo</p>;')).toEqual(['Hola mundo']);
    expect(hardcodedTexts('const a = <button aria-label="Cerrar" />;')).toEqual(['Cerrar']);
    expect(hardcodedTexts("const a = <p>{t('x.y')}</p>;")).toEqual([]);
    expect(hardcodedTexts('const a = <p>{n}</p>;')).toEqual([]);
    expect(hardcodedTexts('const a = <p>12 · 3</p>;')).toEqual([]);
  });

  it('los archivos nuevos están limpios y la lista antigua solo se encoge', () => {
    const legacy: string[] = JSON.parse(readFileSync(LEGACY_FILE, 'utf8'));
    const dirty = walk('src')
      .filter((f) => hardcodedTexts(readFileSync(f, 'utf8')).length > 0)
      .map((f) => f.replaceAll('\\', '/'))
      .sort();
    if (process.env['I18N_UPDATE_LEGACY']) {
      writeFileSync(LEGACY_FILE, JSON.stringify(dirty, null, 2) + '\n');
      return;
    }
    const newOffenders = dirty.filter((f) => !legacy.includes(f));
    expect(newOffenders, 'texto fijo en archivos nuevos: usa t() y src/i18n/es.json').toEqual([]);
    const migrated = legacy.filter((f) => !dirty.includes(f));
    expect(migrated, 'ya están limpios: quítalos de tests/i18n-legacy.json').toEqual([]);
  });
});
