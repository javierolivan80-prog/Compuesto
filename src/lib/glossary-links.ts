import type { GlossaryEntry } from '../content/schemas';

export type Segment = { text: string } | { text: string; entry: GlossaryEntry };

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Divide un texto en trozos y marca la PRIMERA aparición de cada término del glosario (o de sus alias).
 * Coincidencia insensible a mayúsculas y solo con palabras completas; los términos largos ganan a los cortos
 * y un trozo ya marcado no se vuelve a marcar.
 */
export function linkGlossary(text: string, entries: readonly GlossaryEntry[]): Segment[] {
  const patterns = entries
    .flatMap((entry) => [entry.term, ...entry.aliases].map((p) => ({ entry, p })))
    .sort((a, b) => b.p.length - a.p.length);
  const taken: { start: number; end: number; entry: GlossaryEntry }[] = [];
  const used = new Set<string>();
  for (const { entry, p } of patterns) {
    if (used.has(entry.id)) continue;
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(p)}(?![\\p{L}\\p{N}])`, 'iu');
    const m = re.exec(text);
    if (!m) continue;
    const start = m.index;
    const end = start + m[0].length;
    if (taken.some((t) => start < t.end && end > t.start)) continue;
    taken.push({ start, end, entry });
    used.add(entry.id);
  }
  taken.sort((a, b) => a.start - b.start);
  const out: Segment[] = [];
  let pos = 0;
  for (const t of taken) {
    if (t.start > pos) out.push({ text: text.slice(pos, t.start) });
    out.push({ text: text.slice(t.start, t.end), entry: t.entry });
    pos = t.end;
  }
  if (pos < text.length) out.push({ text: text.slice(pos) });
  return out.length ? out : [{ text }];
}
