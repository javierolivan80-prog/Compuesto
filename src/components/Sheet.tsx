import { Drawer } from 'vaul';
import type { ReactNode } from 'react';

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}

/** Bottom sheet (Vaul): cierra con Esc, arrastre y botón; foco atrapado por Radix. */
export function Sheet({ open, onOpenChange, title, description, children }: SheetProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay
          className="fixed inset-0 bg-black/50"
          style={{ zIndex: 'var(--z-overlay)' }}
        />
        <Drawer.Content
          className="bg-surface-1 text-text border-line fixed inset-x-0 bottom-0 mx-auto max-w-xl rounded-t-[var(--radius-md)] border-t p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
          style={{ zIndex: 'var(--z-sheet)' }}
        >
          <Drawer.Handle className="mb-4" />
          <Drawer.Title className="text-2xl">{title}</Drawer.Title>
          {description ? (
            <Drawer.Description className="text-text-2 mt-1">{description}</Drawer.Description>
          ) : (
            <Drawer.Description className="sr-only">{title}</Drawer.Description>
          )}
          <div className="mt-4">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
