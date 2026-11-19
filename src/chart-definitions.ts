import type { Model } from './data/schema';

type Measurement = {
  [Key in keyof Model]-?: NonNullable<Model[Key]> extends number ? Key : never;
}[keyof Model];

export const metrics = {
  cost: { label: 'Cost per task', unit: 'USD', higherIsBetter: false },
  intelligence: { label: 'Intelligence index', unit: 'Intelligence index', higherIsBetter: true },
  omniscience: { label: 'AA-Omniscience', unit: 'AA-Omniscience index', higherIsBetter: true },
  time: { label: 'Time per task', unit: 'Output generation time', higherIsBetter: false },
  tokens: { label: 'Tokens per task', unit: 'output tokens', higherIsBetter: false },
  tokensTotal: { label: 'Total tokens', unit: 'Output tokens, full index run', higherIsBetter: false },
  costTotal: { label: 'Total cost', unit: 'USD, full index run', higherIsBetter: false },
  speed: { label: 'Output speed', unit: 'output tokens/s', higherIsBetter: true },
} as const satisfies Partial<Record<Measurement, {
  label: string;
  unit: string;
  higherIsBetter: boolean;
}>>;
export type Metric = keyof typeof metrics;

export type ScoreMetric = 'intelligence' | 'codingScore' | 'cyberScore';
export const scoreLabels = {
  intelligence: 'Intelligence index',
  codingScore: 'Coding Agent Index v2.0',
  cyberScore: 'Cyber Index',
} satisfies Record<ScoreMetric, string>;

export const views = [
  { id: 'cost-intelligence', label: 'Cost vs intelligence', metric: 'cost', mode: 'scatter' },
  { id: 'intelligence', label: metrics.intelligence.label, metric: 'intelligence', mode: 'bars' },
  { id: 'omniscience', label: 'AA-Omniscience', metric: 'omniscience', mode: 'bars' },
  { id: 'tokens-task', label: metrics.tokens.label, metric: 'tokens', mode: 'optional-scatter' },
  { id: 'tokens-total', label: metrics.tokensTotal.label, metric: 'tokensTotal', mode: 'bars' },
  { id: 'cost-task', label: metrics.cost.label, metric: 'cost', mode: 'bars' },
  { id: 'time-task', label: metrics.time.label, metric: 'time', mode: 'bars' },
] as const satisfies readonly {
  id: string;
  label: string;
  metric: Metric;
  mode: 'bars' | 'scatter' | 'optional-scatter';
}[];
export type ViewId = (typeof views)[number]['id'];

/** One plain sentence on how to read each chart, shown under its title. */
export const viewDescriptions = {
  'cost-intelligence': 'Each point is a reasoning level. Lines join a model’s levels. Up and to the left is better.',
  intelligence: 'Artificial Analysis Intelligence index at each reasoning level. Higher is better.',
  omniscience: 'Rewards correct answers and penalises wrong ones. Declining to answer scores zero. Higher is better.',
  'tokens-task': 'Output tokens used per Intelligence index task. Lower is better.',
  'tokens-total': 'Output tokens used across the full Intelligence index run. Lower is better.',
  'cost-task': 'Cost of one Intelligence index task. Lower is better.',
  'time-task': 'Time spent generating output for one Intelligence index task. Lower is better.',
} satisfies Record<ViewId, string>;
export type View = Omit<(typeof views)[number], 'metric' | 'label'> & { metric: Metric; label: string };

/** Resolve controls and rendering from the same view, including per-view axis choices. */
export function resolveView(view: View, settings: { scatter: boolean; linear: readonly ViewId[] }) {
  return {
    scatter: view.mode === 'scatter' || (view.mode === 'optional-scatter' && settings.scatter),
    linear: settings.linear.includes(view.id),
    score: 'intelligence' as const,
  };
}
