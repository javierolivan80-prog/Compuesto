import { mulberry32 } from '../prng';

/*
 * «El rumor de OPA» (lección-juego de la planta 0, unidad «Operaciones corporativas y OPAs»): tienes 1.000 acciones de
 * Mediterránea de Navieras. Un día sale en prensa el rumor de una OPA de Ebro Capital y la acción sube; al día
 * siguiente, un compañero que trabaja en la operación te dice que mañana se anuncia (información privilegiada); al
 * tercer día se anuncia la OPA con un premio y la acción cotiza un poco por debajo del precio ofrecido. Enseña el
 * premio de una OPA, el diferencial hasta el precio de la oferta, que un rumor no es una certeza y que con información
 * privilegiada no se opera ni se comunica: se avisa a cumplimiento normativo. Lógica pura y determinista por semilla.
 */

/** Acciones de Mediterránea de Navieras (companies.json, `sharesOutstanding`; un test lo comprueba). */
export const TARGET_SHARES = 25_000_000;
export const MY_SHARES = 1_000;
/** Acciones de más que compras si decides apostar por el rumor. */
export const EXTRA = 1_000;

const r2 = (x: number) => Math.round(x * 100) / 100;

export interface TakeoverSetup {
  seed: number;
  /** Cierre antes del rumor (precio no afectado). */
  p0: number;
  /** Cierre del día del rumor. */
  pRumor: number;
  /** Precio ofrecido en la OPA. */
  offer: number;
  /** Cotización tras el anuncio: algo por debajo del precio de la oferta. */
  pAfter: number;
  /** Adonde habría vuelto la acción si el rumor hubiera sido falso. */
  pFalse: number;
}

export function setupTakeover(seed: number): TakeoverSetup {
  const rnd = mulberry32(seed);
  const p0 = r2(6 + Math.floor(rnd() * 41) / 100);
  const pRumor = r2(p0 * (1 + 0.05 + Math.floor(rnd() * 4) * 0.01));
  const offer = r2(p0 * (1 + 0.2 + Math.floor(rnd() * 3) * 0.05));
  const pAfter = r2(offer * (1 - 0.01 - Math.floor(rnd() * 3) * 0.005));
  const pFalse = r2(p0 * 0.99);
  return { seed, p0, pRumor, offer, pAfter, pFalse };
}

/** Qué haces con tus acciones tras el anuncio. */
export type FinalMove = 'sell' | 'accept' | 'reject';

export interface TakeoverChoices {
  /** Día 1: compras 1.000 más por el rumor. */
  buyOnRumor: boolean;
  /** Día 2: ante la información privilegiada, avisas a cumplimiento y no operas (true) o compras (false). */
  reportInsider: boolean;
  final: FinalMove;
}

export interface TakeoverResult {
  p0: number;
  pRumor: number;
  offer: number;
  pAfter: number;
  pFalse: number;
  shares: number;
  targetShares: number;
  /** Premio de la oferta sobre el precio antes del rumor, en %. */
  premium: number;
  /** Premio sobre el precio del día del rumor, en %. */
  premiumRumor: number;
  /** Lo que ganas comprando tras el anuncio y acudiendo a la OPA, en %. */
  spread: number;
  /** Lo que costaría comprar el 100 % al precio de la oferta (€). */
  dealSize: number;
  /** Ganancia de tus 1.000 acciones si acudes a la OPA (€). */
  gainAccept: number;
  /** Ganancia si las vendes en bolsa tras el anuncio (€). */
  gainSell: number;
  /** Lo que habrías perdido con las 1.000 de más si el rumor hubiera sido falso (€). */
  falseLoss: number;
  score: number;
}

export function takeoverResult(s: TakeoverSetup, c: TakeoverChoices): TakeoverResult {
  // el día de la información privilegiada pesa más: es lo que no se puede hacer
  const insider = c.reportInsider ? 0.6 : 0;
  const final = c.final === 'reject' ? 0.2 : 0.4;
  return {
    p0: s.p0,
    pRumor: s.pRumor,
    offer: s.offer,
    pAfter: s.pAfter,
    pFalse: s.pFalse,
    shares: MY_SHARES,
    targetShares: TARGET_SHARES,
    premium: r2((s.offer / s.p0 - 1) * 100),
    premiumRumor: r2((s.offer / s.pRumor - 1) * 100),
    spread: r2((s.offer / s.pAfter - 1) * 100),
    dealSize: r2(s.offer * TARGET_SHARES),
    gainAccept: r2(MY_SHARES * (s.offer - s.p0)),
    gainSell: r2(MY_SHARES * (s.pAfter - s.p0)),
    falseLoss: r2(EXTRA * (s.pRumor - s.pFalse)),
    score: Math.round((insider + final) * 1000) / 1000,
  };
}

/** Cifras de la partida para la explicación y los ejercicios de la lección (marcadores {nombre}, en snake_case). */
export function takeoverValues(r: TakeoverResult): Record<string, number> {
  return {
    p0: r.p0,
    p_rumor: r.pRumor,
    offer: r.offer,
    p_after: r.pAfter,
    p_false: r.pFalse,
    shares: r.shares,
    target_shares: r.targetShares,
    premium: r.premium,
    premium_rumor: r.premiumRumor,
    spread: r.spread,
    deal_size: r.dealSize,
    gain_accept: r.gainAccept,
    gain_sell: r.gainSell,
    false_loss: r.falseLoss,
  };
}
