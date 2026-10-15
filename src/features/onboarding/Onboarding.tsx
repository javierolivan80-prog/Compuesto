import { useState } from 'react';
import { Avatar } from '../../brand/Characters';
import { Logo } from '../../brand/Logo';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { useRepo } from '../../db/RepoProvider';
import {
  MINUTE_OPTIONS,
  dailyGoalXpFor,
  normalizeInitials,
  type Minutes,
} from '../../engine/onboarding';

/**
 * Onboarding de 3 pantallas (CLAUDE.md §2.10): carta de bienvenida → minutos al día → ticker personal → primera lección.
 * Pensado para llegar a la primera lección en menos de 60 s: todo tiene valor por defecto salvo las iniciales.
 */
export function Onboarding({ onFinish }: { onFinish: () => void }) {
  const repo = useRepo();
  const [step, setStep] = useState(0);
  const [minutes, setMinutes] = useState<Minutes>(20);
  const [initials, setInitials] = useState('');
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const clean = normalizeInitials(initials);

  const finish = async () => {
    if (!clean) return;
    setSaving(true);
    try {
      await repo.record('settings_changed', { key: 'dailyMinutes', value: minutes });
      await repo.record('settings_changed', { key: 'dailyGoalXp', value: dailyGoalXpFor(minutes) });
      await repo.record('settings_changed', { key: 'tickerInitials', value: clean });
      await repo.record('settings_changed', { key: 'onboarded', value: true });
    } catch (e) {
      console.error('No se pudo guardar el onboarding', e);
      setError(true);
    }
    setSaving(false);
    onFinish(); // aunque falle el guardado, se puede empezar a aprender
  };

  return (
    <section aria-label="Bienvenida" className="grid gap-6">
      <Logo variant="full" size={40} />
      <p className="text-text-2 text-sm" data-num>
        {step + 1} de 3
      </p>

      {step === 0 && (
        <article className="grid gap-4">
          <div className="flex items-center gap-3">
            <Avatar character="mentora" size={64} />
            <p className="text-text-2 text-sm">Elena Marqués · Directora de Research</p>
          </div>
          <h1 className="text-4xl">Bienvenido a Albufera Partners</h1>
          <p>
            Hoy empiezas como <strong>Becario</strong> en nuestra mesa de Valencia. Cada día, veinte
            minutos: lecciones cortas, ejercicios y casos con empresas que ya conoces. Poco cada día
            se capitaliza.
          </p>
          <p className="text-text-2">
            Es contenido educativo, no asesoramiento financiero. Llegar a analista junior depende de
            ti.
          </p>
          <Button onClick={() => setStep(1)}>Entrar a la oficina</Button>
        </article>
      )}

      {step === 1 && (
        <article className="grid gap-4">
          <h1 className="text-4xl">¿Cuánto tiempo al día?</h1>
          <p className="text-text-2">Puedes cambiarlo cuando quieras en Ajustes.</p>
          <div role="group" aria-label="Minutos al día" className="flex flex-wrap gap-2">
            {MINUTE_OPTIONS.map((m) => (
              <Chip key={m} selected={minutes === m} onClick={() => setMinutes(m)}>
                <span data-num>{m}</span> min
              </Chip>
            ))}
          </div>
          <Button onClick={() => setStep(2)}>Continuar</Button>
        </article>
      )}

      {step === 2 && (
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void finish();
          }}
        >
          <h1 className="text-4xl">Tu ticker personal</h1>
          <p className="text-text-2">
            Tu perfil cotizará con unas iniciales, como una acción: de 2 a 4 letras.
          </p>
          <div className="grid gap-1">
            <label htmlFor="initials" className="text-text-2 text-sm">
              Tus iniciales
            </label>
            <div className="flex items-center gap-2">
              <span className="text-2xl" style={{ fontFamily: 'var(--font-mono)' }}>
                $
              </span>
              <input
                id="initials"
                value={initials}
                maxLength={6}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="Ej.: JAV…"
                onChange={(e) => setInitials(e.target.value)}
                aria-invalid={initials !== '' && !clean ? true : undefined}
                style={{ fontFamily: 'var(--font-mono)' }}
                className="bg-surface-1 text-text border-line min-h-14 w-full rounded-[var(--radius-sm)] border-2 px-4 text-2xl uppercase"
              />
            </div>
            {initials !== '' && !clean && (
              <p className="text-bear text-sm">Error: usa entre 2 y 4 letras.</p>
            )}
          </div>
          {error && (
            <p role="alert" className="text-bear text-sm">
              Error: no se pudieron guardar tus preferencias; puedes continuar y cambiarlas luego.
            </p>
          )}
          <Button type="submit" disabled={!clean || saving} loading={saving}>
            Empezar mi primera lección
          </Button>
        </form>
      )}
    </section>
  );
}
