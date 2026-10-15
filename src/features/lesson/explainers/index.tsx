import type { ComponentType } from 'react';
import { EXPLAINER_PROPS } from '../../../content/explainer-props';
import type { ExplainerName } from '../../../content/explainer-names';
import { CompoundCurve } from './CompoundCurve';
import { IndexWeights } from './IndexWeights';
import { InflationCart } from './InflationCart';
import { LoanAmortization } from './LoanAmortization';
import { MarketCapFloat } from './MarketCapFloat';
import { MoneyCreation } from './MoneyCreation';
import { OrderBook } from './OrderBook';
import { PrimarySecondary } from './PrimarySecondary';
import { Rule72 } from './Rule72';
import { TinVsTae } from './TinVsTae';

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
