import { Briefcase, Building2, Dumbbell, House, Trophy, type LucideIcon } from 'lucide-react';
import { TABS, type TabId } from '../app/routes';

const ICONS: Record<TabId, LucideIcon> = {
  home: House,
  camino: Building2,
  practicar: Dumbbell,
  rivales: Trophy,
  despacho: Briefcase,
};

/** Barra de 5 pestañas (CLAUDE.md §2.11). Enlaces reales (hash): funcionan con teclado y con Cmd/Ctrl+clic. */
export function TabBar({ active }: { active: TabId | null }) {
  return (
    <nav
      aria-label="Navegación principal"
      className="bg-surface-1 border-line fixed inset-x-0 bottom-0 border-t pb-[env(safe-area-inset-bottom)]"
      style={{ zIndex: 'var(--z-sticky)' }}
    >
      <ul className="mx-auto grid max-w-xl grid-cols-5">
        {TABS.map((t) => {
          const Icon = ICONS[t.id];
          const current = t.id === active;
          return (
            <li key={t.id}>
              <a
                href={t.href}
                aria-current={current ? 'page' : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs transition-colors ${current ? 'text-brand' : 'text-text-2'}`}
              >
                <Icon aria-hidden="true" size={22} strokeWidth={current ? 2.25 : 1.75} />
                {t.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
