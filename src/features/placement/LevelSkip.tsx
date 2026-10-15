import { useState } from 'react';
import { Button } from '../../components/Button';
import { getPlacement, levelName, unitsOfLevel } from '../../content/library';
import {
  chainSummary,
  currentUnit,
  recordChainResult,
  startChain,
  type PlacementResult,
} from '../../engine/placement';
import { PlacementScreen } from './PlacementScreen';

interface Props {
  level: number;
  onExit: () => void;
  onStudy: (unitId: string) => void;
}

/** "Saltar nivel completo": encadena los tests de salto de todas sus unidades; se detiene en la primera que no se supera. */
export function LevelSkip({ level, onExit, onStudy }: Props) {
  const units = unitsOfLevel(level).filter((u) => getPlacement(u.id));
  const [state, setState] = useState(() => startChain(units.map((u) => u.id)));
  const unitId = currentUnit(state);
  const unit = units.find((u) => u.id === unitId);
  const bank = unitId ? getPlacement(unitId) : undefined;

  if (unit && bank) {
    return (
      <PlacementScreen
        key={unit.id}
        bank={bank}
        unitName={unit.name}
        level={level}
        continueLabel={
          units.indexOf(unit) === units.length - 1 ? 'Ver el resumen' : 'Siguiente unidad'
        }
        onDone={(r: PlacementResult) => setState((s) => recordChainResult(s, r))}
        onExit={onExit}
        onStudy={() => onStudy(unit.id)}
      />
    );
  }

  const sum = chainSummary(state);
  return (
    <section aria-label="Resumen de saltar el nivel" className="grid gap-4">
      <h2 className="text-3xl">
        {sum.levelSkipped
          ? `${levelName(level)}: nivel saltado`
          : `${levelName(level)}: saltado en parte`}
      </h2>
      <ul className="grid gap-2">
        {units.map((u) => (
          <li key={u.id} className="bg-surface-1 border-line rounded-[var(--radius-md)] border p-3">
            {sum.skipped.includes(u.id)
              ? '✓ Dominada'
              : u.id === sum.stoppedAt
                ? '✗ No superada'
                : '· Sin hacer'}{' '}
            · {u.name}
          </li>
        ))}
      </ul>
      {sum.stoppedAt && (
        <p className="text-text-2">
          La cadena se detuvo en la primera unidad no superada. Empieza por ella.
        </p>
      )}
      <div className="grid gap-2">
        {sum.stoppedAt && (
          <Button onClick={() => onStudy(sum.stoppedAt!)}>Estudiar esa unidad</Button>
        )}
        <Button variant={sum.stoppedAt ? 'secondary' : 'primary'} onClick={onExit}>
          Volver al Camino
        </Button>
      </div>
    </section>
  );
}
