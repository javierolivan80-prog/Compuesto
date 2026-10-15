import { useState } from 'react';
import { GlossaryTerm } from '../../components/Micro';
import { EmptyState } from '../../components/States';
import { glossary } from '../../content/library';
import { normalizeText } from '../../engine/grading';

/** Glosario: buscador y lista; al tocar un término se abre su definición en una hoja inferior. */
export function Glosario() {
  const [q, setQ] = useState('');
  const all = glossary();
  const needle = normalizeText(q);
  const shown = all.filter(
    (g) =>
      !needle ||
      normalizeText(g.term).includes(needle) ||
      normalizeText(g.definition).includes(needle),
  );
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl">Glosario</h1>
      <div className="grid gap-1">
        <label htmlFor="glossary-search" className="text-text-2 text-sm">
          Buscar un término
        </label>
        <input
          id="glossary-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          placeholder="Ej.: inflación…"
          className="bg-surface-1 text-text border-line min-h-12 w-full rounded-[var(--radius-sm)] border px-4 text-base"
        />
      </div>
      {all.length === 0 ? (
        <EmptyState title="El glosario está vacío">
          Los términos se añaden con cada unidad.
        </EmptyState>
      ) : shown.length === 0 ? (
        <EmptyState title="Ningún término coincide">Prueba con otra palabra.</EmptyState>
      ) : (
        <ul className="grid gap-1" aria-label="Términos">
          {shown.map((g) => (
            <li key={g.id} className="border-line border-b">
              <GlossaryTerm term={g.term} definition={g.definition} />
            </li>
          ))}
        </ul>
      )}
      <p className="text-text-2 text-sm" data-num>
        {shown.length} de {all.length} términos
      </p>
    </div>
  );
}
