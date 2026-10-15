import { useState, type ReactNode } from 'react';
import { Bolsin } from '../brand/Bolsin';
import { CURVE_PATH } from '../brand/Logo';
import { Button } from '../components/Button';
import { CompoundRing } from '../components/CompoundRing';
import { ProgressBar } from '../components/ProgressBar';
import { Toaster } from '../components/Toaster';
import { useTheme } from '../design/ThemeProvider';
import { THEMES, type ThemeId } from '../design/themes';

/* PROVISIONAL(tarea 0.6): maquetas estáticas para elegir dirección. Todos los datos son de EJEMPLO. */

const OPTIONS = ['1.000 €', '1.050 €', '1.102,50 €', '1.200 €'];
const FLOORS = [
  ['10', 'Despacho de socios', 'bloqueada'],
  ['3', 'Contabilidad y valoración', 'bloqueada'],
  ['2', 'Productos', 'bloqueada'],
  ['1', 'Mercados', 'en curso'],
  ['0', 'Recepción · El dinero', 'completada'],
] as const;

function Sample({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-3">
      <p className="text-text-2 border-line rounded-full border px-3 py-1 text-xs self-start justify-self-start">
        Maqueta con datos de ejemplo
      </p>
      {children}
    </div>
  );
}

/* ---------- Tarjeta de ejercicio ---------- */

function ExerciseA() {
  return (
    <Sample>
      <article
        className="bg-surface-1 border-line grid gap-4 rounded-[var(--radius-md)] border p-4"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        <header className="text-text-2 flex justify-between text-xs">
          <span>ORDEN #0042 · NIVEL 0</span>
          <span>3/8</span>
        </header>
        <p className="text-base">
          Inviertes 1.000 € al 5 % anual compuesto durante 2 años. ¿Valor final?
        </p>
        <ul className="grid gap-2">
          {OPTIONS.map((o, i) => (
            <li key={o}>
              <button
                type="button"
                className={`border-line flex min-h-12 w-full items-center gap-3 border px-3 text-left ${i === 2 ? 'border-brand bg-surface-2' : ''}`}
              >
                <span className="text-brand">{String.fromCharCode(65 + i)}</span>
                <span data-num>{o}</span>
              </button>
            </li>
          ))}
        </ul>
        <Button>EJECUTAR ORDEN</Button>
      </article>
    </Sample>
  );
}

function ExerciseB() {
  return (
    <Sample>
      <article className="bg-surface-1 grid gap-5 rounded-[var(--radius-md)] p-6">
        <p className="text-text-2 text-sm">Interés compuesto</p>
        <h3 className="text-3xl leading-tight">
          Inviertes mil euros al cinco por ciento anual durante dos años. ¿Cuánto tienes?
        </h3>
        <ul className="grid gap-2">
          {OPTIONS.map((o, i) => (
            <li key={o}>
              <button
                type="button"
                className={`min-h-14 w-full cursor-pointer rounded-full border-2 px-6 text-left text-lg ${i === 2 ? 'border-brand bg-surface-2' : 'border-line'}`}
              >
                <span data-num>{o}</span>
              </button>
            </li>
          ))}
        </ul>
        <Button>Comprobar</Button>
      </article>
    </Sample>
  );
}

function ExerciseC() {
  return (
    <Sample>
      <article className="bg-surface-1 border-line grid gap-4 overflow-hidden rounded-[var(--radius-md)] border p-4">
        <ProgressBar value={3} max={8} label="Progreso de la lección (ejemplo)" />
        <p className="text-lg">1.000 € al 5 % compuesto, 2 años:</p>
        <ul className="grid grid-cols-2 gap-2">
          {OPTIONS.map((o, i) => (
            <li key={o}>
              <button
                type="button"
                className={`grid min-h-20 w-full cursor-pointer place-items-center rounded-[var(--radius-sm)] border-2 text-xl ${i === 2 ? 'border-brand bg-surface-2' : 'border-line'}`}
              >
                <span data-num>{o}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between">
          <Bolsin state="pensando" size={48} />
          <Button>Comprobar</Button>
        </div>
      </article>
    </Sample>
  );
}

/* ---------- Home ---------- */

function HomeA() {
  return (
    <Sample>
      <div className="grid gap-4">
        <div
          className="text-text-2 flex justify-between overflow-hidden text-xs whitespace-nowrap"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          <span>NTT 41,20 ▲ +0,8 %</span>
          <span>PIR 12,05 ▼ −1,1 %</span>
          <span>$JAV 108,40 ▲ +2,1 %</span>
        </div>
        <article className="border-line grid gap-2 border-y-2 py-4">
          <p className="text-text-2 text-xs tracking-widest uppercase">
            Albufera Gazette · edición de la mañana
          </p>
          <h2 className="text-4xl leading-tight">
            Naranjas del Turia sale a bolsa: ¿cuánto vale una acción?
          </h2>
          <p className="text-text-2">Reto del día · 8 min</p>
        </article>
        <Button>Abrir mercado</Button>
      </div>
    </Sample>
  );
}

function HomeB() {
  return (
    <Sample>
      <div className="grid gap-4">
        <div className="bg-surface-1 border-line grid gap-2 rounded-[var(--radius-md)] border p-4">
          <div className="flex items-baseline justify-between">
            <span style={{ fontFamily: 'var(--font-mono)' }}>$JAV</span>
            <span data-num className="text-2xl">
              108,40
            </span>
            <span className="text-bull" data-num>
              ▲ +2,1 %
            </span>
          </div>
          <svg
            viewBox="0 0 64 24"
            className="h-24 w-full"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M0 22 C 16 20, 30 16, 40 12 S 56 4, 64 2"
              fill="none"
              stroke="var(--bull)"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <p className="text-text-2 text-sm">Racha de 12 días · tendencia alcista</p>
        </div>
        <Button>Abrir mercado · 20 min</Button>
      </div>
    </Sample>
  );
}

function HomeC() {
  return (
    <Sample>
      <div className="grid gap-4">
        <div className="flex items-center gap-4">
          <CompoundRing progress={0.6} label="Objetivo de hoy (ejemplo)" size={96} />
          <div>
            <p className="text-text-2 text-sm">Becario · nivel 1</p>
            <p className="text-2xl">12 de 20 min</p>
          </div>
          <div className="ml-auto">
            <Bolsin state="feliz" size={64} />
          </div>
        </div>
        <ul className="grid gap-2">
          {[
            'Lección: Órdenes de bolsa',
            'Due diligence · 6 tarjetas',
            'Juego: Cazador de comisiones',
          ].map((t) => (
            <li
              key={t}
              className="bg-surface-1 border-line min-h-12 rounded-[var(--radius-sm)] border px-4 py-3"
            >
              {t}
            </li>
          ))}
        </ul>
      </div>
    </Sample>
  );
}

/* ---------- Camino ---------- */

function PathA() {
  return (
    <Sample>
      <ol
        className="border-line grid gap-1 rounded-[var(--radius-md)] border-2 p-2"
        aria-label="Edificio de Albufera Partners (ejemplo)"
      >
        {FLOORS.map(([n, name, st]) => (
          <li
            key={n}
            className={`flex min-h-14 items-center justify-between rounded-[var(--radius-sm)] px-4 ${st === 'en curso' ? 'bg-surface-2 border-brand border' : 'bg-surface-1'} ${st === 'bloqueada' ? 'text-text-2' : ''}`}
          >
            <span>
              <span data-num className="mr-3">
                P{n}
              </span>
              {name}
            </span>
            <span className="text-sm">
              {st === 'completada'
                ? '✓ completada'
                : st === 'en curso'
                  ? '▶ en curso'
                  : 'bloqueada'}
            </span>
          </li>
        ))}
      </ol>
    </Sample>
  );
}

function PathB() {
  return (
    <Sample>
      <div className="bg-surface-1 border-line grid grid-cols-[1fr_auto] gap-4 rounded-[var(--radius-md)] border p-4">
        <div className="grid gap-2">
          <p className="text-text-2 text-sm">Planta 1</p>
          <h3 className="text-3xl">Mercados</h3>
          <ul className="grid gap-2">
            {['Qué es una bolsa', 'Órdenes', 'Comisiones', 'Comité de inversión'].map((l, i) => (
              <li
                key={l}
                className={`min-h-12 rounded-[var(--radius-sm)] border px-3 py-3 ${i === 1 ? 'border-brand bg-surface-2' : 'border-line'}`}
              >
                {l}
              </li>
            ))}
          </ul>
        </div>
        <div
          role="group"
          aria-label="Botonera del ascensor (ejemplo)"
          className="bg-surface-2 grid content-start gap-1 rounded-[var(--radius-sm)] p-2"
        >
          {[3, 2, 1, 0].map((n) => (
            <button
              key={n}
              type="button"
              className={`size-12 rounded-full border ${n === 1 ? 'border-brand text-brand' : 'border-line'}`}
              data-num
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    </Sample>
  );
}

function PathC() {
  const nodes = [
    [8, 52],
    [20, 50],
    [32, 46],
    [44, 38],
    [52, 26],
    [58, 10],
  ] as const;
  return (
    <Sample>
      <div className="bg-surface-1 border-line rounded-[var(--radius-md)] border p-4">
        <svg
          viewBox="0 0 64 64"
          className="h-80 w-full"
          role="img"
          aria-label="Camino como curva exponencial: 6 lecciones, la cuarta en curso (ejemplo)"
        >
          <path d={CURVE_PATH} fill="none" stroke="var(--brand)" strokeWidth="1" />
          {nodes.map(([x, y], i) => (
            <g key={i}>
              <circle
                cx={x}
                cy={y}
                r={i === 3 ? 4 : 3}
                fill={i < 3 ? 'var(--brand)' : i === 3 ? 'var(--surface-2)' : 'var(--surface-1)'}
                stroke="var(--brand)"
                strokeWidth="1"
              />
              <text
                x={x}
                y={y + 1.2}
                textAnchor="middle"
                fontSize="3"
                fill={i < 3 ? 'var(--bg)' : 'var(--text)'}
              >
                {i + 1}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </Sample>
  );
}

const GROUPS: { id: string; title: string; variants: [string, string, () => ReactNode][] }[] = [
  {
    id: 'exercise',
    title: 'Tarjeta de ejercicio',
    variants: [
      ['A', 'Orden de bolsa (terminal)', ExerciseA],
      ['B', 'Papel (serif grande)', ExerciseB],
      ['C', 'Rejilla 2×2 con Bolsín', ExerciseC],
    ],
  },
  {
    id: 'home',
    title: 'Home',
    variants: [
      ['A', 'Portada de periódico', HomeA],
      ['B', 'Cotización de tu acción', HomeB],
      ['C', 'Objetivo del día', HomeC],
    ],
  },
  {
    id: 'path',
    title: 'Camino como edificio',
    variants: [
      ['A', 'Corte del edificio', PathA],
      ['B', 'Planta + botonera de ascensor', PathB],
      ['C', 'Curva compuesta', PathC],
    ],
  },
];

/** /prototypes (solo desarrollo): 3 variantes por pieza clave, con selector. */
export function Prototypes() {
  const { theme, setTheme } = useTheme();
  const [pick, setPick] = useState<Record<string, number>>({ exercise: 0, home: 0, path: 0 });
  return (
    <main className="mx-auto grid max-w-xl grid-cols-[minmax(0,1fr)] gap-10 p-6">
      <Toaster />
      <h1 className="text-4xl">Prototipos</h1>
      <div className="grid max-w-xs gap-1">
        <label htmlFor="proto-theme" className="text-text-2 text-sm">
          Tema
        </label>
        <select
          id="proto-theme"
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
      {GROUPS.map((g) => {
        const Current = g.variants[pick[g.id] ?? 0]![2];
        return (
          <section key={g.id} aria-labelledby={`p-${g.id}`} className="grid gap-4">
            <h2 id={`p-${g.id}`} className="text-2xl">
              {g.title}
            </h2>
            <div
              role="radiogroup"
              aria-label={`Variante de ${g.title}`}
              className="flex flex-wrap gap-2"
            >
              {g.variants.map(([k, name], i) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={pick[g.id] === i}
                  onClick={() => setPick({ ...pick, [g.id]: i })}
                  className={`min-h-12 cursor-pointer rounded-full border px-4 text-sm ${pick[g.id] === i ? 'border-brand bg-surface-2' : 'border-line text-text-2'}`}
                >
                  {k} · {name}
                </button>
              ))}
            </div>
            <Current />
          </section>
        );
      })}
    </main>
  );
}
