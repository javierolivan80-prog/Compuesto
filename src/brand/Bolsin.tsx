import { useId } from 'react';
import './bolsin.css';

export type BolsinState = 'neutro' | 'feliz' | 'celebrando' | 'pensando' | 'animo' | 'dormido';

export const BOLSIN_STATES: readonly BolsinState[] = [
  'neutro',
  'feliz',
  'celebrando',
  'pensando',
  'animo',
  'dormido',
];

const LABELS: Record<BolsinState, string> = {
  neutro: 'Bolsín, atento',
  feliz: 'Bolsín, contento',
  celebrando: 'Bolsín celebrando',
  pensando: 'Bolsín pensando',
  animo: 'Bolsín animándote',
  dormido: 'Bolsín dormido',
};

function Eyes({ state }: { state: BolsinState }) {
  switch (state) {
    case 'feliz':
    case 'celebrando':
      return (
        <g
          className="bolsin-eyes-happy"
          fill="none"
          stroke="var(--text)"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <path d="M33 44 Q38 38 43 44" />
          <path d="M57 44 Q62 38 67 44" />
        </g>
      );
    case 'dormido':
      return (
        <g fill="none" stroke="var(--text)" strokeWidth="2.5" strokeLinecap="round">
          <path d="M33 43 Q38 47 43 43" />
          <path d="M57 43 Q62 47 67 43" />
        </g>
      );
    case 'pensando':
      return (
        <g className="bolsin-eyes" fill="var(--text)">
          <circle cx="39" cy="41" r="3.2" />
          <circle cx="63" cy="41" r="3.2" />
        </g>
      );
    case 'animo':
      return (
        <g>
          <g className="bolsin-eyes" fill="var(--text)">
            <circle cx="38" cy="44" r="3.2" />
            <circle cx="62" cy="44" r="3.2" />
          </g>
          <g stroke="var(--text)" strokeWidth="2" strokeLinecap="round">
            <path d="M32 36 L43 38" />
            <path d="M68 36 L57 38" />
          </g>
        </g>
      );
    default:
      return (
        <g className="bolsin-eyes" fill="var(--text)">
          <circle cx="38" cy="44" r="3.2" />
          <circle cx="62" cy="44" r="3.2" />
        </g>
      );
  }
}

function Mouth({ state }: { state: BolsinState }) {
  const p = {
    fill: 'none',
    stroke: 'var(--bg)',
    strokeWidth: 2.5,
    strokeLinecap: 'round' as const,
  };
  switch (state) {
    case 'feliz':
    case 'animo':
      return <path {...p} d="M43 70 Q50 76 57 70" />;
    case 'celebrando':
      return <path d="M42 69 Q50 82 58 69 Z" fill="var(--bg)" />;
    case 'pensando':
      return <path {...p} d="M45 71 H55" />;
    case 'dormido':
      return <path {...p} d="M46 71 Q50 73 54 71" />;
    default:
      return <path {...p} d="M44 70 Q50 73 56 70" />;
  }
}

/** Mascota original: toro pequeño en línea + relleno plano con colores del tema. */
export function Bolsin({ state = 'neutro', size = 96 }: { state?: BolsinState; size?: number }) {
  const id = useId();
  return (
    <svg
      role="img"
      aria-labelledby={id}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className="bolsin"
      data-state={state}
    >
      <title id={id}>{LABELS[state]}</title>
      <g className="bolsin-body">
        {/* cuernos */}
        <path
          d="M26 36 C14 34 8 22 12 12 C18 20 26 24 34 27 Z M74 36 C86 34 92 22 88 12 C82 20 74 24 66 27 Z"
          fill="var(--accent)"
          stroke="var(--brand)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* orejas */}
        <ellipse
          cx="22"
          cy="46"
          rx="8"
          ry="5"
          fill="var(--surface-2)"
          stroke="var(--brand)"
          strokeWidth="1.5"
          transform="rotate(20 22 46)"
        />
        <ellipse
          cx="78"
          cy="46"
          rx="8"
          ry="5"
          fill="var(--surface-2)"
          stroke="var(--brand)"
          strokeWidth="1.5"
          transform="rotate(-20 78 46)"
        />
        {/* cabeza */}
        <path
          d="M50 26 C70 26 80 38 80 54 C80 74 68 88 50 88 C32 88 20 74 20 54 C20 38 30 26 50 26 Z"
          fill="var(--surface-2)"
          stroke="var(--brand)"
          strokeWidth="1.5"
        />
        {/* hocico */}
        <ellipse cx="50" cy="70" rx="17" ry="12" fill="var(--brand)" />
        <circle cx="44" cy="62" r="1.8" fill="var(--bg)" />
        <circle cx="56" cy="62" r="1.8" fill="var(--bg)" />
        <Mouth state={state} />
        <Eyes state={state} />
        {/* anilla */}
        <circle cx="50" cy="82" r="3.5" fill="none" stroke="var(--accent)" strokeWidth="1.5" />
      </g>
      {state === 'pensando' && (
        <g fill="var(--text-2)" className="bolsin-aside">
          <circle cx="84" cy="22" r="2" />
          <circle cx="90" cy="14" r="3" />
        </g>
      )}
      {state === 'dormido' && (
        <text
          x="76"
          y="24"
          fill="var(--text-2)"
          className="bolsin-aside"
          style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}
        >
          z
        </text>
      )}
      {state === 'celebrando' && (
        <g stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" className="bolsin-aside">
          <path d="M8 40 L14 44 M92 40 L86 44 M50 6 V14" />
        </g>
      )}
    </svg>
  );
}
