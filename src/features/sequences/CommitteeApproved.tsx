import { m, useReducedMotion } from 'motion/react';
import { ease } from '../../design/motion';

const SIGNATURES = [
  'M6 30 C 12 10, 18 10, 20 28 S 30 40, 38 18 S 50 24, 58 20',
  'M6 24 C 16 34, 22 12, 30 24 S 44 36, 58 14',
  'M6 28 C 10 14, 20 40, 26 22 S 40 8, 58 30',
];

/** Comité aprobado: expediente → 3 firmas dibujadas → sello (1,4 → 1, sacudida 3 px) → diploma al Despacho. */
export function CommitteeApproved({ unit }: { unit: string }) {
  const reduced = useReducedMotion();
  const d = (n: number) => (reduced ? 0 : n);
  return (
    <section
      aria-label={`Comité de inversión aprobado: ${unit}`}
      className="bg-surface-1 border-line relative grid gap-4 overflow-hidden rounded-[var(--radius-md)] border p-6"
    >
      <m.div
        className="bg-surface-2 border-line grid gap-3 rounded-[var(--radius-sm)] border p-4"
        initial={reduced ? false : { y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: reduced ? 0.01 : 0.32, ease: ease.out }}
      >
        <h3 className="text-xl">Expediente · {unit}</h3>
        <div className="grid grid-cols-3 gap-2">
          {SIGNATURES.map((path, i) => (
            <svg
              key={path}
              viewBox="0 0 64 40"
              aria-hidden="true"
              className="border-line h-10 w-full border-b"
            >
              <m.path
                d={path}
                fill="none"
                stroke="var(--brand)"
                strokeWidth="2"
                strokeLinecap="round"
                initial={reduced ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{
                  delay: d(0.4 + i * 0.35),
                  duration: reduced ? 0.01 : 0.35,
                  ease: ease.out,
                }}
              />
            </svg>
          ))}
        </div>
      </m.div>
      <m.div
        className="text-bull border-bull justify-self-center rounded-[var(--radius-sm)] border-4 px-6 py-2 text-3xl tracking-widest"
        style={{ fontFamily: 'var(--font-display)', rotate: -6 }}
        initial={reduced ? false : { scale: 1.4, opacity: 0 }}
        animate={reduced ? { opacity: 1 } : { scale: 1, opacity: 1, x: [0, 3, -3, 0] }}
        transition={{ delay: d(1.6), duration: reduced ? 0.01 : 0.25, ease: ease.out }}
      >
        ✓ APROBADO
      </m.div>
      <m.p
        className="text-text-2 text-center text-sm"
        initial={reduced ? false : { y: 0, opacity: 0 }}
        animate={reduced ? { opacity: 1 } : { y: [0, 0, -24], opacity: [0, 1, 1] }}
        transition={{ delay: d(2), duration: reduced ? 0.01 : 0.6, ease: ease.out }}
      >
        Diploma enviado al Despacho
      </m.p>
    </section>
  );
}
