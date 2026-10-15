type SonnerToast = typeof import('sonner').toast;

/** Aviso breve. Sonner se carga la primera vez que se usa, para no pesar en el arranque. */
export function toast(...args: Parameters<SonnerToast>): void {
  void import('sonner').then((m) => m.toast(...args));
}
