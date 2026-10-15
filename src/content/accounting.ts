import type { Company } from './schemas';

export interface AccountingIssue {
  company: string;
  year: number;
  message: string;
}

/** Comprobaciones contables de companies.json (CLAUDE.md §9): cuentas que cuadran. */
export function checkCompany(c: Company): AccountingIssue[] {
  const out: AccountingIssue[] = [];
  const bad = (year: number, message: string) => out.push({ company: c.id, year, message });
  const years = [...c.years].sort((a, b) => a.year - b.year);

  years.forEach((y, i) => {
    const { pyg: p, balance: b, flujos: f } = y;
    if (p.ebit !== p.ingresos - p.coste_ventas - p.gastos_operativos - p.amortizacion)
      bad(y.year, 'EBIT ≠ ingresos − coste de ventas − gastos operativos − amortización');
    if (p.bai !== p.ebit - p.gastos_financieros) bad(y.year, 'BAI ≠ EBIT − gastos financieros');
    if (p.resultado_neto !== p.bai - p.impuestos) bad(y.year, 'Resultado neto ≠ BAI − impuestos');
    if (b.total_activo !== b.caja + b.clientes + b.existencias + b.inmovilizado)
      bad(y.year, 'Total activo ≠ suma de sus partidas');
    if (b.total_pasivo !== b.proveedores + b.deuda)
      bad(y.year, 'Total pasivo ≠ proveedores + deuda');
    if (b.total_patrimonio !== b.capital + b.reservas)
      bad(y.year, 'Patrimonio ≠ capital + reservas');
    if (b.total_activo !== b.total_pasivo + b.total_patrimonio)
      bad(
        y.year,
        `Activo (${b.total_activo}) ≠ pasivo + patrimonio (${b.total_pasivo + b.total_patrimonio})`,
      );
    if (f.variacion_caja !== f.operativo + f.inversion + f.financiacion)
      bad(y.year, 'Variación de caja ≠ operativo + inversión + financiación');
    if (b.caja < 0) bad(y.year, 'Caja negativa');

    const prev = years[i - 1];
    if (prev) {
      if (b.caja - prev.balance.caja !== f.variacion_caja)
        bad(
          y.year,
          `El flujo de caja (${f.variacion_caja}) no reconcilia la variación de caja (${b.caja - prev.balance.caja})`,
        );
      // la PyG enlaza con el patrimonio: reservas finales = reservas iniciales + resultado − dividendos
      const expected = prev.balance.reservas + p.resultado_neto - y.dividendos;
      if (b.reservas !== expected)
        bad(
          y.year,
          `Reservas (${b.reservas}) ≠ reservas previas + resultado − dividendos (${expected})`,
        );
      if (b.capital !== prev.balance.capital + y.ampliacion_capital)
        bad(y.year, 'Capital ≠ capital previo + ampliación');
      // la inversión neta explica el inmovilizado: ΔInm = capex − amortización
      const capex = -f.inversion;
      if (b.inmovilizado !== prev.balance.inmovilizado + capex - p.amortizacion)
        bad(y.year, 'Inmovilizado ≠ previo + inversión − amortización');
      // flujo operativo = resultado + amortización − Δcirculante
      const dNwc =
        b.clientes +
        b.existencias -
        b.proveedores -
        (prev.balance.clientes + prev.balance.existencias - prev.balance.proveedores);
      if (f.operativo !== p.resultado_neto + p.amortizacion - dNwc)
        bad(y.year, 'Flujo operativo ≠ resultado + amortización − Δ circulante');
      const dDebt = b.deuda - prev.balance.deuda;
      if (f.financiacion !== dDebt - y.dividendos + y.ampliacion_capital)
        bad(y.year, 'Flujo de financiación ≠ Δ deuda − dividendos + ampliación');
    }
  });
  return out;
}
