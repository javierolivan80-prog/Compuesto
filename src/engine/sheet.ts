import { ERROR_LABELS, ExprError, evaluate, type ErrorCode, type Value } from './expr';
import { parseNumber } from './number-parse';

/* Mini hoja de cálculo para el ejercicio `spreadsheet`: evalúa celdas con fórmulas, dependencias y errores por celda. */

export type CellInput = string | number;

export interface CellResult {
  /** Valor calculado (ausente si hay error). */
  value?: Value;
  error?: ErrorCode;
  /** Mensaje en español del error. */
  message?: string;
}

export const isFormula = (raw: CellInput | undefined): raw is string =>
  typeof raw === 'string' && raw.trim().startsWith('=');

/** Contenido literal → valor: "1.234,5" → 1234.5; texto que no es número se queda como texto. */
function literal(raw: CellInput): Value {
  if (typeof raw === 'number') return raw;
  const t = raw.trim();
  if (t === '') return '';
  const n = parseNumber(t, 'es');
  return n === null ? raw : n;
}

/** Celdas a las que una fórmula hace referencia (A1, y rangos A1:B3 expandidos). */
export function precedents(formula: string): string[] {
  const out = new Set<string>();
  const src = formula.replace(/"[^"]*"/g, '');
  for (const m of src.matchAll(/\b([A-Za-z]{1,3}\d{1,4})(?::([A-Za-z]{1,3}\d{1,4}))?\b/g)) {
    const a = m[1]!.toUpperCase();
    if (m[2]) {
      for (const c of expand(a, m[2].toUpperCase())) out.add(c);
    } else out.add(a);
  }
  return [...out].sort();
}

const colNum = (s: string) => [...s].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
const colName = (n: number) => {
  let s = '';
  for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};
function expand(a: string, b: string): string[] {
  const pa = /^([A-Z]+)(\d+)$/.exec(a)!;
  const pb = /^([A-Z]+)(\d+)$/.exec(b)!;
  const [c1, c2] = [colNum(pa[1]!), colNum(pb[1]!)].sort((x, y) => x - y);
  const [r1, r2] = [Number(pa[2]), Number(pb[2])].sort((x, y) => x - y);
  const cells: string[] = [];
  for (let c = c1!; c <= c2!; c++) for (let r = r1!; r <= r2!; r++) cells.push(`${colName(c)}${r}`);
  return cells;
}

/** Evalúa todas las celdas. Los errores se propagan a las celdas que dependen de ellas; los ciclos dan #CIRC!. */
export function evaluateSheet(cells: Record<string, CellInput>): Record<string, CellResult> {
  const raw: Record<string, CellInput> = {};
  for (const [k, v] of Object.entries(cells)) raw[k.toUpperCase()] = v;
  const results: Record<string, CellResult> = {};
  const resolving = new Set<string>();

  const compute = (ref: string): CellResult => {
    const cached = results[ref];
    if (cached) return cached;
    const content = raw[ref];
    if (content === undefined) return { value: '' };
    if (resolving.has(ref)) return { error: '#CIRC!', message: ERROR_LABELS['#CIRC!'] };
    let res: CellResult;
    if (isFormula(content)) {
      resolving.add(ref);
      try {
        const v = evaluate(content, {
          get: (name) => {
            const r = compute(name.toUpperCase());
            if (r.error) throw new ExprError(`${name}: ${r.message}`, r.error);
            return r.value;
          },
        });
        res = { value: v };
      } catch (e) {
        res =
          e instanceof ExprError
            ? { error: e.code, message: e.message }
            : { error: '#SYNTAX!', message: ERROR_LABELS['#SYNTAX!'] };
      }
      resolving.delete(ref);
    } else {
      res = { value: literal(content) };
    }
    results[ref] = res;
    return res;
  };

  for (const ref of Object.keys(raw)) compute(ref);
  return results;
}

/** Valor numérico de una celda, o null si está vacía, es texto o tiene error. */
export function numericValue(r: CellResult | undefined): number | null {
  return r && !r.error && typeof r.value === 'number' && Number.isFinite(r.value) ? r.value : null;
}
