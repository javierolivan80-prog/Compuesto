/**
 * Registro local de errores de la app (CLAUDE.md §11): últimos 200, en localStorage (no depende de IndexedDB,
 * que suele ser justo lo que falla). Exportable para pasárselo a Claude Code.
 */
export const ERROR_LOG_KEY = 'compuesto.errorlog';
export const MAX_ENTRIES = 200;

export interface ErrorEntry {
  at: string;
  source: 'error' | 'promesa' | 'console';
  message: string;
  stack?: string;
}

function read(): ErrorEntry[] {
  try {
    const raw = localStorage.getItem(ERROR_LOG_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as ErrorEntry[]) : [];
  } catch {
    return [];
  }
}

export function getErrors(): ErrorEntry[] {
  return read();
}

export function logError(source: ErrorEntry['source'], err: unknown, now: Date = new Date()): void {
  const message = err instanceof Error ? err.message : String(err);
  const entry: ErrorEntry = { at: now.toISOString(), source, message: message.slice(0, 500) };
  if (err instanceof Error && err.stack) entry.stack = err.stack.split('\n').slice(0, 6).join('\n');
  try {
    const next = [...read(), entry].slice(-MAX_ENTRIES);
    localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(next));
  } catch {
    /* sin almacenamiento: no se puede registrar */
  }
}

export function clearErrors(): void {
  try {
    localStorage.removeItem(ERROR_LOG_KEY);
  } catch {
    /* nada */
  }
}

let installed = false;
/** Engancha window.onerror, promesas sin capturar y console.error (una sola vez). */
export function installErrorLog(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.addEventListener('error', (e) => logError('error', e.error ?? e.message));
  window.addEventListener('unhandledrejection', (e) => logError('promesa', e.reason));
  const original = console.error;
  console.error = (...args: unknown[]) => {
    logError(
      'console',
      args
        .map((a) =>
          a instanceof Error ? a.message : typeof a === 'string' ? a : JSON.stringify(a),
        )
        .join(' '),
    );
    original(...args);
  };
}
