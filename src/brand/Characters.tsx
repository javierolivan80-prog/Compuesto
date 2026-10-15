import { useId } from 'react';

export type CharacterId = 'mentora' | 'rival' | 'jefe' | 'compliance';

export const CHARACTERS: Record<CharacterId, { name: string; role: string }> = {
  mentora: { name: 'Elena Marqués', role: 'Directora de Research' },
  rival: { name: 'Hugo Ferrer', role: 'Becario rival' },
  jefe: { name: 'Ramón Climent', role: 'Jefe de la mesa de trading' },
  compliance: { name: 'Pilar Soler', role: 'Compliance officer' },
};

const stroke = { stroke: 'var(--brand)', strokeWidth: 1.5 } as const;

function Skin() {
  return <circle cx="50" cy="42" r="15" fill="var(--text-2)" {...stroke} />;
}

function Body({ fill }: { fill: string }) {
  return <path d="M16 100 C16 74 30 64 50 64 C70 64 84 74 84 100 Z" fill={fill} {...stroke} />;
}

const FACES: Record<CharacterId, () => React.ReactElement> = {
  // Melena larga y gafas
  mentora: () => (
    <g>
      <Body fill="var(--surface-2)" />
      <path
        d="M33 44 C30 22 70 22 67 44 C70 60 66 68 66 68 L62 52 L38 52 L34 68 C34 68 30 60 33 44 Z"
        fill="var(--brand)"
      />
      <Skin />
      <path d="M35 36 C38 24 62 24 65 36 C58 30 42 30 35 36 Z" fill="var(--brand)" />
      <g fill="none" stroke="var(--bg)" strokeWidth="1.8">
        <circle cx="43" cy="43" r="5" />
        <circle cx="57" cy="43" r="5" />
        <path d="M48 43 H52" />
      </g>
    </g>
  ),
  // Pelo revuelto, corbata torcida
  rival: () => (
    <g>
      <Body fill="var(--surface-1)" />
      <path d="M50 66 L44 74 L50 96 L56 74 Z" fill="var(--bear)" transform="rotate(8 50 80)" />
      <Skin />
      <path
        d="M34 38 L38 24 L44 32 L50 22 L56 32 L62 24 L66 38 C58 32 42 32 34 38 Z"
        fill="var(--accent)"
      />
      <circle cx="44" cy="44" r="1.8" fill="var(--bg)" />
      <circle cx="56" cy="44" r="1.8" fill="var(--bg)" />
    </g>
  ),
  // Calvo con barba y chaleco
  jefe: () => (
    <g>
      <Body fill="var(--surface-2)" />
      <path d="M38 70 L50 100 L62 70 L50 64 Z" fill="var(--bg)" />
      <Skin />
      <path d="M35 46 C36 66 64 66 65 46 C60 56 40 56 35 46 Z" fill="var(--text)" />
      <circle cx="44" cy="42" r="1.8" fill="var(--bg)" />
      <circle cx="56" cy="42" r="1.8" fill="var(--bg)" />
      <path
        d="M43 36 L48 38 M57 36 L52 38"
        stroke="var(--bg)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </g>
  ),
  // Moño, acreditación
  compliance: () => (
    <g>
      <Body fill="var(--surface-1)" />
      <rect x="56" y="74" width="14" height="10" rx="2" fill="var(--info)" />
      <path d="M50 64 V74" stroke="var(--brand)" strokeWidth="1.5" />
      <Skin />
      <path d="M35 40 C36 24 64 24 65 40 C60 32 40 32 35 40 Z" fill="var(--text)" />
      <circle cx="50" cy="20" r="6" fill="var(--text)" />
      <circle cx="44" cy="44" r="1.8" fill="var(--bg)" />
      <circle cx="56" cy="44" r="1.8" fill="var(--bg)" />
      <path
        d="M45 50 Q50 53 55 50"
        fill="none"
        stroke="var(--bg)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </g>
  ),
};

export function Avatar({ character, size = 64 }: { character: CharacterId; size?: number }) {
  const id = useId();
  const Face = FACES[character];
  const { name, role } = CHARACTERS[character];
  return (
    <svg role="img" aria-labelledby={id} width={size} height={size} viewBox="0 0 100 100">
      <title id={id}>{`${name}, ${role}`}</title>
      <defs>
        <clipPath id={`${id}-clip`}>
          <circle cx="50" cy="50" r="48" />
        </clipPath>
      </defs>
      <circle cx="50" cy="50" r="48" fill="var(--surface-2)" />
      <g clipPath={`url(#${id}-clip)`}>
        <Face />
      </g>
      <circle cx="50" cy="50" r="48" fill="none" stroke="var(--brand)" strokeWidth="1.5" />
    </svg>
  );
}
