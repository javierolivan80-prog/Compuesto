import { z } from 'zod';
import type { ExplainerName } from './explainer-names';

/** Props de cada explicador: valores reales de la lección, nunca datos fijos dentro del componente. */
export const EXPLAINER_PROPS: Record<ExplainerName, z.ZodType> = {
  CompoundCurve: z.object({
    principal: z.number().positive(),
    /** % anual */
    rate: z.number().positive().max(100),
    years: z.number().int().min(2).max(60),
  }),
  InflationCart: z.object({
    basketPrice: z.number().positive(),
    /** % anual */
    inflationRate: z.number().positive().max(100),
    years: z.number().int().min(2).max(60),
  }),
  Rule72: z.object({
    /** % anual */
    rate: z.number().min(1).max(30),
  }),
  TinVsTae: z.object({
    /** TIN anual en % */
    tin: z.number().positive().max(30),
  }),
  LoanAmortization: z.object({
    principal: z.number().positive(),
    /** TIN anual en % */
    rate: z.number().positive().max(20),
    years: z.number().int().min(2).max(40),
  }),
};
