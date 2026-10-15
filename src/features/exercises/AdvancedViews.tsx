import { useId, useState } from 'react';
import type { Exercise } from '../../content/schemas';
import { ERROR_LABELS } from '../../engine/expr';
import type { GradeResult } from '../../engine/grading';
import { parseNumber } from '../../engine/number-parse';
import { evaluateSheet, isFormula, precedents, type CellInput } from '../../engine/sheet';
import { rowKey, statementTotals } from '../../engine/statement';
import { formatPlain } from '../../lib/format';
import type { ViewProps } from './views';

type Of<T extends Exercise['type']> = Extract<Exercise, { type: T }>;

const colNum = (s: string) => [...s].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
const colName = (n: number) => {
  let s = '';
  for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};
const split = (ref: string) => {
  const m = /^([A-Z]+)(\d+)$/.exec(ref)!;
  return { col: colNum(m[1]!), row: Number(m[2]) };
};

/* ---------- spreadsheet: mini hoja con fórmulas ---------- */

export function SpreadsheetView({
  exercise,
  value,
  onChange,
  result,
}: ViewProps<Of<'spreadsheet'>, 'spreadsheet'>) {
  const id = useId();
  const [focused, setFocused] = useState<string | null>(null);
  const editable = new Set(exercise.editable.length ? exercise.editable : [exercise.target]);
  const refs = [...Object.keys(exercise.cells), ...editable];
  const maxCol = Math.max(...refs.map((r) => split(r).col));
  const maxRow = Math.max(...refs.map((r) => split(r).row));
  const lockedNow = result !== null;

  // la hoja con lo que la persona ha escrito
  const typed: Record<string, CellInput> = {};
  for (const [ref, text] of Object.entries(value.cells))
    if (editable.has(ref) && text.trim() !== '') typed[ref] = text.trim();
  const evaluated = evaluateSheet({ ...exercise.cells, ...typed });
  const showCell = (ref: string): string => {
    const r = evaluated[ref];
    if (!r) return '';
    if (r.error) return r.error;
    return typeof r.value === 'number' ? formatPlain(r.value) : String(r.value ?? '');
  };
  const focusedFormula = focused ? typed[focused] : undefined;
  const refsOfFocused = new Set(
    isFormula(focusedFormula as string | undefined) ? precedents(String(focusedFormula)) : [],
  );
  const targetResult = evaluated[exercise.target];

  return (
    <div className="grid gap-3">
      <p id={`${id}-help`} className="text-text-2 text-sm">
        Escribe una fórmula que empiece por = en la celda {[...editable].join(', ')}. Por ejemplo:
        =A1*2. Funciones: SUMA, PROMEDIO, SI, VNA, TIR…
      </p>
      <div className="overflow-x-auto">
        <table
          className="border-line w-full border-collapse text-base"
          aria-describedby={`${id}-help`}
        >
          <caption className="sr-only">Hoja de cálculo</caption>
          <thead>
            <tr>
              <td className="w-10" />
              {Array.from({ length: maxCol }, (_, c) => (
                <th
                  key={c}
                  scope="col"
                  className="text-text-2 border-line border p-1 text-sm font-normal"
                >
                  {colName(c + 1)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxRow }, (_, r) => (
              <tr key={r}>
                <th scope="row" className="text-text-2 border-line border p-1 text-sm font-normal">
                  {r + 1}
                </th>
                {Array.from({ length: maxCol }, (_, c) => {
                  const ref = `${colName(c + 1)}${r + 1}`;
                  const isEditable = editable.has(ref);
                  const isTarget = ref === exercise.target;
                  const mark =
                    lockedNow && isTarget ? (result.correct ? 'border-bull' : 'border-bear') : '';
                  return (
                    <td
                      key={ref}
                      className={`border-line border p-0 ${refsOfFocused.has(ref) ? 'bg-surface-2 outline-brand outline outline-2 -outline-offset-2' : ''}`}
                    >
                      {isEditable ? (
                        <input
                          aria-label={`Celda ${ref}`}
                          value={value.cells[ref] ?? ''}
                          readOnly={lockedNow}
                          autoComplete="off"
                          autoCapitalize="off"
                          spellCheck={false}
                          onFocus={() => setFocused(ref)}
                          onBlur={() => setFocused((f) => (f === ref ? null : f))}
                          onChange={(e) =>
                            onChange({
                              type: 'spreadsheet',
                              cells: { ...value.cells, [ref]: e.target.value },
                            })
                          }
                          style={{ fontFamily: 'var(--font-mono)' }}
                          className={`bg-surface-1 text-text min-h-12 w-full min-w-28 border-2 px-2 ${mark || 'border-brand'}`}
                        />
                      ) : (
                        <span
                          data-num
                          className="block min-h-12 min-w-20 px-2 py-3"
                          aria-label={ref in exercise.cells ? `Celda ${ref}` : undefined}
                        >
                          {showCell(ref)}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p aria-live="polite" className="text-sm" data-num>
        {typed[exercise.target] === undefined
          ? `Resultado de ${exercise.target}: —`
          : targetResult?.error
            ? `Resultado de ${exercise.target}: ${targetResult.error} ${ERROR_LABELS[targetResult.error]}`
            : `Resultado de ${exercise.target}: ${showCell(exercise.target)}`}
      </p>
      {result && !result.correct && (
        <p className="text-text-2 text-sm" data-num>
          Solución: ={exercise.solution.replace(/^=/, '')} → {formatPlain(exercise.expected)}
          {result.wrongItems && !isFormula(typed[exercise.target]) && exercise.requireFormula
            ? ' (hay que escribir una fórmula, no solo el número)'
            : ''}
        </p>
      )}
    </div>
  );
}

/* ---------- build_statement: rellenar hasta que cuadre ---------- */

export function BuildStatementView({
  exercise,
  value,
  onChange,
  result,
}: ViewProps<Of<'build_statement'>, 'build_statement'>) {
  const id = useId();
  const entered: Record<string, number | null> = {};
  for (const [k, v] of Object.entries(value.values))
    entered[k] = v.trim() === '' ? null : parseNumber(v, value.locale ?? 'es');
  const totals = statementTotals(exercise, entered);
  const wrong = new Set((result as GradeResult | null)?.wrongItems ?? []);
  const label = {
    balance: 'Balance',
    pyg: 'Cuenta de pérdidas y ganancias',
    flujos: 'Estado de flujos de caja',
  }[exercise.statement];

  return (
    <div className="grid gap-4">
      <p className="text-text-2 text-sm">
        Rellena los huecos de {label.toLowerCase()} (cifras en miles de €).
      </p>
      {exercise.sections.map((s, si) => (
        <section
          key={si}
          aria-labelledby={`${id}-${si}`}
          className="bg-surface-1 border-line grid gap-2 rounded-[var(--radius-md)] border p-3"
        >
          <h4 id={`${id}-${si}`} className="text-lg">
            {s.name}
          </h4>
          <ul className="grid gap-2">
            {s.rows.map((r, ri) => {
              const key = rowKey(si, ri);
              const bad = result ? wrong.has(key) : false;
              return (
                <li key={key} className="flex items-center justify-between gap-3">
                  <label htmlFor={`${id}-${key}`}>{r.label}</label>
                  {r.blank ? (
                    <span className="flex items-center gap-2">
                      <input
                        id={`${id}-${key}`}
                        inputMode="decimal"
                        autoComplete="off"
                        spellCheck={false}
                        placeholder="…"
                        value={value.values[key] ?? ''}
                        readOnly={result !== null}
                        aria-invalid={bad ? true : undefined}
                        onChange={(e) =>
                          onChange({
                            type: 'build_statement',
                            values: { ...value.values, [key]: e.target.value },
                            locale: value.locale,
                          })
                        }
                        style={{ fontFamily: 'var(--font-mono)' }}
                        className={`bg-surface-2 text-text min-h-12 w-32 rounded-[var(--radius-sm)] border-2 px-3 text-right ${result ? (bad ? 'border-bear' : 'border-bull') : 'border-line'}`}
                      />
                      {result &&
                        (bad ? (
                          <span className="text-bear text-sm">✗ era {formatPlain(r.value)}</span>
                        ) : (
                          <span className="text-bull text-sm">✓</span>
                        ))}
                    </span>
                  ) : (
                    <span id={`${id}-${key}`} data-num>
                      {formatPlain(r.value)}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <div
        aria-live="polite"
        className="bg-surface-2 border-line grid gap-1 rounded-[var(--radius-md)] border p-3"
        data-num
      >
        {totals.lines.map((l) => (
          <p key={l.label} className="flex justify-between gap-3">
            <span>{l.label}</span>
            <span>{l.value === null ? '—' : formatPlain(l.value)}</span>
          </p>
        ))}
        {totals.balances !== null && (
          <p className={totals.balances ? 'text-bull' : 'text-bear'}>
            {totals.balances ? '✓ El balance cuadra' : '✗ El balance no cuadra todavía'}
          </p>
        )}
      </div>
    </div>
  );
}
