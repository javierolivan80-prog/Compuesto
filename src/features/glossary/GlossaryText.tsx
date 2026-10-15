import { GlossaryTerm } from '../../components/Micro';
import { glossary } from '../../content/library';
import { linkGlossary } from '../../lib/glossary-links';

/** Texto con los términos del glosario subrayados: al tocarlos se abre su definición en una hoja inferior. */
export function GlossaryText({ text }: { text: string }) {
  return (
    <>
      {linkGlossary(text, glossary()).map((seg, i) =>
        'entry' in seg ? (
          <GlossaryTerm
            key={i}
            inline
            term={seg.text}
            title={seg.entry.term}
            definition={seg.entry.definition}
          />
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  );
}
