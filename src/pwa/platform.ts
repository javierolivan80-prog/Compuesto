/** Detección de plataforma para la guía de instalación (pura y probable con un `navigator` falso). */

export interface NavLike {
  userAgent: string;
  platform?: string;
  maxTouchPoints?: number;
  standalone?: boolean;
}

/** iPhone/iPad (incluido iPadOS, que se presenta como Mac con pantalla táctil). */
export function isIos(nav: NavLike): boolean {
  if (/iPhone|iPad|iPod/.test(nav.userAgent)) return true;
  return nav.platform === 'MacIntel' && (nav.maxTouchPoints ?? 0) > 1;
}

export function isStandalone(nav: NavLike, displayModeStandalone: boolean): boolean {
  return displayModeStandalone || nav.standalone === true;
}

export type InstallMode = 'installed' | 'ios' | 'prompt' | 'manual';

export function installMode(opts: {
  nav: NavLike;
  displayModeStandalone: boolean;
  hasPrompt: boolean;
}): InstallMode {
  if (isStandalone(opts.nav, opts.displayModeStandalone)) return 'installed';
  if (isIos(opts.nav)) return 'ios';
  return opts.hasPrompt ? 'prompt' : 'manual';
}
