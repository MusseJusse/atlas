import snapshot from 'virtual:benchmarks';
import type { Model } from './data/schema';
import { speedEndpoints } from './data/speed-endpoints';
import { codingAgents } from './data/coding-agents';
import { cyberModels } from './data/cyber-index';
import { filterReasoning } from './data/efforts';
export type { Model } from './data/schema';
import { metrics, type Metric } from './chart-definitions';
export { views, type Metric, type View, type ViewId } from './chart-definitions';
export type Family = { family: string; model: Model; variants: Model[] };

export const models: Model[] = snapshot.models;
const allModels: Model[] = [...models, ...speedEndpoints];
const endpointParents = new Map(
  speedEndpoints.map((endpoint) => [endpoint.family, endpoint.parentFamily]),
);
export const fetchedAt = snapshot.fetchedAt;
export const codingFetchedAt = snapshot.codingSource?.fetchedAt ?? fetchedAt;
export { efforts } from './data/efforts';

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
export const families = [
  ...allFamilies.filter(({ family }) => !endpointParents.has(family)).map((family) => {
    const trusted = cyberModels.find((model) => model.family === family.family && model.cyber?.trustedAccess);
    return trusted ? { ...family, model: { ...family.model, name: trusted.name } } : family;
  }),
  ...new Map([...codingAgents, ...cyberModels]
    .filter((model) => !byFamily.has(model.family))
    .map((model) => [model.family, { family: model.family, model, variants: [model] }])).values(),
];
export const familyMap = new Map(families.map((family) => [family.family, family]));
/** Null measurements stay absent from charts; they are never plotted as zero. */
export function visibleModels(selected: string[], excluded: string[]) {
  const selectedFamilies = new Set(selected);
  return filterReasoning(allModels.filter((model) =>
    selectedFamilies.has(endpointParents.get(model.family) ?? model.family)), excluded);
}

/** Keep configurations with a higher score than every better alternative for the metric. */
export function paretoFrontier<Row extends Model>(
  rows: Row[],
  metric: Metric,
  score: (row: Row) => number | null | undefined = (row) => row.intelligence,
) {
  const ordered = rows
    .filter((model) => model[metric] != null && score(model) != null)
    .toSorted(
      (a, b) =>
        (a[metric]! - b[metric]!) *
          (metrics[metric].higherIsBetter ? -1 : 1) ||
        score(b)! - score(a)!,
    );
  let best = -Infinity;
  return ordered.filter((model) => {
    if (score(model)! <= best) return false;
    best = score(model)!;
    return true;
  });
}

export function barGroups<Row extends Model>(
  rows: Row[],
  metric: Metric,
  grouped: boolean,
  descending: boolean,
  sortBy: 'minimum' | 'maximum' = 'maximum',
) {
  const groups = new Map<string, Row[]>();
  for (const row of rows) {
    if (row[metric] == null) continue;
    const id = grouped ? row.family : row.id;
    const group = groups.get(id) ?? [];
    group.push(row);
    groups.set(id, group);
  }
  return [...groups]
    .map(([id, variants]) => ({
      id,
      rows: variants.toSorted((a, b) => a.effortOrder - b.effortOrder),
      minimum: Math.min(...variants.map((model) => model[metric]!)),
      maximum: Math.max(...variants.map((model) => model[metric]!)),
    }))
    .sort((a, b) => (a[sortBy] - b[sortBy]) * (descending ? -1 : 1));
}
