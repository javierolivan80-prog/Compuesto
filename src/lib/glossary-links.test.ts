import { describe, expect, it } from 'vitest';
import type { GlossaryEntry } from '../content/schemas';
import { linkGlossary } from './glossary-links';

const entry = (id: string, term: string, aliases: string[] = []): GlossaryEntry => ({
  id,
  term,
  definition: `def ${term}`,
  level: 0,
  concepts: [],
  aliases,
  status: 'reviewed',
  reviewedBy: [],
  verificarAntesDe: null,
  sources: [],
});
const E = [
  entry('inf', 'Inflación'),
  entry('pa', 'Poder adquisitivo'),
  entry('ic', 'Interés compuesto', ['compuesto']),
  entry('is', 'Interés simple'),
];
const texts = (s: ReturnType<typeof linkGlossary>) =>
  s.map((x) => ('entry' in x ? `[${x.text}]` : x.text)).join('');

describe('enlaces al glosario', () => {
  it('marca la primera aparición de cada término, sin importar mayúsculas', () => {
    const s = linkGlossary(
      'La inflación sube los precios; la Inflación pierde poder adquisitivo.',
      E,
    );
    expect(texts(s)).toBe(
      'La [inflación] sube los precios; la Inflación pierde [poder adquisitivo].',
    );
  });
  it('solo palabras completas y con tildes', () => {
    expect(texts(linkGlossary('Inflaciones y desinflación no cuentan.', E))).toBe(
      'Inflaciones y desinflación no cuentan.',
    );
    expect(texts(linkGlossary('(inflación)', E))).toBe('([inflación])');
  });
  it('el término largo gana al alias corto y no se solapan', () => {
    expect(texts(linkGlossary('El interés compuesto crece.', E))).toBe(
      'El [interés compuesto] crece.',
    );
    expect(texts(linkGlossary('Es compuesto, no simple.', E))).toBe('Es [compuesto], no simple.'); // alias
  });
  it('sin coincidencias devuelve el texto entero', () => {
    expect(linkGlossary('Nada que marcar.', E)).toEqual([{ text: 'Nada que marcar.' }]);
    expect(linkGlossary('', E)).toEqual([{ text: '' }]);
  });
  it('caracteres especiales en el término no rompen la expresión', () => {
    const s = linkGlossary('El tipo (anual) cambia', [entry('x', 'tipo (anual)')]);
    expect(texts(s)).toBe('El [tipo (anual)] cambia');
  });
  it('cada término se enlaza una sola vez', () => {
    const s = linkGlossary('inflación inflación inflación', E);
    expect(s.filter((x) => 'entry' in x)).toHaveLength(1);
  });
});
