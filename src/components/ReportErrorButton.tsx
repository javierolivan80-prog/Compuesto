import { useState } from 'react';
import { toast } from 'sonner';
import { useRepo } from '../db/RepoProvider';
import { Button } from './Button';
import { Sheet } from './Sheet';

/** "Reportar error" en cada ejercicio (CLAUDE.md §9): guarda el reporte en una lista local exportable. */
export function ReportErrorButton({ exerciseId }: { exerciseId: string }) {
  const repo = useRepo();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState(false);

  const save = async () => {
    if (!text.trim()) return;
    try {
      await repo.addReport(exerciseId, text.trim());
      setText('');
      setOpen(false);
      toast('Reporte guardado. Puedes exportarlo desde Despacho → Reportes.');
    } catch (e) {
      console.error('No se pudo guardar el reporte', e);
      setError(true);
    }
  };

  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)} className="justify-self-start text-sm">
        Reportar error
      </Button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Reportar un error"
        description={`Ejercicio ${exerciseId}`}
      >
        <div className="grid gap-3">
          <label htmlFor="report-text" className="text-text-2 text-sm">
            ¿Qué está mal? (respuesta, cálculo, redacción, ambigüedad…)
          </label>
          <textarea
            id="report-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            className="bg-surface-2 text-text border-line min-h-24 w-full rounded-[var(--radius-sm)] border p-3 text-base"
          />
          {error && (
            <p role="alert" className="text-bear text-sm">
              Error: no se pudo guardar el reporte en este dispositivo.
            </p>
          )}
          <div className="flex gap-2">
            <Button onClick={() => void save()} disabled={!text.trim()}>
              Guardar reporte
            </Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      </Sheet>
    </>
  );
}
