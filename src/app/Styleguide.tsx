import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Bolsin, BOLSIN_STATES } from '../brand/Bolsin';
import { Avatar, CHARACTERS, type CharacterId } from '../brand/Characters';
import { Logo } from '../brand/Logo';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { Button } from '../components/Button';
import { CandleChart } from '../components/CandleChart';
import { Chip } from '../components/Chip';
import { CompoundRing } from '../components/CompoundRing';
import { ExerciseCard, type ExerciseCardState } from '../components/ExerciseCard';
import { FeedbackSheet } from '../components/FeedbackSheet';
import { Input } from '../components/Input';
import { GlossaryTerm, ReviewTag, StreakCandles, TheoryCard } from '../components/Micro';
import { ProgressBar } from '../components/ProgressBar';
import { Sheet } from '../components/Sheet';
import { Toaster } from '../components/Toaster';
import { useTheme } from '../design/ThemeProvider';
import { THEMES, type ThemeId } from '../design/themes';
import { supportsViewTransitions, withViewTransition } from '../design/viewTransition';
import { seededCandles } from '../engine/candles';
import { CommitteeApproved } from '../features/sequences/CommitteeApproved';
import { Elevator } from '../features/sequences/Elevator';
import { RankUp } from '../features/sequences/RankUp';
import { TicketPrint } from '../features/sequences/TicketPrint';
import { WeeklyClose, type Row } from '../features/sequences/WeeklyClose';
import { formatDelta, formatEur } from '../lib/format';

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid gap-4">
      <h2 id={id} className="text-2xl">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Repite una secuencia con "Otra vez" (reinicia el componente cambiando su key). */
function Replayable({ label, children }: { label: string; children: () => ReactNode }) {
  const [run, setRun] = useState(0);
  return (
    <div className="grid gap-3">
      <div key={run}>{children()}</div>
      <div>
        <Button variant="secondary" onClick={() => setRun((n) => n + 1)}>
          Otra vez: {label}
        </Button>
      </div>
    </div>
  );
}

const BEFORE: Row[] = [
  { id: 'a', name: 'Hugo Ferrer', xp: 820 },
  { id: 'you', name: 'Tú', xp: 760, you: true },
  { id: 'b', name: 'Nuria Pons', xp: 700 },
  { id: 'c', name: 'Tu yo de la semana pasada', xp: 640 },
];
const AFTER: Row[] = [
  { id: 'you', name: 'Tú', xp: 910, you: true },
  { id: 'a', name: 'Hugo Ferrer', xp: 860 },
  { id: 'b', name: 'Nuria Pons', xp: 740 },
  { id: 'c', name: 'Tu yo de la semana pasada', xp: 640 },
];

const TABS = ['Inicio', 'Camino', 'Practicar'] as const;

function TabsDemo() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Inicio');
  const vt = supportsViewTransitions();
  return (
    <div className="grid gap-3">
      <div role="group" aria-label="Pestañas de ejemplo" className="flex gap-2">
        {TABS.map((t) => (
          <Chip key={t} selected={t === tab} onClick={() => withViewTransition(() => setTab(t))}>
            {t}
          </Chip>
        ))}
      </div>
      <p className="text-text-2 text-sm">
        {vt
          ? 'View Transitions API activa (fundido cruzado 160 ms).'
          : 'Sin View Transitions: fallback con Motion.'}
      </p>
      {vt ? (
        <div className="bg-surface-1 border-line rounded-[var(--radius-md)] border p-4">
          Pantalla: {tab}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="bg-surface-1 border-line rounded-[var(--radius-md)] border p-4"
          >
            Pantalla: {tab}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

/** /styleguide: solo en desarrollo (App.tsx). Muestra todos los componentes base y secuencias. */
export function Styleguide() {
  const { theme, setTheme } = useTheme();
  const [sheet, setSheet] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [progress, setProgress] = useState(3);
  const [counter, setCounter] = useState(1250);
  const candles = useMemo(() => seededCandles(42, 90), []);
  const states: ExerciseCardState[] = ['idle', 'selected', 'correct', 'incorrect', 'disabled'];

  return (
    <main className="mx-auto grid max-w-3xl grid-cols-[minmax(0,1fr)] gap-10 p-6">
      <Toaster />
      <header className="grid gap-3">
        <Logo variant="full" size={48} />
        <h1 className="text-4xl">Styleguide</h1>
        <div className="grid max-w-xs gap-1">
          <label htmlFor="theme-select" className="text-text-2 text-sm">
            Tema
          </label>
          <select
            id="theme-select"
            value={theme}
            onChange={(e) => setTheme(e.target.value as ThemeId)}
            className="bg-surface-1 text-text border-line min-h-12 rounded-[var(--radius-sm)] border px-3"
          >
            {THEMES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      <Section id="sg-buttons" title="Botones">
        <div className="flex flex-wrap gap-3">
          <Button>Primario</Button>
          <Button variant="secondary">Secundario</Button>
          <Button variant="ghost">Fantasma</Button>
          <Button variant="danger">Peligro</Button>
          <Button disabled>Deshabilitado</Button>
          <Button loading>Cargando</Button>
        </div>
      </Section>

      <Section id="sg-inputs" title="Input y chips">
        <Input
          label="Importe a invertir"
          placeholder="1.000"
          hint="Sin comisiones en este ejemplo."
        />
        <Input label="Tipo anual" defaultValue="abc" error="Introduce un número." />
        <div className="flex flex-wrap gap-2">
          <Chip selected>Renta fija</Chip>
          <Chip>Renta variable</Chip>
          <Chip>Derivados</Chip>
        </div>
      </Section>

      <Section id="sg-overlays" title="Sheet y toast">
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setSheet(true)}>
            Abrir bottom sheet
          </Button>
          <Button
            variant="secondary"
            onClick={() => toast('Racha guardada. Bolsín está contento.')}
          >
            Lanzar toast
          </Button>
          <GlossaryTerm
            term="Interés compuesto"
            definition="Interés que se calcula sobre el capital más los intereses ya acumulados."
          />
        </div>
        <Sheet
          open={sheet}
          onOpenChange={setSheet}
          title="Bottom sheet"
          description="Se cierra con Esc, arrastre o botón."
        >
          <Button onClick={() => setSheet(false)}>Cerrar</Button>
        </Sheet>
      </Section>

      <Section id="sg-exercise" title="Tarjeta de ejercicio (5 estados)">
        <div role="radiogroup" aria-label="Estados de ejemplo" className="grid gap-2">
          {states.map((s) => (
            <ExerciseCard
              key={s}
              state={selected === s && s === 'idle' ? 'selected' : s}
              onSelect={() => setSelected(s)}
            >
              Estado: {s}
            </ExerciseCard>
          ))}
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setFeedback('correct')}>
            Feedback: acierto
          </Button>
          <Button variant="secondary" onClick={() => setFeedback('incorrect')}>
            Feedback: fallo
          </Button>
        </div>
        {feedback && (
          <FeedbackSheet
            key={feedback}
            result={feedback}
            explanation="1.000 € × 1,05² = 1.102,50 €: el interés también genera interés."
            onContinue={() => setFeedback(null)}
          />
        )}
      </Section>

      <Section id="sg-progress" title="Progreso, anillo y contadores">
        <ProgressBar
          value={progress}
          max={8}
          label="Progreso de la lección"
          asCurve={progress === 8}
        />
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="secondary" onClick={() => setProgress((p) => (p >= 8 ? 0 : p + 1))}>
            Avanzar ejercicio ({progress}/8)
          </Button>
          <CompoundRing progress={progress / 8} label="Progreso del nivel" />
          <p className="text-2xl">
            <AnimatedNumber value={counter} format={(n) => formatEur(n)} />{' '}
            <span className="text-bull text-lg" data-num>
              {formatDelta(1.2)}
            </span>
          </p>
          <Button variant="secondary" onClick={() => setCounter((c) => c + 375.5)}>
            Sumar al contador
          </Button>
        </div>
      </Section>

      <Section id="sg-chart" title="Gráfico de velas (datos de ejemplo)">
        <CandleChart candles={candles} label="Acción ficticia $JAV" />
      </Section>

      <Section id="sg-micro" title="Microinteracciones de lección">
        <Replayable label="tarjeta de teoría">
          {() => (
            <TheoryCard term="Interés compuesto">
              Los intereses generan nuevos intereses: poco cada día se multiplica.
            </TheoryCard>
          )}
        </Replayable>
        <div className="flex flex-wrap items-center gap-4">
          <ReviewTag />
          <Bolsin state="neutro" size={64} />
        </div>
        <StreakCandles days={12} />
        <StreakCandles days={5} broken />
      </Section>

      <Section id="sg-seq" title="Secuencias clave">
        <Replayable label="subida de rango">{() => <RankUp rank="Analista Junior" />}</Replayable>
        <Replayable label="ascensor">
          {() => <Elevator from={0} to={1} name="Mercados" />}
        </Replayable>
        <Replayable label="comité aprobado">
          {() => <CommitteeApproved unit="Nivel 1 · Mercados" />}
        </Replayable>
        <Replayable label="cierre semanal">
          {() => <WeeklyClose before={BEFORE} after={AFTER} />}
        </Replayable>
        <Replayable label="impresión de la tarjeta">
          {() => <TicketPrint rank="Analista Junior" streak={12} accuracy={87} />}
        </Replayable>
      </Section>

      <Section id="sg-transitions" title="Transiciones entre pantallas">
        <TabsDemo />
      </Section>

      <Section id="sg-brand" title="Marca">
        <div className="flex flex-wrap gap-4">
          {BOLSIN_STATES.map((s) => (
            <Bolsin key={s} state={s} size={72} />
          ))}
          {(Object.keys(CHARACTERS) as CharacterId[]).map((c) => (
            <Avatar key={c} character={c} size={72} />
          ))}
        </div>
      </Section>
    </main>
  );
}
