import { t } from '../../../i18n';
import { Explainer, stepAt, type ExplainerStep } from './Explainer';

interface Props {
  /** Días de cobro, de existencias y de pago. */
  dso: number;
  dio: number;
  dpo: number;
  onInteract?: (id: string) => void;
}

/**
 * Ciclo de caja (ANIMACIONES §2, `CashCycle`): un reloj de días. Compras el día 0, pagas a los proveedores el día
 * de pago, vendes cuando sale del almacén y cobras días después; entre el pago y el cobro, el dinero lo pones tú.
 */
export function CashCycle({ dso, dio, dpo, onInteract }: Props) {
  const sale = dio;
  const cash = dio + dso;
  const ccc = cash - dpo;
  const steps: ExplainerStep[] = [
    {
      title: 'Compras',
      text: `Día 0: llegan la fruta y los envases. Aún no los pagas: los proveedores te dan ${dpo} días.`,
    },
    {
      title: 'Pagas a los proveedores',
      text: `Día ${dpo}: pagas. Desde aquí el dinero ha salido de la caja y todavía no ha vuelto.`,
    },
    {
      title: 'Vendes',
      text: `Día ${sale}: el zumo sale del almacén tras ${dio} días de existencias. Se lo vendes a la cadena, que te pagará a ${dso} días.`,
    },
    {
      title: 'Cobras',
      text: `Día ${cash}: cobras. Entre el pago (día ${dpo}) y el cobro han pasado ${ccc} días: es el ciclo de caja, ${dio} + ${dso} − ${dpo}.`,
    },
  ];
  const max = Math.max(140, cash + 10);
  const x = (d: number) => 8 + (d / max) * 304;
  return (
    <Explainer
      explainerId="CashCycle"
      title={t('cashCycle.title')}
      description={`Naranjas compra el día 0, paga a sus proveedores el día ${dpo}, vende el día ${sale} y cobra el día ${cash}. Durante ${ccc} días, del pago al cobro, el dinero está fuera de la caja: es el ciclo de caja, días de existencias más días de cobro menos días de pago.`}
      steps={steps}
      onInteract={onInteract}
      render={(time) => {
        const s = stepAt(time, 4);
        const marks = [
          { d: 0, label: 'Compras', y: 24, on: s >= 0 },
          { d: dpo, label: `Pagas · día ${dpo}`, y: 90, on: s >= 1 },
          { d: sale, label: `Vendes · día ${sale}`, y: 24, on: s >= 2 },
          { d: cash, label: `Cobras · día ${cash}`, y: 90, on: s >= 3 },
        ];
        return (
          <svg viewBox="0 0 320 100" className="h-auto w-full" role="presentation">
            <line x1={x(0)} x2={x(max)} y1="58" y2="58" stroke="var(--line)" />
            {s >= 1 && (
              <rect
                x={x(dpo)}
                y="50"
                width={Math.max(0, x(s >= 3 ? cash : s >= 2 ? sale : dpo) - x(dpo))}
                height="16"
                rx="4"
                fill="color-mix(in oklch, var(--bear) 22%, transparent)"
              />
            )}
            {marks.map((m) => (
              <g key={m.label} opacity={m.on ? 1 : 0.25}>
                <line x1={x(m.d)} x2={x(m.d)} y1="42" y2="74" stroke="var(--text-2)" />
                <text
                  x={x(m.d)}
                  y={m.y}
                  textAnchor={m.d === 0 ? 'start' : m.d >= max - 25 ? 'end' : 'middle'}
                  fill="var(--text)"
                  fontSize="10"
                >
                  {m.label}
                </text>
              </g>
            ))}
            {s >= 3 && (
              <text
                x={(x(dpo) + x(cash)) / 2}
                y="62"
                textAnchor="middle"
                fill="var(--text)"
                fontSize="9"
              >
                {`${ccc} días`}
              </text>
            )}
          </svg>
        );
      }}
    />
  );
}
