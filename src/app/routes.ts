/* Rutas por hash. Pura y testeada. */

import { GAME_IDS, type GameId } from '../engine/games/common';

export type Route =
  | { name: 'home' }
  | { name: 'camino' }
  | { name: 'practicar' }
  | { name: 'rivales' }
  | { name: 'despacho' }
  | { name: 'ajustes' }
  | { name: 'glosario' }
  | { name: 'reportes' }
  | { name: 'compartir' }
  | { name: 'mesa' }
  | { name: 'sesion' }
  | { name: 'juego'; id: GameId; daily: boolean }
  | { name: 'leccion'; id: string }
  | { name: 'salto'; unitId: string }
  | { name: 'saltar-nivel'; level: number }
  | { name: 'repaso'; mode: 'due' | 'errores' | 'tema'; conceptId?: string }
  | { name: 'examen'; unitId: string };

export type TabId = 'home' | 'camino' | 'practicar' | 'rivales' | 'despacho';

/** CLAUDE.md §2.11: 5 pestañas. Glosario y Ajustes viven dentro de Despacho. */
export const TABS: { id: TabId; label: string; href: string }[] = [
  { id: 'home', label: 'Inicio', href: '#/' },
  { id: 'camino', label: 'Camino', href: '#/camino' },
  { id: 'practicar', label: 'Practicar', href: '#/practicar' },
  { id: 'rivales', label: 'Rivales', href: '#/rivales' },
  { id: 'despacho', label: 'Despacho', href: '#/despacho' },
];

const SLUG = '([a-z0-9-]+)';

export function parseRoute(hash: string): Route {
  const h = hash.replace(/\/+$/, '') || '#/';
  if (h === '#' || h === '#/') return { name: 'home' };
  if (h === '#/camino') return { name: 'camino' };
  if (h === '#/practicar') return { name: 'practicar' };
  if (h === '#/rivales') return { name: 'rivales' };
  if (h === '#/despacho') return { name: 'despacho' };
  if (h === '#/despacho/ajustes') return { name: 'ajustes' };
  if (h === '#/despacho/glosario') return { name: 'glosario' };
  if (h === '#/despacho/reportes') return { name: 'reportes' };
  if (h === '#/despacho/compartir') return { name: 'compartir' };
  if (h === '#/sesion') return { name: 'sesion' };
  if (h === '#/mesa') return { name: 'mesa' };
  let m = new RegExp(`^#/leccion/${SLUG}$`).exec(h);
  if (m) return { name: 'leccion', id: m[1]! };
  m = new RegExp(`^#/juego/${SLUG}(/dia)?$`).exec(h);
  if (m && (GAME_IDS as readonly string[]).includes(m[1]!))
    return { name: 'juego', id: m[1] as GameId, daily: !!m[2] };
  m = new RegExp(`^#/salto/${SLUG}$`).exec(h);
  if (m) return { name: 'salto', unitId: m[1]! };
  m = /^#\/saltar-nivel\/(\d+)$/.exec(h);
  if (m) return { name: 'saltar-nivel', level: Number(m[1]) };
  if (h === '#/repaso') return { name: 'repaso', mode: 'due' };
  if (h === '#/repaso/errores') return { name: 'repaso', mode: 'errores' };
  m = new RegExp(`^#/repaso/tema/${SLUG}$`).exec(h);
  if (m) return { name: 'repaso', mode: 'tema', conceptId: m[1]! };
  m = new RegExp(`^#/examen/${SLUG}$`).exec(h);
  if (m) return { name: 'examen', unitId: m[1]! };
  return { name: 'home' };
}

/** Pestaña que debe aparecer marcada para cada ruta; null = pantalla a pantalla completa (lección, test). */
export function tabOf(route: Route): TabId | null {
  switch (route.name) {
    case 'home':
    case 'mesa':
      return 'home';
    case 'camino':
      return 'camino';
    case 'practicar':
      return 'practicar';
    case 'rivales':
      return 'rivales';
    case 'despacho':
    case 'ajustes':
    case 'glosario':
    case 'reportes':
    case 'compartir':
      return 'despacho';
    default:
      return null;
  }
}
