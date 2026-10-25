import type { ComponentType } from 'react';
import { EXPLAINER_PROPS } from '../../../content/explainer-props';
import type { ExplainerName } from '../../../content/explainer-names';
import { BondSeesaw } from './BondSeesaw';
import { CashCycle } from './CashCycle';
import { CompoundCurve } from './CompoundCurve';
import { DcfTimeTravel } from './DcfTimeTravel';
import { Duration } from './Duration';
import { EvBridge } from './EvBridge';
import { FuturePayoff } from './FuturePayoff';
import { FxEffect } from './FxEffect';
import { ExDividend } from './ExDividend';
import { IndexWeights } from './IndexWeights';
import { InflationCart } from './InflationCart';
import { Leverage } from './Leverage';
import { LoanAmortization } from './LoanAmortization';
import { MarketCapFloat } from './MarketCapFloat';
import { MoneyCreation } from './MoneyCreation';
import { NormalTails } from './NormalTails';
import { OrderBook } from './OrderBook';
import { PrimarySecondary } from './PrimarySecondary';
import { RepoFlow } from './RepoFlow';
import { DataSurprise } from './DataSurprise';
import { RateTransmission } from './RateTransmission';
import { RiskPremiumGap } from './RiskPremiumGap';
import { FxParity } from './FxParity';
import { Cet1Cushion } from './Cet1Cushion';
import { CreditRisk } from './CreditRisk';
import { BankMultiple } from './BankMultiple';
import { MarketImpact } from './MarketImpact';
import { Rule72 } from './Rule72';
import { ShareDilution } from './ShareDilution';
import { StockSplit } from './StockSplit';
import { ThreeStatements } from './ThreeStatements';
import { TerDrain } from './TerDrain';
import { TinVsTae } from './TinVsTae';
import { WaccMix } from './WaccMix';

type Registry = {
  [K in ExplainerName]: ComponentType<
    { onInteract?: (id: string) => void } & Record<string, never>
  >;
};
const REGISTRY = {
  CompoundCurve,
  InflationCart,
  Rule72,
  TinVsTae,
  LoanAmortization,
  MoneyCreation,
  MarketCapFloat,
  PrimarySecondary,
  IndexWeights,
  OrderBook,
  ExDividend,
  StockSplit,
  ShareDilution,
  ThreeStatements,
  CashCycle,
  Leverage,
  EvBridge,
  WaccMix,
  DcfTimeTravel,
  BondSeesaw,
  Duration,
  TerDrain,
  NormalTails,
  FxEffect,
  RepoFlow,
  DataSurprise,
  RateTransmission,
  RiskPremiumGap,
  FxParity,
  Cet1Cushion,
  CreditRisk,
  BankMultiple,
  MarketImpact,
  FuturePayoff,
} as unknown as Registry;

/** Dibuja el explicador citado en el JSON de la lección (`{type:'visual', component, props}`). */
export function ExplainerBlock({
  component,
  props,
  onInteract,
}: {
  component: string;
  props: Record<string, unknown>;
  onInteract?: (id: string) => void;
}) {
  const name = component as ExplainerName;
  const Component = REGISTRY[name] as ComponentType<Record<string, unknown>> | undefined;
  const schema = EXPLAINER_PROPS[name];
  if (!Component || !schema) return <p role="alert">Explicador no disponible: {component}</p>;
  const parsed = schema.safeParse(props);
  if (!parsed.success) return <p role="alert">Explicador con datos no válidos: {component}</p>;
  return <Component {...(parsed.data as Record<string, unknown>)} onInteract={onInteract} />;
}
