/**
 * Evaluador de fórmulas propio (CLAUDE.md §3: HyperFormula es GPL-3.0, no se usa).
 * Sirve a `numeric_input` (campo `formula`) y a `spreadsheet`.
 * Admite: números (coma o punto decimal NO: solo punto), + - * / ^ %, comparaciones, paréntesis,
 * referencias de celda (A1), rangos (A1:B3) y funciones en inglés y español.
 */

export type Value = number | boolean | string;

export class ExprError extends Error {}

type Tok =
  | { t: 'num'; v: number }
  | { t: 'id'; v: string }
  | { t: 'str'; v: string }
  | { t: 'op'; v: string };

const OPS = ['<=', '>=', '<>', '+', '-', '*', '/', '^', '%', '(', ')', ',', ':', '<', '>', '='];

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i]!;
    if (/\s/.test(c)) {
      i++;
    } else if (/[0-9.]/.test(c)) {
      const m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(src.slice(i));
      if (!m) throw new ExprError(`Número no válido en "${src}"`);
      out.push({ t: 'num', v: Number(m[0]) });
      i += m[0].length;
    } else if (/[A-Za-z_$]/.test(c)) {
      const m = /^[A-Za-z_$][A-Za-z0-9_.$]*/.exec(src.slice(i))!;
      out.push({ t: 'id', v: m[0] });
      i += m[0].length;
    } else if (c === '"') {
      const j = src.indexOf('"', i + 1);
      if (j < 0) throw new ExprError('Cadena sin cerrar');
      out.push({ t: 'str', v: src.slice(i + 1, j) });
      i = j + 1;
    } else {
      const op = OPS.find((o) => src.startsWith(o, i));
      if (!op) throw new ExprError(`Carácter inesperado "${c}" en "${src}"`);
      out.push({ t: 'op', v: op });
      i += op.length;
    }
  }
  return out;
}

export interface Env {
  /** Valor de una variable o celda (ya evaluada). */
  get?: (name: string) => Value | undefined;
}

const col = (s: string) =>
  [...s.toUpperCase()].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
const colName = (n: number) => {
  let s = '';
  for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};

/** A1:B2 → [A1,A2,B1,B2] */
export function expandRange(a: string, b: string): string[] {
  const pa = /^([A-Za-z]+)(\d+)$/.exec(a);
  const pb = /^([A-Za-z]+)(\d+)$/.exec(b);
  if (!pa || !pb) throw new ExprError(`Rango no válido ${a}:${b}`);
  const [c1, c2] = [col(pa[1]!), col(pb[1]!)].sort((x, y) => x - y);
  const [r1, r2] = [Number(pa[2]), Number(pb[2])].sort((x, y) => x - y);
  const cells: string[] = [];
  for (let c = c1!; c <= c2!; c++) for (let r = r1!; r <= r2!; r++) cells.push(`${colName(c)}${r}`);
  return cells;
}

const num = (v: Value | undefined): number => {
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v === undefined || v === '') return 0;
  throw new ExprError(`"${String(v)}" no es un número`);
};

const flat = (args: (Value | Value[])[]): number[] =>
  args.flatMap((a) =>
    Array.isArray(a) ? a.filter((x) => typeof x === 'number') : [num(a)],
  ) as number[];

const FUNCS: Record<string, (args: (Value | Value[])[]) => Value> = {
  SUM: (a) => flat(a).reduce((s, x) => s + x, 0),
  AVERAGE: (a) => {
    const v = flat(a);
    if (!v.length) throw new ExprError('PROMEDIO de nada');
    return v.reduce((s, x) => s + x, 0) / v.length;
  },
  MIN: (a) => Math.min(...flat(a)),
  MAX: (a) => Math.max(...flat(a)),
  COUNT: (a) => flat(a).length,
  ABS: (a) => Math.abs(num(a[0] as Value)),
  SQRT: (a) => {
    const x = num(a[0] as Value);
    if (x < 0) throw new ExprError('RAIZ de un negativo');
    return Math.sqrt(x);
  },
  POWER: (a) => Math.pow(num(a[0] as Value), num(a[1] as Value)),
  EXP: (a) => Math.exp(num(a[0] as Value)),
  LN: (a) => {
    const x = num(a[0] as Value);
    if (x <= 0) throw new ExprError('LN de un número no positivo');
    return Math.log(x);
  },
  ROUND: (a) => {
    const f = 10 ** num((a[1] as Value) ?? 0);
    return Math.round(num(a[0] as Value) * f + Number.EPSILON * Math.sign(num(a[0] as Value))) / f;
  },
  IF: (a) => (a[0] ? (a[1] as Value) : ((a[2] as Value) ?? false)),
  // Valor temporal del dinero (convención: tasa por periodo)
  FV: (a) => num(a[0] as Value) * Math.pow(1 + num(a[1] as Value), num(a[2] as Value)),
  PV: (a) => num(a[0] as Value) / Math.pow(1 + num(a[1] as Value), num(a[2] as Value)),
  // VAN de flujos: NPV(tasa, f1, f2, …) descuenta el primero un periodo
  NPV: (a) => {
    const r = num(a[0] as Value);
    return flat(a.slice(1)).reduce((s, cf, i) => s + cf / Math.pow(1 + r, i + 1), 0);
  },
};

/** Alias en español (Excel en castellano). */
const ALIASES: Record<string, string> = {
  SUMA: 'SUM',
  PROMEDIO: 'AVERAGE',
  MIN: 'MIN',
  MAX: 'MAX',
  CONTAR: 'COUNT',
  ABS: 'ABS',
  RAIZ: 'SQRT',
  POTENCIA: 'POWER',
  EXP: 'EXP',
  LN: 'LN',
  REDONDEAR: 'ROUND',
  SI: 'IF',
  VF: 'FV',
  VA: 'PV',
  VNA: 'NPV',
  POW: 'POWER',
};

/** Evalúa `src`. Un error de sintaxis, división por cero, etc. lanza ExprError. */
export function evaluate(src: string, env: Env = {}): Value {
  const toks = tokenize(src.startsWith('=') ? src.slice(1) : src);
  let p = 0;
  const peek = () => toks[p];
  const isOp = (v: string) => peek()?.t === 'op' && (peek() as { v: string }).v === v;
  const eat = (v: string) => {
    if (!isOp(v)) throw new ExprError(`Se esperaba "${v}" en "${src}"`);
    p++;
  };

  const cmp = (): Value => {
    let l = add();
    for (;;) {
      const t = peek();
      if (t?.t !== 'op' || !['<', '>', '<=', '>=', '=', '<>'].includes(t.v)) return l;
      p++;
      const r = add();
      const a = num(l as Value);
      const b = num(r as Value);
      l =
        t.v === '<'
          ? a < b
          : t.v === '>'
            ? a > b
            : t.v === '<='
              ? a <= b
              : t.v === '>='
                ? a >= b
                : t.v === '='
                  ? a === b
                  : a !== b;
    }
  };
  const add = (): Value => {
    let l = mul();
    while (isOp('+') || isOp('-')) {
      const op = (toks[p++] as { v: string }).v;
      const r = mul();
      l = op === '+' ? num(l) + num(r) : num(l) - num(r);
    }
    return l;
  };
  const mul = (): Value => {
    let l = pow();
    while (isOp('*') || isOp('/')) {
      const op = (toks[p++] as { v: string }).v;
      const r = pow();
      if (op === '/' && num(r) === 0) throw new ExprError('División por cero');
      l = op === '*' ? num(l) * num(r) : num(l) / num(r);
    }
    return l;
  };
  const pow = (): Value => {
    const base = unary();
    if (isOp('^')) {
      p++;
      return Math.pow(num(base), num(pow())); // asociativa por la derecha
    }
    return base;
  };
  const unary = (): Value => {
    if (isOp('-')) {
      p++;
      return -num(unary());
    }
    if (isOp('+')) {
      p++;
      return unary();
    }
    return postfix();
  };
  const postfix = (): Value => {
    let v = primary();
    while (isOp('%')) {
      p++;
      v = num(v) / 100;
    }
    return v;
  };
  const primary = (): Value => {
    const t = toks[p++];
    if (!t) throw new ExprError(`Fórmula incompleta: "${src}"`);
    if (t.t === 'num') return t.v;
    if (t.t === 'str') return t.v;
    if (t.t === 'op' && t.v === '(') {
      const v = cmp();
      eat(')');
      return v;
    }
    if (t.t === 'id') {
      const name = t.v;
      if (isOp('(')) {
        p++;
        const args: (Value | Value[])[] = [];
        if (!isOp(')')) {
          do {
            if (isOp(',')) p++;
            args.push(argument());
          } while (isOp(','));
        }
        eat(')');
        const fn = FUNCS[ALIASES[name.toUpperCase()] ?? name.toUpperCase()];
        if (!fn) throw new ExprError(`Función desconocida: ${name}`);
        return fn(args);
      }
      if (name.toUpperCase() === 'TRUE' || name.toUpperCase() === 'VERDADERO') return true;
      if (name.toUpperCase() === 'FALSE' || name.toUpperCase() === 'FALSO') return false;
      const v = env.get?.(name);
      if (v === undefined) throw new ExprError(`Referencia desconocida: ${name}`);
      return v;
    }
    throw new ExprError(`Símbolo inesperado en "${src}"`);
  };
  /** Un argumento puede ser un rango A1:B2 (devuelve la lista de valores). */
  const argument = (): Value | Value[] => {
    const a = toks[p];
    const b = toks[p + 1];
    const c = toks[p + 2];
    if (a?.t === 'id' && b?.t === 'op' && b.v === ':' && c?.t === 'id') {
      p += 3;
      return expandRange(a.v, c.v).map((n) => env.get?.(n) ?? '');
    }
    return cmp();
  };

  const result = cmp();
  if (p < toks.length) throw new ExprError(`Sobra texto en "${src}"`);
  return result;
}

/** Evalúa una fórmula que debe dar un número. */
export function evaluateNumber(src: string, env: Env = {}): number {
  const v = evaluate(src, env);
  if (typeof v !== 'number' || !Number.isFinite(v))
    throw new ExprError(`"${src}" no da un número finito`);
  return v;
}
