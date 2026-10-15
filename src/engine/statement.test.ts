import { describe, expect, it } from 'vitest';
import { exerciseSchema } from '../content/schemas';
import { rowKey, statementTotals } from './statement';

const common = {
  id: 'x-e1',
  difficulty: 2,
  bloom: 'aplicar',
  tags: [],
  concepts: ['interes-compuesto'],
  explanation: 'Porque sí, con motivo.',
  prompt: 'p',
};
const build = (statement: string, sections: object[]) =>
  exerciseSchema.parse({ ...common, type: 'build_statement', statement, sections }) as Extract<
    ReturnType<typeof exerciseSchema.parse>,
    { type: 'build_statement' }
  >;

describe('totales en vivo de un estado financiero', () => {
  const bal = build('balance', [
    {
      name: 'Activo',
      side: 'activo',
      rows: [
        { label: 'Caja', value: 100, blank: true },
        { label: 'Clientes', value: 50 },
      ],
    },
    { name: 'Pasivo', side: 'pasivo', rows: [{ label: 'Deuda', value: 60 }] },
    { name: 'Patrimonio', side: 'patrimonio', rows: [{ label: 'Capital', value: 90 }] },
  ]);
  it('balance: sin rellenar no se sabe (null); relleno bien cuadra; relleno mal no cuadra', () => {
    expect(statementTotals(bal, {}).balances).toBeNull();
    const ok = statementTotals(bal, { [rowKey(0, 0)]: 100 });
    expect(ok.balances).toBe(true);
    expect(ok.lines).toEqual([
      { label: 'Total activo', value: 150 },
      { label: 'Total pasivo + patrimonio', value: 150 },
    ]);
    const ko = statementTotals(bal, { [rowKey(0, 0)]: 80 });
    expect(ko.balances).toBe(false);
    expect(ko.lines[0]!.value).toBe(130);
  });
  it('pyg: resultado = ingresos − gastos', () => {
    const p = build('pyg', [
      { name: 'Ingresos', side: 'ingresos', rows: [{ label: 'Ventas', value: 500 }] },
      {
        name: 'Gastos',
        side: 'gastos',
        rows: [
          { label: 'Compras', value: 300, blank: true },
          { label: 'Personal', value: 120 },
        ],
      },
    ]);
    expect(statementTotals(p, {}).lines[0]!.value).toBeNull();
    expect(statementTotals(p, { [rowKey(1, 0)]: 300 }).lines[0]!.value).toBe(80);
  });
  it('flujos: variación de caja = operativo + inversión + financiación', () => {
    const f = build('flujos', [
      { name: 'Operativo', side: 'operativo', rows: [{ label: 'Resultado', value: 80 }] },
      { name: 'Inversión', side: 'inversion', rows: [{ label: 'Capex', value: -50, blank: true }] },
      { name: 'Financiación', side: 'financiacion', rows: [{ label: 'Deuda', value: 10 }] },
    ]);
    expect(statementTotals(f, { [rowKey(1, 0)]: -50 }).lines[0]!.value).toBe(40);
  });
});
