import snapshot from 'virtual:benchmarks';
import type { Model } from './data/schema';
import { speedEndpoints } from './data/speed-endpoints';
export type { Model } from './data/schema';
export type Metric =
  | 'cost'
  | 'intelligence'
  | 'omniscience'
  | 'time'
  | 'tokens'
  | 'tokensTotal'
  | 'costTotal'
  | 'speed';
export type Family = { family: string; model: Model; variants: Model[] };

export const models: Model[] = snapshot.models;
const allModels: Model[] = [...models, ...speedEndpoints];
const endpointParents = new Map(
  speedEndpoints.map((endpoint) => [endpoint.family, endpoint.parentFamily]),
);
export const fetchedAt = snapshot.fetchedAt;
export const views = [
  { id: 'cost-intelligence', label: 'Cost vs intelligence', metric: 'cost', scatter: true },
  { id: 'intelligence', label: 'Intelligence index', metric: 'intelligence', scatter: false },
  { id: 'omniscience', label: 'AA-Omniscience', metric: 'omniscience', scatter: false },
  { id: 'tokens-task', label: 'Tokens per task', metric: 'tokens', scatter: false },
  { id: 'tokens-total', label: 'Total tokens', metric: 'tokensTotal', scatter: false },
  { id: 'cost-task', label: 'Cost per task', metric: 'cost', scatter: false },
  { id: 'cost-total', label: 'Total cost', metric: 'costTotal', scatter: false },
  { id: 'output-speed', label: 'Output speed', metric: 'speed', scatter: false },
  { id: 'time-task', label: 'Time per task', metric: 'time', scatter: false },
] as const;
export type View = (typeof views)[number];
export type ViewId = View['id'];

export const frontierFamilies = [
  'gpt-6-1-sol',
  'gpt-6-luna',
  'gpt-6-astra',
  'claude-haiku-5-5',
  'claude-sonnet-5-5',
  'claude-opus-5-5',
  'claude-fable-5-1',
  'gemini-4-argon',
  'grok-4-7',
  'muse-wonder-full',
];
export const notableFamilies = [
  'glm-5-3-flash',
  'deepseek-v4-1-flash-1017',
  'qwen3-8-max-0902',
  'qwen3-8-27b',
];
export const defaultSelected = frontierFamilies.filter((id) => id !== 'claude-sonnet-5-5');
export const efforts = ['none', 'low', 'medium', 'high', 'xhigh', 'max'];

const byFamily = new Map<string, Model[]>();
for (const model of allModels) {
  const variants = byFamily.get(model.family) ?? [];
  variants.push(model);
  byFamily.set(model.family, variants);
}
const allFamilies: Family[] = [...byFamily].map(([family, variants]) => ({
  family,
  model: variants.toSorted((a, b) => b.effortOrder - a.effortOrder)[0]!,
  variants: variants.toSorted((a, b) => a.effortOrder - b.effortOrder),
}));
// Endpoint bars follow their parent model's selection, so the picker has one control per model.
export const families = allFamilies.filter(({ family }) => !endpointParents.has(family));
export const familyMap = new Map(families.map((family) => [family.family, family]));
const maxOnlyReasoningFamilies = new Set(
  allFamilies
    .filter(
      ({ variants }) =>
        variants.some((model) => model.effort === 'max') &&
        variants.every((model) => model.effort === 'max' || model.effort === 'none'),
    )
    .map(({ family }) => family),
);

const colors: Record<string, [string, string]> = {
  'gpt-6-astra': ['#303840', '#f1f3f5'],
  'gpt-6-1-sol': ['#586878', '#c5cbd3'],
  'gpt-6-1-sol-ultrafast': ['#586878', '#c5cbd3'],
  'gpt-6-luna': ['#748292', '#939daa'],
  'claude-opus-5-5': ['#ae5235', '#df9477'],
  'claude-fable-5-1': ['#903e2b', '#cc785c'],
  'claude-sonnet-5-5': ['#bd6948', '#f0b99f'],
  'claude-haiku-5-5': ['#c4805f', '#b98a74'],
  'gemini-4-argon': ['#218347', '#56ca80'],
  'gemini-3-8-flash': ['#247a3c', '#34a853'],
  'grok-4-7': ['#6d55bd', '#9b94ee'],
  'muse-wonder-full': ['#1d5aa8', '#4b96ff'],
  'muse-wonder': ['#3f7fc8', '#94c4ff'],
  'muse-spark-1-3': ['#236bbd', '#5ea4ff'],
  'kimi-k3': ['#ab3f83', '#ee86c4'],
  'glm-5-3': ['#8e7318', '#ecd36e'],
  'glm-5-3-flash': ['#7c6b2e', '#b9a453'],
  'deepseek-v4-pro': ['#157d83', '#52cdd2'],
  'deepseek-v4-1-flash': ['#216b70', '#33979c'],
  'mimo-v2-6-pro': ['#b85212', '#ff8b45'],
};
const labColors: Record<string, [string, string]> = {
  openai: ['#303840', '#f1f3f5'],
  anthropic: ['#ae5235', '#df9477'],
  google: ['#218347', '#56ca80'],
  xai: ['#6d55bd', '#9b94ee'],
  meta: ['#236bbd', '#5ea4ff'],
  kimi: ['#ab3f83', '#ee86c4'],
  zai: ['#8e7318', '#ecd36e'],
  deepseek: ['#157d83', '#52cdd2'],
  xiaomi: ['#b85212', '#ff8b45'],
};
export function modelColor(model: Model) {
  const [light, dark] = colors[model.family] ?? labColors[model.lab] ?? ['#637082', '#a4adb9'];
  return `light-dark(${light}, ${dark})`;
}
export function shortName(model: Model) {
  return model.name.replace(/^Claude /, '');
}
/** Null measurements stay absent from charts; they are never plotted as zero. */
export function visibleModels(selected: string[], excluded: string[]) {
  const selectedFamilies = new Set(selected);
  const excludedEfforts = new Set(excluded);
  return allModels.filter(
    (model) =>
      selectedFamilies.has(endpointParents.get(model.family) ?? model.family) &&
      (!excludedEfforts.has(model.effort) ||
        // Keep the only reasoning tier visible, even if a non-reasoning variant exists.
        (model.effort === 'max' && maxOnlyReasoningFamilies.has(model.family))),
  );
}

/** Keep configurations with a higher score than every better alternative for the metric. */
export function paretoFrontier(rows: Model[], metric: Metric) {
  const ordered = rows
    .filter((model) => model[metric] !== null && model.intelligence !== null)
    .toSorted(
      (a, b) =>
        (a[metric]! - b[metric]!) *
          (metric === 'speed' || metric === 'intelligence' || metric === 'omniscience' ? -1 : 1) ||
        b.intelligence! - a.intelligence!,
    );
  let best = -Infinity;
  return ordered.filter((model) => {
    if (model.intelligence! <= best) return false;
    best = model.intelligence!;
    return true;
  });
}

export function barGroups(rows: Model[], metric: Metric, grouped: boolean, descending: boolean) {
  const groups = new Map<string, Model[]>();
  for (const row of rows) {
    if (row[metric] === null) continue;
    const id = grouped ? row.family : row.id;
    const group = groups.get(id) ?? [];
    group.push(row);
    groups.set(id, group);
  }
  return [...groups]
    .map(([id, variants]) => ({
      id,
      rows: variants.toSorted((a, b) => a.effortOrder - b.effortOrder),
      maximum: Math.max(...variants.map((model) => model[metric]!)),
    }))
    .sort((a, b) => (a.maximum - b.maximum) * (descending ? -1 : 1));
}

// Intl construction dominates repeated chart formatting. There are only a few precision pairs.
const numberFormats = new Map<number, Intl.NumberFormat>();
function formatNumber(value: number, maximumFractionDigits: number, minimumFractionDigits = 0) {
  const key = maximumFractionDigits * 10 + minimumFractionDigits;
  let formatter = numberFormats.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-US', { maximumFractionDigits, minimumFractionDigits });
    numberFormats.set(key, formatter);
  }
  return formatter.format(value);
}

export function format(
  value: number | null,
  metric: Metric,
  compact = false,
): string {
  if (value === null) return 'Not measured';
  if (metric === 'time') {
    if (compact)
      return value < 60
        ? `${Math.round(value)}s`
        : value < 3600
          ? `${+(value / 60).toFixed(1)}m`
          : `${+(value / 3600).toFixed(1)}h`;
    const seconds = Math.round(value);
    return seconds < 60
      ? `${seconds}s`
      : seconds < 3600
        ? `${Math.floor(seconds / 60)}m ${seconds % 60}s`
        : `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  }
  if (metric === 'cost' || metric === 'costTotal') {
    if (compact && value >= 1000) return `$${+(value / 1000).toFixed(1)}k`;
    return (
      '$' +
      formatNumber(
        value,
        metric === 'costTotal' ? 0 : value < 1 ? 3 : 2,
        metric === 'cost' && !compact ? 2 : 0,
      )
    );
  }
  const unit =
    value >= 1e9
      ? ([1e9, 'B'] as const)
      : value >= 1e6
        ? ([1e6, 'M'] as const)
        : value >= 1e3
          ? ([1e3, 'k'] as const)
          : null;
  if (unit) return `${+(value / unit[0]).toFixed(compact ? 0 : 1)}${unit[1]}`;
  return formatNumber(value, metric === 'intelligence' || metric === 'omniscience' || !compact ? 1 : 0);
}

/** Distinguish local estimates wherever model measurements appear, including exports. */
export function formatModelValue(model: Model, metric: Metric, compact = false) {
  const value = format(model[metric], metric, compact);
  return metric === 'time' && model.time !== null && model.timeEstimate ? `~${value}` : value;
}

export const metricLabels: Record<Metric, string> = {
  cost: 'Cost per task',
  intelligence: 'Intelligence index',
  omniscience: 'AA-Omniscience Index',
  time: 'Time per task',
  tokens: 'Tokens per task',
  tokensTotal: 'Total tokens',
  costTotal: 'Total cost',
  speed: 'Output speed',
};
export const metricUnits: Record<Metric, string> = {
  cost: 'USD',
  intelligence: 'Intelligence index',
  omniscience: 'AA-Omniscience Index',
  time: 'decode time per task',
  tokens: 'output tokens',
  tokensTotal: 'output tokens, full index run',
  costTotal: 'USD, full index run',
  speed: 'output tokens/s',
};
