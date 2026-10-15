import type { Exercise } from '../content/schemas';

type Build = Extract<Exercise, { type: 'build_statement' }>;

export const rowKey = (section: number, row: number) => `${section}.${row}`;

export interface StatementTotals {
  /** Subtotales por bloque, null si falta algún dato. */
  sections: (number | null)[];
  /** Resumen de la comprobación (activo = pasivo + patrimonio, resultado, variación de caja). */
  lines: { label: string; value: number | null }[];
  /** true/false según cuadre; null si aún faltan huecos. */
  balances: boolean | null;
}

/** Valor de cada fila: el fijo del enunciado o el que ha escrito la persona (null si está vacío o es ilegible). */
export function rowValues(e: Build, entered: Record<string, number | null>): (number | null)[][] {
  return e.sections.map((s, si) =>
    s.rows.map((r, ri) => (r.blank ? (entered[rowKey(si, ri)] ?? null) : r.value)),
  );
}

const sum = (xs: (number | null)[]): number | null =>
  xs.some((x) => x === null) ? null : (xs as number[]).reduce((a, b) => a + b, 0);

/** Totales en vivo para mostrar si el estado "cuadra" mientras se rellena. */
export function statementTotals(e: Build, entered: Record<string, number | null>): StatementTotals {
  const vals = rowValues(e, entered);
  const sections = vals.map(sum);
  const side = (name: string): number | null => {
    const idx = e.sections.map((s, i) => (s.side === name ? i : -1)).filter((i) => i >= 0);
    return idx.length ? sum(idx.map((i) => sections[i]!)) : 0;
  };

  if (e.statement === 'balance') {
    const activo = side('activo');
    const pasivo = side('pasivo');
    const patr = side('patrimonio');
    const pp = pasivo === null || patr === null ? null : pasivo + patr;
    return {
      sections,
      lines: [
        { label: 'Total activo', value: activo },
        { label: 'Total pasivo + patrimonio', value: pp },
      ],
      balances: activo === null || pp === null ? null : Math.abs(activo - pp) < 0.005,
    };
  }
  if (e.statement === 'pyg') {
    const ing = side('ingresos');
    const gas = side('gastos');
    const res = ing === null || gas === null ? null : ing - gas;
    return {
      sections,
      lines: [{ label: 'Resultado (ingresos − gastos)', value: res }],
      balances: null,
    };
  }
  const ops = side('operativo');
  const inv = side('inversion');
  const fin = side('financiacion');
  const tot = ops === null || inv === null || fin === null ? null : ops + inv + fin;
  return { sections, lines: [{ label: 'Variación de caja', value: tot }], balances: null };
}
