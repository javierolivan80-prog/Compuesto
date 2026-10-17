import { useEffect, useRef } from 'react';
import type { ComboState } from '../../../engine/game-kit';

/** Medidor de combo: ×2, ×3, ×4. Pulso de 180 ms al subir; al romperse se vacía en 250 ms. Anuncia el cambio. */
export function ComboMeter({ combo, raisedKey }: { combo: ComboState; raisedKey: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  // el pulso se relanza cuando cambia raisedKey (sube el multiplicador)
  useEffect(() => {
    const el = ref.current;
    if (!el || raisedKey === 0) return;
    el.classList.remove('kit-combo-pulse');
    void el.offsetWidth;
    el.classList.add('kit-combo-pulse');
  }, [raisedKey]);
  const fill = Math.min(1, combo.streak / 7);
  return (
    <div className="flex items-center gap-3" data-testid="combo-meter">
      <span
        ref={ref}
        data-num
        className="text-2xl"
        style={{ fontFamily: 'var(--font-mono)' }}
        role="status"
        aria-live="polite"
        aria-label={`Combo por ${combo.multiplier}`}
      >
        ×{combo.multiplier}
      </span>
      <span className="bg-surface-2 block h-2 w-24 overflow-hidden rounded-full" aria-hidden="true">
        <span
          className="kit-combo-fill bg-brand block h-full w-full"
          style={{ transform: `scaleX(${fill})` }}
        />
      </span>
    </div>
  );
}
