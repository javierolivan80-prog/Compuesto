import { z } from 'zod';
import companiesJson from '../../content/shared/companies.json';
import newsJson from '../../content/shared/market-news.json';
import type { LiveStock, NewsTemplate } from '../engine/live-market';
import { symbolOf } from '../engine/ticker';
import { companiesSchema, slug } from './schemas';

/* Datos de La Mesa (docs/specs/la-mesa.md): valores del universo y teletipo. */

export const newsTemplateSchema = z.object({
  id: slug,
  scope: z.enum(['company', 'macro']),
  sign: z.union([z.literal(1), z.literal(-1)]),
  impactMin: z.number().positive().max(0.2),
  impactMax: z.number().positive().max(0.2),
  headline: z.string().min(1),
  explanation: z.string().min(1),
  concepts: z.array(slug).min(1),
});
export const newsTemplatesSchema = z.array(newsTemplateSchema).min(1);

/** Riesgo por empresa: beta y volatilidad diaria propia, según su negocio (hipótesis didácticas). */
const RISK: Record<string, { beta: number; vol: number }> = {
  'naranjas-del-turia': { beta: 0.8, vol: 0.012 },
  'pirineo-energia': { beta: 0.6, vol: 0.01 },
  'mediterranea-de-navieras': { beta: 1.4, vol: 0.02 },
  'albufera-partners': { beta: 1.2, vol: 0.016 },
  'tramuntana-retail': { beta: 1.2, vol: 0.017 },
  'azahar-calderona': { beta: 0.8, vol: 0.011 },
};
/** P/E de partida para fijar el precio inicial a partir del beneficio por acción de 2025. */
const START_PE = 15;

export function liveStocks(): LiveStock[] {
  return companiesSchema
    .parse(companiesJson)
    .filter((c) => c.listed)
    .map((c) => {
      const eps = (c.years.at(-1)!.pyg.resultado_neto * 1000) / c.sharesOutstanding;
      const risk = RISK[c.id] ?? { beta: 1, vol: 0.015 };
      return {
        id: c.id,
        name: c.name.replace(/ S\.A\.$/, ''),
        symbol: symbolOf(c.id),
        sector: c.sector,
        startPrice: Math.max(1, Math.round(eps * START_PE * 100) / 100),
        ...risk,
      };
    });
}

export function newsTemplates(): NewsTemplate[] {
  return newsTemplatesSchema.parse(newsJson);
}
