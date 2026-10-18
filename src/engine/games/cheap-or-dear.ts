import companiesJson from '../../../content/shared/companies.json' with { type: 'json' };
import { mulberry32 } from '../prng';

/*
 * «¿Cara o barata?» (lección-juego de la planta 1, unidad «Múltiplos»): tres empresas del universo cotizan hoy a un
 * precio (ficticio). Para cada una tienes los PER y los EV/EBITDA de cinco comparables anónimos del sector, uno de
 * ellos con un múltiplo disparatado. Eliges el múltiplo de referencia (la mediana, que no se deja arrastrar por el
 * raro), calculas el precio que implica y dices si la acción está cara, barata o en precio. Cifras de 2025 de
 * companies.json; la semilla mueve los comparables y el precio de mercado.
 */

export const CASES = ['naranjas-del-turia', 'tramuntana-retail', 'pirineo-energia'] as const;
export type CaseId = (typeof CASES)[number];
export type Verdict = 'cheap' | 'fair' | 'dear';
/** Margen alrededor del valor por PER dentro del que una acción está «en precio». */
export const FAIR_BAND = 0.1;

/** Mediana de los PER del sector (ficticia, del orden de lo habitual en cada negocio). */
const SECTOR_PE: Record<CaseId, number> = {
  'naranjas-del-turia': 15,
  'tramuntana-retail': 14,
  'pirineo-energia': 17,
};
const SECTOR_EV_EBITDA: Record<CaseId, number> = {
  'naranjas-del-turia': 8,
  'tramuntana-retail': 6,
  'pirineo-energia': 10,
};

interface YearAccounts {
  year: number;
  pyg: Record<string, number>;
  balance: Record<string, number>;
}
const ACCOUNTS = companiesJson as unknown as {
  id: string;
  sharesOutstanding: number;
  years: YearAccounts[];
}[];

const r2 = (x: number) => Math.round(x * 100) / 100;
const r1 = (x: number) => Math.round(x * 10) / 10;

export interface Fundamentals {
  /** Beneficio por acción (€). */
  eps: number;
  /** EBITDA y deuda financiera neta (miles de €). */
  ebitda: number;
  netDebt: number;
  shares: number;
}

export function fundamentalsOf(id: CaseId): Fundamentals {
  const c = ACCOUNTS.find((x) => x.id === id)!;
  const y = c.years.find((v) => v.year === 2025)!;
  return {
    eps: r2((y.pyg.resultado_neto! * 1000) / c.sharesOutstanding),
    ebitda: y.pyg.ebit! + y.pyg.amortizacion!,
    netDebt: y.balance.deuda! - y.balance.caja!,
    shares: c.sharesOutstanding,
  };
}

export interface Case {
  id: CaseId;
  /** PER y EV/EBITDA de los cinco comparables; el último de cada lista es el raro (luego se barajan). */
  peers: { pe: number; evEbitda: number }[];
  /** Precio de la acción hoy (€). */
  price: number;
}

export interface CheapSetup {
  seed: number;
  cases: Case[];
}

const median = (xs: readonly number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};
export const medianOf = median;
export const meanOf = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

export function setupCheap(seed: number): CheapSetup {
  const rnd = mulberry32(seed);
  const cases = CASES.map((id) => {
    const pe = SECTOR_PE[id];
    const ev = SECTOR_EV_EBITDA[id];
    // cuatro comparables normales alrededor de la mediana del sector y uno raro (con un beneficio hundido)
    const spread = [-1.5, -0.5, 0.5, 1.5].map((d) => d + (Math.floor(rnd() * 3) - 1) * 0.2);
    const normal = spread.map((d) => ({ pe: r1(pe + d * 1.4), evEbitda: r1(ev + d * 0.6) }));
    const odd = { pe: r1(pe * (3 + rnd())), evEbitda: r1(ev * (1.3 + rnd() * 0.3)) };
    const peers = [...normal, odd];
    for (let i = peers.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [peers[i], peers[j]] = [peers[j]!, peers[i]!];
    }
    const fair = fundamentalsOf(id).eps * median(peers.map((p) => p.pe));
    // el mercado la paga entre un 30 % por debajo y un 30 % por encima de lo que dicen los comparables
    const price = r2(fair * [0.7, 0.8, 1, 1.2, 1.3][Math.floor(rnd() * 5)]!);
    return { id, peers, price };
  });
  return { seed, cases };
}

/** Precio por acción que implica un PER. */
export const priceFromPe = (id: CaseId, pe: number) => r2(fundamentalsOf(id).eps * pe);

/** Precio por acción que implica un EV/EBITDA: valor de empresa − deuda neta, entre las acciones. */
export function priceFromEvEbitda(id: CaseId, multiple: number): number {
  const f = fundamentalsOf(id);
  return r2(((f.ebitda * multiple - f.netDebt) * 1000) / f.shares);
}

/** El veredicto correcto: cara o barata si el precio se aleja más de un 10 % del valor por la mediana del PER. */
export function rightVerdict(c: Case): Verdict {
  const value = priceFromPe(c.id, median(c.peers.map((p) => p.pe)));
  if (c.price < value * (1 - FAIR_BAND)) return 'cheap';
  if (c.price > value * (1 + FAIR_BAND)) return 'dear';
  return 'fair';
}

export interface CaseAnswer {
  /** El PER de referencia que eliges. */
  pe: number;
  verdict: Verdict;
}

export interface CheapResult {
  medianHits: number;
  verdictHits: number;
  score: number;
}

/** Nota: un 40 % por elegir la mediana como referencia y un 60 % por el veredicto. */
export function cheapResult(s: CheapSetup, answers: readonly CaseAnswer[]): CheapResult {
  const medianHits = s.cases.filter(
    (c, i) => Math.abs((answers[i]?.pe ?? NaN) - median(c.peers.map((p) => p.pe))) < 1e-9,
  ).length;
  const verdictHits = s.cases.filter((c, i) => answers[i]?.verdict === rightVerdict(c)).length;
  const n = s.cases.length;
  return {
    medianHits,
    verdictHits,
    score: Math.round((0.4 * (medianHits / n) + 0.6 * (verdictHits / n)) * 1000) / 1000,
  };
}

/** Cifras de la partida para la explicación y los ejercicios (marcadores {nombre}, en snake_case). */
export function cheapValues(s: CheapSetup, r: CheapResult): Record<string, number> {
  const nar = s.cases.find((c) => c.id === 'naranjas-del-turia')!;
  const f = fundamentalsOf('naranjas-del-turia');
  const pes = nar.peers.map((p) => p.pe);
  const evs = nar.peers.map((p) => p.evEbitda);
  const pe = median(pes);
  const ev = median(evs);
  return {
    eps: f.eps,
    ebitda: f.ebitda,
    net_debt: f.netDebt,
    shares_m: f.shares / 1e6,
    price: nar.price,
    pe_median: r1(pe),
    pe_mean: r1(meanOf(pes)),
    pe_now: r1(nar.price / f.eps),
    ev_median: r1(ev),
    value_pe: priceFromPe('naranjas-del-turia', pe),
    value_ev: priceFromEvEbitda('naranjas-del-turia', ev),
    gap: r1((nar.price / priceFromPe('naranjas-del-turia', pe) - 1) * 100),
    median_hits: r.medianHits,
    verdict_hits: r.verdictHits,
  };
}
