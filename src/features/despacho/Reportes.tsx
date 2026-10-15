import { useCallback, useEffect, useState } from 'react';
import { toast } from '../../lib/toast';
import { Button } from '../../components/Button';
import { EmptyState, ErrorState, Loading } from '../../components/States';
import { findExerciseText } from '../../content/library';
import type { ContentReport } from '../../db/db';
import { useRepo } from '../../db/RepoProvider';
import { downloadText } from '../../lib/download';

/** Reportes de errores de contenido (CLAUDE.md §9): lista local exportable como JSON para pasársela a Claude Code. */
export function Reportes() {
  const repo = useRepo();
  const [reports, setReports] = useState<ContentReport[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    repo
      .listReports()
      .then((r) => {
        setReports(r);
        setError(false);
      })
      .catch(() => setError(true));
  }, [repo]);
  useEffect(load, [load]);

  const remove = async (r: ContentReport) => {
    await repo.deleteReport(r.id);
    load();
    toast('Reporte borrado.', {
      action: {
        label: 'Deshacer',
        onClick: () => {
          void repo.db.content_reports.put(r).then(load);
        },
      },
    });
  };

  const exportAll = () => {
    const payload = (reports ?? []).map((r) => ({
      ...r,
      ejercicio: findExerciseText(r.exerciseId)?.prompt ?? null,
    }));
    const ok = downloadText(
      'compuesto-reportes.json',
      JSON.stringify(payload, null, 2),
      'application/json',
    );
    toast(ok ? 'Reportes exportados.' : 'No se pudo exportar en este navegador.');
  };

  return (
    <div className="grid gap-4">
      <h1 className="text-3xl">Reportes de errores</h1>
      <p className="text-text-2 text-sm">
        Los reportes se guardan solo en este dispositivo. Expórtalos para pasárselos a Claude Code y
        corregir el contenido.
      </p>
      {error ? (
        <ErrorState message="no se pudieron leer los reportes." onRetry={load} />
      ) : reports === null ? (
        <Loading />
      ) : reports.length === 0 ? (
        <EmptyState title="No hay reportes">
          Usa «Reportar error» en cualquier ejercicio.
        </EmptyState>
      ) : (
        <>
          <Button variant="secondary" onClick={exportAll} className="justify-self-start">
            Exportar reportes (JSON)
          </Button>
          <ul className="grid gap-2">
            {reports.map((r) => (
              <li
                key={r.id}
                className="bg-surface-1 border-line grid gap-1 rounded-[var(--radius-md)] border p-3"
              >
                <p className="text-text-2 text-xs" data-num>
                  {r.exerciseId} · {r.createdAt.slice(0, 16).replace('T', ' ')}
                </p>
                <p>{r.text}</p>
                <Button
                  variant="ghost"
                  onClick={() => void remove(r)}
                  className="justify-self-start text-sm"
                >
                  Borrar
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
