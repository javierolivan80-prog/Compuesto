import { depositChain, maxDeposits } from '../../../engine/finance';
import { formatEur, formatNumber } from '../../../lib/format';
import { Explainer, type ExplainerStep } from './Explainer';

interface Props {
  deposit: number;
  /** Coeficiente de reservas del modelo, en % */
  reserveRatio: number;
  onInteract?: (id: string) => void;
}

const ROUNDS = 8;

/** Modelo simplificado: un depósito se presta, vuelve como depósito a otro banco y se multiplica en cadena. */
export function MoneyCreation({ deposit, reserveRatio, onInteract }: Props) {
  const rows = depositChain(deposit, reserveRatio, ROUNDS);
  const limit = maxDeposits(deposit, reserveRatio);
  const fmt = (n: number) => formatEur(n, 0);
  const steps: ExplainerStep[] = [
    {
      title: 'Un primer depósito',
      text: `Alguien deposita ${fmt(deposit)}. El banco guarda el ${formatNumber(reserveRatio, 0)} % como reserva (${fmt(rows[0]!.reserve)}) y puede prestar ${fmt(rows[0]!.loan)}.`,
    },
    {
      title: 'El préstamo vuelve como depósito',
      text: `Quien recibe el préstamo lo gasta y el dinero acaba en otro banco como un depósito de ${fmt(rows[1]!.deposit)}. Ese banco también reserva y presta.`,
    },
    {
      title: 'Y se repite',
      text: `Tras ${ROUNDS} rondas los depósitos suman ${fmt(rows[ROUNDS - 1]!.cumulative)}.`,
    },
    {
      title: 'El límite del modelo',
      text: `Cada ronda es más pequeña. En el límite, los depósitos suman ${fmt(deposit)} / ${formatNumber(reserveRatio / 100, 2)} = ${fmt(limit)}. Es un modelo escolar: en la realidad los bancos conceden crédito y se limitan por su solvencia y su demanda de crédito, no solo por la reserva.`,
    },
  ];
  return (
    <Explainer
      explainerId="MoneyCreation"
      title="Cómo se multiplica un depósito"
      description={`Modelo simplificado con un depósito inicial de ${fmt(deposit)} y un coeficiente de reservas del ${formatNumber(reserveRatio, 0)} %. Los depósitos acumulados son ${rows.map((r) => fmt(r.cumulative)).join(', ')} tras cada ronda, con un límite de ${fmt(limit)}.`}
      steps={steps}
      onInteract={onInteract}
      render={(t) => {
        const shown = Math.max(1, Math.round(t * ROUNDS));
        const w = 280 / ROUNDS;
        const limitY = 20;
        return (
          <svg viewBox="0 0 320 180" className="h-auto w-full" role="presentation">
            <line
              x1="15"
              x2="305"
              y1={limitY}
              y2={limitY}
              stroke="var(--text-2)"
              strokeDasharray="4 4"
            />
            <text
              x="18"
              y={limitY - 5}
              fill="var(--text-2)"
              fontSize="10"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              límite {fmt(limit)}
            </text>
            {rows.slice(0, shown).map((r, i) => {
              const h = (r.cumulative / limit) * 120;
              return (
                <g key={r.round}>
                  <rect
                    x={20 + i * w}
                    y={150 - h}
                    width={w - 4}
                    height={h}
                    rx="3"
                    fill="var(--brand)"
                    opacity={0.85}
                  />
                  <text
                    x={20 + i * w + (w - 4) / 2}
                    y={165}
                    textAnchor="middle"
                    fill="var(--text-2)"
                    fontSize="9"
                  >
                    {r.round}
                  </text>
                </g>
              );
            })}
            <text x="15" y="177" fill="var(--text-2)" fontSize="9">
              rondas de depósito y préstamo
            </text>
          </svg>
        );
      }}
    />
  );
}
