import { Lock } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { AppData } from '../../app/hooks';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { ErrorState, Loading } from '../../components/States';
import { Sheet } from '../../components/Sheet';
import {
  BackupError,
  exportBackup,
  importBackup,
  parseBackup,
  requestPersistence,
} from '../../db/backup';
import { useRepo } from '../../db/RepoProvider';
import { useTheme } from '../../design/ThemeProvider';
import { THEMES } from '../../design/themes';
import { MINUTE_OPTIONS, dailyGoalXpFor, type Minutes } from '../../engine/onboarding';
import { RANKS } from '../../engine/projections';
import { clearErrors, getErrors, type ErrorEntry } from '../../lib/error-log';
import { downloadText } from '../../lib/download';
import { setHapticsEnabled } from '../../lib/haptics';
import { buildIcs, isValidTime } from '../../lib/ics';
import { dayKey } from '../../engine/days';
import { InstallGuide, OfflineStatus } from '../../pwa/InstallGuide';

const rankIndex = (name: string | null) => (name ? RANKS.findIndex((r) => r.name === name) : 0);

/** Ajustes: tema, háptica, minutos al día, recordatorio .ics, copia de seguridad y diagnóstico (CLAUDE.md §3b, §11, §12). */
export function Ajustes({ data }: { data: AppData }) {
  const repo = useRepo();
  const { theme, setTheme } = useTheme();
  const fileRef = useRef<HTMLInputElement>(null);
  const [time, setTime] = useState('19:30');
  const [errors, setErrors] = useState<ErrorEntry[]>(() => getErrors());
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [pendingImport, setPendingImport] = useState<{
    json: string;
    events: number;
    reports: number;
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    void navigator.storage
      ?.persisted?.()
      .then(setPersisted)
      .catch(() => setPersisted(null));
  }, []);

  if (data.loading) return <Loading />;
  if (data.error || !data.summary)
    return (
      <ErrorState
        message="no se pudo leer tu configuración en este dispositivo."
        onRetry={data.reload}
      />
    );
  const { summary } = data;
  const currentRank = summary.rank.rankIndex;
  const haptics = summary.settings['haptics'] !== false;
  const minutes = (summary.settings['dailyMinutes'] as Minutes | undefined) ?? 20;

  const setSetting = async (key: string, value: string | number | boolean | null) => {
    try {
      await repo.record('settings_changed', { key, value });
      data.reload();
    } catch (e) {
      console.error('No se pudo guardar el ajuste', e);
      toast('No se pudo guardar el ajuste en este dispositivo.');
    }
  };

  const downloadIcs = () => {
    if (!isValidTime(time)) return toast('Elige una hora válida (HH:MM).');
    const ics = buildIcs({ time, minutes, startDay: dayKey(new Date(), 'Europe/Madrid') });
    toast(
      downloadText('compuesto-recordatorio.ics', ics, 'text/calendar')
        ? 'Recordatorio descargado: ábrelo para añadirlo al calendario.'
        : 'No se pudo descargar.',
    );
    void setSetting('reminderTime', time);
  };

  const exportAll = async () => {
    try {
      const backup = await exportBackup(repo);
      const ok = downloadText(
        `compuesto-copia-${dayKey(new Date(), 'Europe/Madrid')}.json`,
        JSON.stringify(backup),
        'application/json',
      );
      if (ok) void setSetting('lastBackupAt', new Date().toISOString());
      toast(
        ok
          ? `Copia exportada (${backup.events.length} eventos).`
          : 'No se pudo exportar en este navegador.',
      );
    } catch (e) {
      console.error('No se pudo exportar', e);
      toast('No se pudo exportar la copia.');
    }
  };

  const chooseFile = async (file: File | undefined) => {
    if (!file) return;
    setImportError(null);
    try {
      const json = await file.text();
      const parsed = parseBackup(json); // valida antes de tocar nada
      setPendingImport({
        json,
        events: parsed.events.length,
        reports: parsed.content_reports.length,
      });
    } catch (e) {
      setImportError(e instanceof BackupError ? e.message : 'No se pudo leer el archivo.');
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const confirmImport = async () => {
    if (!pendingImport) return;
    try {
      await importBackup(repo, pendingImport.json, 'replace');
      toast('Copia importada.');
      setPendingImport(null);
      data.reload();
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'No se pudo importar.');
      setPendingImport(null);
    }
  };

  const deleteAll = async () => {
    try {
      await repo.deleteAllData();
      setConfirmDelete(false);
      toast('Datos borrados.');
      window.location.hash = '#/';
      window.location.reload();
    } catch (e) {
      console.error('No se pudo borrar', e);
      toast('No se pudieron borrar los datos.');
    }
  };

  return (
    <div className="grid gap-8">
      <h1 className="text-3xl">Ajustes</h1>

      <section aria-labelledby="s-tema" className="grid gap-2">
        <h2 id="s-tema" className="text-2xl">
          Tema
        </h2>
        <ul className="grid gap-2">
          {THEMES.map((t) => {
            const unlocked = rankIndex(t.unlockRank) <= currentRank;
            return (
              <li key={t.id}>
                {unlocked ? (
                  <Chip
                    selected={theme === t.id}
                    onClick={() => setTheme(t.id)}
                    className="w-full justify-start"
                  >
                    {t.name}
                  </Chip>
                ) : (
                  <p className="text-text-2 border-line flex min-h-12 items-center gap-2 rounded-full border border-dashed px-4 text-sm">
                    <Lock aria-hidden size={16} />
                    {t.name} · se desbloquea como {t.unlockRank}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="s-sesion" className="grid gap-3">
        <h2 id="s-sesion" className="text-2xl">
          Sesión
        </h2>
        <div role="group" aria-label="Minutos al día" className="flex flex-wrap gap-2">
          {MINUTE_OPTIONS.map((m) => (
            <Chip
              key={m}
              selected={minutes === m}
              onClick={() => {
                void setSetting('dailyMinutes', m).then(() =>
                  setSetting('dailyGoalXp', dailyGoalXpFor(m)),
                );
              }}
            >
              <span data-num>{m}</span> min
            </Chip>
          ))}
        </div>
        <label className="flex min-h-12 items-center justify-between gap-3">
          <span>Vibración (háptica) al acertar y fallar</span>
          <input
            type="checkbox"
            role="switch"
            checked={haptics}
            onChange={(e) => {
              setHapticsEnabled(e.target.checked);
              void setSetting('haptics', e.target.checked);
            }}
            className="accent-[var(--brand)] size-6"
          />
        </label>
        <p className="text-text-2 text-sm">Sonido: próximamente.</p>
      </section>

      <section aria-labelledby="s-recordatorio" className="grid gap-3">
        <h2 id="s-recordatorio" className="text-2xl">
          Recordatorio diario
        </h2>
        <p className="text-text-2 text-sm">
          Genera un archivo .ics en tu dispositivo (sin servidores) que añade un evento diario a tu
          calendario.
        </p>
        <div className="grid gap-1">
          <label htmlFor="reminder-time" className="text-text-2 text-sm">
            Hora
          </label>
          <input
            id="reminder-time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="bg-surface-1 text-text border-line min-h-12 w-40 rounded-[var(--radius-sm)] border px-3 text-base"
          />
        </div>
        <Button variant="secondary" onClick={downloadIcs} className="justify-self-start">
          Descargar recordatorio (.ics)
        </Button>
      </section>

      <InstallGuide />

      <section aria-labelledby="s-datos" className="grid gap-3">
        <h2 id="s-datos" className="text-2xl">
          Tus datos
        </h2>
        <OfflineStatus />
        <p className="text-text-2 text-sm">
          Todo se guarda en este dispositivo.{' '}
          {persisted === true
            ? 'El navegador lo conservará.'
            : persisted === false
              ? 'El navegador podría borrarlo si le falta espacio: haz copias.'
              : ''}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => void exportAll()}>
            Exportar copia (JSON)
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            Importar copia
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            aria-label="Archivo de copia de seguridad"
            onChange={(e) => void chooseFile(e.target.files?.[0])}
          />
          <Button
            variant="secondary"
            onClick={() =>
              void requestPersistence().then((ok) => {
                setPersisted(ok);
                toast(
                  ok
                    ? 'Almacenamiento protegido: el navegador conservará tus datos.'
                    : 'El navegador no ha concedido la protección. Haz copias de seguridad con regularidad.',
                );
              })
            }
          >
            Proteger los datos
          </Button>
        </div>
        {importError && (
          <p role="alert" className="text-bear text-sm">
            Error: {importError}
          </p>
        )}
        <Button
          variant="danger"
          onClick={() => setConfirmDelete(true)}
          className="justify-self-start"
        >
          Borrar todos mis datos
        </Button>
      </section>

      <section aria-labelledby="s-diag" className="grid gap-3">
        <h2 id="s-diag" className="text-2xl">
          Diagnóstico
        </h2>
        <p className="text-text-2 text-sm" data-num>
          Registro local de errores: {errors.length} entrada(s) (máx. 200).
        </p>
        {errors.length > 0 && (
          <>
            <ul className="grid gap-1 text-sm" aria-label="Últimos errores">
              {errors
                .slice(-5)
                .reverse()
                .map((e, i) => (
                  <li
                    key={i}
                    className="bg-surface-1 border-line rounded-[var(--radius-sm)] border p-2"
                    data-num
                  >
                    {e.at.slice(0, 19).replace('T', ' ')} · {e.message}
                  </li>
                ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() =>
                  toast(
                    downloadText(
                      'compuesto-errores.json',
                      JSON.stringify(errors, null, 2),
                      'application/json',
                    )
                      ? 'Registro exportado.'
                      : 'No se pudo exportar.',
                  )
                }
              >
                Exportar registro
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  clearErrors();
                  setErrors([]);
                }}
              >
                Vaciar registro
              </Button>
            </div>
          </>
        )}
      </section>

      <Sheet
        open={pendingImport !== null}
        onOpenChange={(o) => !o && setPendingImport(null)}
        title="Importar copia"
        description="Esto reemplaza tu progreso actual en este dispositivo."
      >
        <p className="mb-4">
          La copia tiene {pendingImport?.events} evento(s) y {pendingImport?.reports} reporte(s). Tu
          progreso actual se sustituirá por el de la copia.
        </p>
        <div className="flex gap-2">
          <Button variant="danger" onClick={() => void confirmImport()}>
            Reemplazar mi progreso
          </Button>
          <Button variant="secondary" onClick={() => setPendingImport(null)}>
            Cancelar
          </Button>
        </div>
      </Sheet>

      <Sheet
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="¿Borrar todos tus datos?"
        description="No se puede deshacer."
      >
        <p className="mb-4">
          Se borrarán tu progreso, tus ajustes de sesión y tus reportes de este dispositivo. Haz
          antes una copia si quieres conservarlos.
        </p>
        <div className="flex gap-2">
          <Button variant="danger" onClick={() => void deleteAll()}>
            Sí, borrar todo
          </Button>
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
            Cancelar
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
