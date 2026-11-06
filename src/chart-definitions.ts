import type { Model } from './data/schema';

type Measurement = {
  [Key in keyof Model]-?: NonNullable<Model[Key]> extends number ? Key : never;
}[keyof Model];

export const metrics = {
  cost: { label: 'Cost per task', unit: 'USD', higherIsBetter: false },
  codingIndex: { label: 'Coding score', unit: 'Coding score', higherIsBetter: true },
  intelligence: { label: 'Intelligence index', unit: 'Intelligence index', higherIsBetter: true },
  omniscience: { label: 'AA-Omniscience Index', unit: 'AA-Omniscience Index', higherIsBetter: true },
  time: { label: 'Time per task', unit: 'decode time per task', higherIsBetter: false },
  tokens: { label: 'Tokens per task', unit: 'output tokens', higherIsBetter: false },
  tokensTotal: { label: 'Total tokens', unit: 'output tokens, full benchmark run', higherIsBetter: false },
  costTotal: { label: 'Total cost', unit: 'USD, full index run', higherIsBetter: false },
  speed: { label: 'Output speed', unit: 'output tokens/s', higherIsBetter: true },
} as const satisfies Partial<Record<Measurement, {
  label: string;
  unit: string;
  higherIsBetter: boolean;
}>>;
export type Metric = keyof typeof metrics;

export type ScoreMetric = 'intelligence' | 'codingIndex' | 'codingScore' | 'cyberScore';
export const scoreLabels = {
  intelligence: 'Intelligence index',
  codingIndex: 'Coding score',
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
export type View = Omit<(typeof views)[number], 'metric' | 'label'> & { metric: Metric; label: string };

/** Keep stable chart IDs while displaying the score selected by the global dataset switch. */
export function chartViews(codingOnly: boolean): View[] {
  return views.map((view) => codingOnly && view.id === 'intelligence'
    ? { ...view, metric: 'codingIndex', label: metrics.codingIndex.label }
    : codingOnly && view.id === 'cost-intelligence' ? { ...view, label: 'Cost vs coding score' } : view);
}

/** Resolve controls and rendering from the same view, including per-view axis choices. */
export function resolveView(view: View, settings: { scatter: boolean; linear: readonly ViewId[]; codingOnly?: boolean }) {
  return {
    scatter: view.mode === 'scatter' || (view.mode === 'optional-scatter' && settings.scatter),
    linear: settings.linear.includes(view.id),
    score: settings.codingOnly ? 'codingIndex' as const : 'intelligence' as const,
  };
}


/** Bars default to ascending model maxima; rankings retain better-first ordering. */
export function rankingPresentation(view: View, settings: { descending: boolean | null; highestLast?: boolean }, bars = false) {
  const highestLast = settings.highestLast === true || (bars && settings.descending === null);
  return { descending: highestLast ? false : settings.descending ?? metrics[view.metric].higherIsBetter, highestLast };
}
