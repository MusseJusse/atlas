import { shortName } from './model-presentation';
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
    : view);
}

/** Resolve controls and rendering from the same view, including per-view axis choices. */
export function resolveView(view: View, settings: { scatter: boolean; linear: readonly ViewId[]; codingOnly?: boolean }) {
  return {
    scatter: view.mode === 'scatter' || (view.mode === 'optional-scatter' && settings.scatter),
    linear: settings.linear.includes(view.id),
    score: settings.codingOnly ? 'codingIndex' as const : 'intelligence' as const,
  };
}


/** Keep table choice, guidance, and ordering consistent, using measured rows and label space. */
export function rankingPresentation(rows: readonly Model[], view: View, settings: {
  scatter: boolean; linear: readonly ViewId[]; descending: boolean | null; grouped: boolean;
}, phone: boolean, width = 960) {
  const scatter = resolveView(view, settings).scatter;
  const measured = rows.filter((row) => row[view.metric] != null);
  const groups = new Map<string, { model: Model; count: number }>();
  for (const model of measured) {
    const id = settings.grouped ? model.family : model.id;
    const group = groups.get(id) ?? { model, count: 0 };
    group.count++;
    groups.set(id, group);
  }
  const totalWeight = [...groups.values()].reduce((total, group) => total + Math.max(3, group.count), 0);
  const crowdedLabels = !phone && [...groups.values()].some(({ model, count }) => {
    const name = shortName(model);
    const split = name.lastIndexOf(' ');
    const longestLine = split > 0 ? Math.max(split, name.length - split - 1) : name.length;
    const groupWidth = (Math.max(0, width - 82) * Math.max(3, count)) / totalWeight;
    // Conservative estimate for 16px DM Sans labels plus space between adjacent names.
    return groupWidth < longestLine * 8.5 + 18;
  });
  const dense = !scatter && (groups.size > 12 || measured.length > 60 || crowdedLabels);
  return { dense, descending: settings.descending ?? ((dense || phone) && metrics[view.metric].higherIsBetter) };
}
