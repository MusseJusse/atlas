import snapshot from './data/benchmarks.json';

type SnapshotModel = (typeof snapshot.models)[number];
export type Model = { [Key in keyof SnapshotModel]: SnapshotModel[Key] };
export type Metric = 'cost' | 'time' | 'tokens' | 'tokensTotal' | 'costTotal';
export type Family = { family: string; model: Model; variants: Model[] };

export const models: Model[] = snapshot.models;
export const fetchedAt = snapshot.fetchedAt;
export const views = [
  { id: 'cost-intelligence', label: 'Cost vs intelligence', metric: 'cost', scatter: true },
  { id: 'speed-intelligence', label: 'Time per task vs intelligence', metric: 'time', scatter: true },
  { id: 'tokens-task', label: 'Tokens per task', metric: 'tokens', scatter: false },
  { id: 'tokens-total', label: 'Total tokens', metric: 'tokensTotal', scatter: false },
  { id: 'cost-task', label: 'Cost per task', metric: 'cost', scatter: false },
  { id: 'cost-total', label: 'Total cost', metric: 'costTotal', scatter: false },
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
  'gemini-3-8-flash',
  'grok-4-7',
  'muse-wonder-full',
  'muse-wonder',
];
export const notableFamilies = [
  'muse-spark-1-3',
  'kimi-k3',
  'glm-5-3-flash',
  'glm-5-3',
  'deepseek-v4-1-flash',
  'deepseek-v4-pro',
  'mimo-v2-6-pro',
];
export const defaultSelected = frontierFamilies.filter(
  (id) => !['claude-sonnet-5-5', 'gemini-3-8-flash'].includes(id),
);
export const efforts = ['none', 'low', 'medium', 'high', 'xhigh', 'max'];

const byFamily = new Map<string, Model[]>();
for (const model of models) {
  const variants = byFamily.get(model.family) ?? [];
  variants.push(model);
  byFamily.set(model.family, variants);
}
export const families: Family[] = [...byFamily].map(([family, variants]) => ({
  family,
  model: variants.toSorted((a, b) => b.effortOrder - a.effortOrder)[0]!,
  variants: variants.toSorted((a, b) => a.effortOrder - b.effortOrder),
}));
export const familyMap = new Map(families.map((family) => [family.family, family]));

const colors: Record<string, [string, string]> = {
  'gpt-6-astra': ['#303840', '#f1f3f5'],
  'gpt-6-1-sol': ['#586878', '#c5cbd3'],
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
export function tier(family: string) {
  if (['gpt-6-luna', 'claude-haiku-5-5'].includes(family)) return 'Small';
  if (['gpt-6-1-sol', 'claude-sonnet-5-5', 'gemini-3-8-flash'].includes(family)) return 'Medium';
  return 'Large';
}

/** Null measurements stay absent from charts; they are never plotted as zero. */
export function visibleModels(selected: string[], excluded: string[]) {
  return models.filter((model) => selected.includes(model.family) && !excluded.includes(model.effort));
}

/** Keep only configurations with a higher score than every cheaper/faster one. */
export function paretoFrontier(rows: Model[], metric: Metric) {
  const ordered = rows
    .filter((model) => model[metric] !== null && model.intelligence !== null)
    .toSorted((a, b) => a[metric]! - b[metric]! || b.intelligence! - a.intelligence!);
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

export function format(
  value: number | null,
  metric: Metric | 'intelligence' | 'speed',
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
      value.toLocaleString('en-US', {
        maximumFractionDigits: metric === 'costTotal' ? 0 : value < 1 ? 3 : 2,
        minimumFractionDigits: metric === 'cost' && !compact ? 2 : 0,
      })
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
  return value.toLocaleString('en-US', {
    maximumFractionDigits: metric === 'intelligence' || !compact ? 1 : 0,
  });
}

export const metricLabels: Record<Metric, string> = {
  cost: 'Cost per task',
  time: 'Time per task',
  tokens: 'Tokens per task',
  tokensTotal: 'Total tokens',
  costTotal: 'Total cost',
};
export const metricUnits: Record<Metric, string> = {
  cost: 'USD',
  time: 'seconds',
  tokens: 'output tokens',
  tokensTotal: 'output tokens, full index run',
  costTotal: 'USD, full index run',
};
