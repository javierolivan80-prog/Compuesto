import { liveStocks, newsTemplates } from '../../content/mesa';
import { dayKey } from '../../engine/days';
import type { AppEvent } from '../../engine/events';
import {
  buildMarket,
  firstDay,
  mesaEvents,
  projectPortfolio,
  type LiveStock,
  type MarketDay,
  type MesaEvent,
  type NewsTemplate,
  type Portfolio,
} from '../../engine/live-market';

export const STOCKS: LiveStock[] = liveStocks();
export const TEMPLATES: NewsTemplate[] = newsTemplates();

export interface MesaState {
  mesa: MesaEvent[];
  market: MarketDay[];
  portfolio: Portfolio;
}

/** Estado de La Mesa a partir de los eventos: mercado generado hasta el día abierto y cartera proyectada. */
export function mesaState(events: readonly AppEvent[]): MesaState {
  const mesa = mesaEvents(events, dayKey);
  const closes = mesa.filter((e) => e.kind === 'close').length;
  const market = buildMarket(STOCKS, TEMPLATES, firstDay + closes + 1);
  return { mesa, market, portfolio: projectPortfolio(mesa, market) };
}
