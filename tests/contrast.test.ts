import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrastRatio, parseOklch } from '../src/engine/color';

const css = readFileSync('src/design/themes/themes.css', 'utf8');

function parseThemes(source: string): Record<string, Record<string, string>> {
  const themes: Record<string, Record<string, string>> = {};
  for (const block of source.matchAll(/\[data-theme='(\w+)'\]\s*\{([^}]*)\}/g)) {
    const vars: Record<string, string> = {};
    for (const v of block[2]!.matchAll(/--([\w-]+):\s*([^;]+);/g)) vars[v[1]!] = v[2]!.trim();
    themes[block[1]!] = vars;
  }
  return themes;
}

const themes = parseThemes(css);
const NAMES = ['noche', 'mayfair', 'salmon', 'ginebra', 'montecarlo', 'tokio', 'platino'];

// [primer plano, fondo, mínimo]: 4.5 = texto normal AA.
const PAIRS: [string, string, number][] = [
  ['text', 'bg', 4.5],
  ['text', 'surface-1', 4.5],
  ['text', 'surface-2', 4.5],
  ['text-2', 'bg', 4.5],
  ['text-2', 'surface-1', 4.5],
  ['brand', 'bg', 4.5],
  ['bull', 'bg', 4.5],
  ['bear', 'bg', 4.5],
  ['bull', 'surface-1', 4.5],
  ['bear', 'surface-1', 4.5],
  ['info', 'bg', 4.5],
];

describe('contraste WCAG AA por tema', () => {
  it('define los 7 temas', () => {
    expect(Object.keys(themes).sort()).toEqual([...NAMES].sort());
  });

  for (const name of NAMES) {
    describe(name, () => {
      for (const [fg, bg, min] of PAIRS) {
        it(`${fg} sobre ${bg} ≥ ${min}`, () => {
          const t = themes[name]!;
          const ratio = contrastRatio(parseOklch(t[fg]!), parseOklch(t[bg]!));
          expect(ratio, `${name}: ${fg}/${bg} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(min);
        });
      }
    });
  }
});
