import { describe, expect, it } from 'vitest';
import companiesJson from '../../content/shared/companies.json';
import { companiesSchema } from '../content/schemas';
import { symbolOf, universeTicker } from './ticker';

describe('cinta del universo', () => {
  const companies = companiesSchema.parse(companiesJson);
  it('solo muestra las cotizadas: la gestora de capital riesgo no sale', () => {
    const t = universeTicker(companies, '2026-10-17');
    expect(t).toHaveLength(companies.filter((c) => c.listed).length);
    expect(t.map((x) => x.name)).not.toContain('Marjal Capital Partners S.G.E.I.C., S.A.');
    expect(t.map((x) => x.symbol)).toContain(symbolOf('azahar-calderona'));
  });
  it('determinista por día', () => {
    expect(universeTicker(companies, '2026-10-17')).toEqual(
      universeTicker(companies, '2026-10-17'),
    );
  });
});
