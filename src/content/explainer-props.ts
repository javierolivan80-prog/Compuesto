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
  MoneyCreation: z.object({
    deposit: z.number().positive(),
    /** Coeficiente de reservas del modelo, en % */
    reserveRatio: z.number().min(1).max(50),
  }),
  MarketCapFloat: z.object({
    price: z.number().positive(),
    shares: z.number().int().positive(),
    /** % de las acciones que cotiza libremente */
    freeFloat: z.number().min(1).max(100),
  }),
  PrimarySecondary: z.object({
    newShares: z.number().int().positive(),
    price: z.number().positive(),
  }),
  IndexWeights: z.object({
    constituents: z
      .array(
        z.object({
          name: z.string().min(1).max(20),
          cap: z.number().positive(),
          returnPct: z.number().min(-100).max(1000),
        }),
      )
      .min(2)
      .max(6),
  }),
  OrderBook: z.object({
    asks: z
      .array(z.object({ price: z.number().positive(), qty: z.number().int().positive() }))
      .min(2)
      .max(5),
    bids: z
      .array(z.object({ price: z.number().positive(), qty: z.number().int().positive() }))
      .min(2)
      .max(5),
    buySize: z.number().int().positive(),
  }),
  EvBridge: z.object({
    cap: z.number().positive(),
    debt: z.number().min(0),
    cash: z.number().min(0),
    ebitda: z.number().positive(),
  }),
  DcfTimeTravel: z
    .object({
      fcff: z.array(z.number().positive()).length(5),
      wacc: z.number().positive().max(20),
      g: z.number().min(0).max(5),
    })
    .refine((p) => p.wacc > p.g, 'El WACC debe ser mayor que g'),
  TerDrain: z
    .object({
      amount: z.number().positive(),
      gross: z.number().min(0).max(15),
      terCheap: z.number().min(0).max(5),
      terDear: z.number().min(0).max(5),
    })
    .refine((p) => p.terCheap < p.terDear, 'terCheap debe ser menor que terDear'),
  Duration: z.object({
    yield: z.number().min(0.5).max(10),
    shock: z.number().min(0.25).max(3),
  }),
  BondSeesaw: z.object({
    coupon: z.number().min(2).max(10),
    years: z.number().int().min(1).max(30),
  }),
  WaccMix: z.object({
    rf: z.number().min(0),
    erp: z.number().positive(),
    size: z.number().min(0),
    betaU: z.number().positive(),
    kd0: z.number().positive(),
    threshold: z.number().min(0).max(70),
  }),
  Leverage: z.object({
    goodRoa: z.number(),
    badRoa: z.number(),
    rate: z.number().min(0),
  }),
  CashCycle: z.object({
    dso: z.number().int().min(0).max(365),
    dio: z.number().int().min(0).max(365),
    dpo: z.number().int().min(0).max(365),
  }),
  ThreeStatements: z.object({
    sale: z.number().positive(),
    cost: z.number().positive(),
  }),
  ExDividend: z.object({
    price: z.number().positive(),
    dividend: z.number().positive(),
  }),
  StockSplit: z.object({
    price: z.number().positive(),
    shares: z.number().int().positive(),
    ratio: z.number().int().min(2).max(10),
  }),
  ShareDilution: z.object({
    shares: z.number().int().positive(),
    newShares: z.number().int().positive(),
    holding: z.number().int().positive(),
  }),
};
