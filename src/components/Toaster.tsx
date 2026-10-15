import { Suspense, lazy } from 'react';

const Impl = lazy(() => import('./ToasterImpl').then((m) => ({ default: m.ToasterImpl })));

/** Región de avisos (Sonner), cargada aparte del arranque. */
export function Toaster() {
  return (
    <Suspense fallback={null}>
      <Impl />
    </Suspense>
  );
}
