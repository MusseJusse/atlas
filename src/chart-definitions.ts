import type { Model } from './data/schema';

type Measurement = {
  [Key in keyof Model]-?: Model[Key] extends number | null ? Key : never;
}[keyof Model];

export const metrics = {
  cost: { label: 'Cost per task', unit: 'USD', higherIsBetter: false },
  intelligence: { label: 'Intelligence index', unit: 'Intelligence index', higherIsBetter: true },
  omniscience: { label: 'AA-Omniscience Index', unit: 'AA-Omniscience Index', higherIsBetter: true },
  time: { label: 'Time per task', unit: 'decode time per task', higherIsBetter: false },
  tokens: { label: 'Tokens per task', unit: 'output tokens', higherIsBetter: false },
  tokensTotal: { label: 'Total tokens', unit: 'output tokens, full index run', higherIsBetter: false },
  costTotal: { label: 'Total cost', unit: 'USD, full index run', higherIsBetter: false },
  speed: { label: 'Output speed', unit: 'output tokens/s', higherIsBetter: true },
} as const satisfies Partial<Record<Measurement, {
  label: string;
  unit: string;
  higherIsBetter: boolean;
}>>;
export type Metric = keyof typeof metrics;

export const views = [
  { id: 'cost-intelligence', label: 'Cost vs intelligence', metric: 'cost', mode: 'scatter' },
  { id: 'intelligence', label: metrics.intelligence.label, metric: 'intelligence', mode: 'bars' },
  { id: 'omniscience', label: 'AA-Omniscience', metric: 'omniscience', mode: 'bars' },
  { id: 'tokens-task', label: metrics.tokens.label, metric: 'tokens', mode: 'optional-scatter' },
  { id: 'tokens-total', label: metrics.tokensTotal.label, metric: 'tokensTotal', mode: 'bars' },
  { id: 'cost-task', label: metrics.cost.label, metric: 'cost', mode: 'bars' },
  { id: 'cost-total', label: metrics.costTotal.label, metric: 'costTotal', mode: 'bars' },
  { id: 'output-speed', label: metrics.speed.label, metric: 'speed', mode: 'bars' },
  { id: 'time-task', label: metrics.time.label, metric: 'time', mode: 'bars' },
] as const satisfies readonly {
  id: string;
  label: string;
  metric: Metric;
  mode: 'bars' | 'scatter' | 'optional-scatter';
}[];
export type View = (typeof views)[number];
export type ViewId = View['id'];

/** Resolve controls and rendering from the same view, including per-view axis choices. */
export function resolveView(view: View, settings: { scatter: boolean; linear: readonly ViewId[] }) {
  return {
    scatter: view.mode === 'scatter' || (view.mode === 'optional-scatter' && settings.scatter),
    linear: settings.linear.includes(view.id),
  };
}
