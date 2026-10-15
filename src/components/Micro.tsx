import { m, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import { ease } from '../design/motion';
import { Sheet } from './Sheet';
import { Button } from './Button';

/** Tarjeta de teoría: entra 16 px desde abajo + fundido; el término clave se subraya con trazo dorado. */
export function TheoryCard({ term, children }: { term: string; children: React.ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <m.article
      initial={reduced ? false : { y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: reduced ? 0.01 : 0.32, ease: ease.out }}
      className="bg-surface-1 border-line grid gap-2 rounded-[var(--radius-md)] border p-4"
    >
      <h3 className="text-xl">
        <span className="key-term">{term}</span>
      </h3>
      <p className="text-text-2">{children}</p>
    </m.article>
  );
}

/** Término del glosario: al tocarlo abre un bottom sheet con la definición. */
export function GlossaryTerm({
  term,
  title,
  definition,
  inline = false,
}: {
  term: string;
  /** Título de la hoja (por defecto, el propio término) */
  title?: string;
  definition: string;
  /** Dentro de un párrafo: no ocupa 48 px de alto (los enlaces en línea están exentos del tamaño mínimo) */
  inline?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`text-brand cursor-pointer underline decoration-dotted underline-offset-4 ${inline ? '' : 'min-h-12'}`}
      >
        {term}
      </button>
      <Sheet open={open} onOpenChange={setOpen} title={title ?? term} description="Glosario">
        <p>{definition}</p>
        <div className="mt-4">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Entendido
          </Button>
        </div>
      </Sheet>
    </>
  );
}

/** Etiqueta "Due diligence · Repaso" con un ligero brillo: distingue repaso de contenido nuevo. */
export function ReviewTag() {
  return (
    <span className="review-tag border-info text-info inline-flex rounded-full border px-3 py-1 text-sm">
      Due diligence · Repaso
    </span>
  );
}

/** Vela de la racha: crece cada día; al romperse, "corrección" sobria en rojo, sin castigo. */
export function StreakCandles({ days, broken = false }: { days: number; broken?: boolean }) {
  const reduced = useReducedMotion();
  const heights = Array.from({ length: days }, (_, i) => 12 + ((i * 7) % 5) * 4 + i * 3);
  return (
    <figure className="grid gap-2">
      <div className="flex h-24 items-end gap-1" aria-hidden="true">
        {heights.map((h, i) => {
          const last = i === days - 1;
          const bear = broken && last;
          return (
            <m.div
              key={i}
              className={`w-3 origin-bottom rounded-sm ${bear ? 'bg-bear' : 'bg-bull'}`}
              style={{ height: h }}
              initial={reduced ? false : { scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: reduced ? 0 : i * 0.04, duration: 0.32, ease: ease.out }}
            />
          );
        })}
      </div>
      <figcaption className="text-sm">
        {broken ? (
          <span className="text-bear">▼ Corrección: la racha se reinicia. Mañana se recupera.</span>
        ) : (
          <span className="text-bull">▲ Racha de {days} días</span>
        )}
      </figcaption>
    </figure>
  );
}
