import type { ReactNode } from 'react';
import { Button } from './Button';

/** Estados de pantalla (EXECUTION §4): carga, error, vacío y "Próximamente" explícito. */

export function Loading({ label = 'Cargando…' }: { label?: string }) {
  return (
    <p role="status" className="text-text-2">
      {label}
    </p>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="border-bear grid gap-3 rounded-[var(--radius-md)] border p-4">
      <p className="text-bear">Error: {message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry} className="justify-self-start">
          Reintentar
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="bg-surface-1 border-line grid gap-1 rounded-[var(--radius-md)] border p-4">
      <p className="text-lg">{title}</p>
      {children && <div className="text-text-2 text-sm">{children}</div>}
    </div>
  );
}

/** Lo que llega en una fase posterior se rotula como "Próximamente" y no tiene controles falsos (CLAUDE.md §3b). */
export function ComingSoon({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      aria-labelledby="soon-title"
      className="border-line grid gap-2 rounded-[var(--radius-md)] border border-dashed p-4"
    >
      <p className="text-brand text-sm">Próximamente</p>
      <h2 id="soon-title" className="text-2xl">
        {title}
      </h2>
      <div className="text-text-2">{children}</div>
    </section>
  );
}

export function OfflineBanner() {
  return (
    <p
      role="status"
      className="bg-surface-2 border-line text-text-2 rounded-[var(--radius-sm)] border px-3 py-2 text-sm"
    >
      Sin conexión. Compuesto funciona igual: tu progreso se guarda en este dispositivo.
    </p>
  );
}
