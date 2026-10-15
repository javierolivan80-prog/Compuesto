/** Explicadores disponibles (docs/ANIMACIONES.md §2). El validador rechaza lecciones que citen otro. */
export const EXPLAINER_NAMES = [
  'CompoundCurve',
  'InflationCart',
  'Rule72',
  'TinVsTae',
  'LoanAmortization',
  'MoneyCreation',
  'MarketCapFloat',
  'PrimarySecondary',
  'IndexWeights',
] as const;
export type ExplainerName = (typeof EXPLAINER_NAMES)[number];
