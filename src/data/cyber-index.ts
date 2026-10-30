import snapshot from 'virtual:benchmarks';
import source from './cyber-index.json';
import { effortGroup } from './efforts';
import type { Model } from './schema';

export const cyberSource = source;
const modelFamilies = new Map(snapshot.models.map((model) => [model.family, model]));

// Cyber costs belong to this workload, never to the Intelligence Index workload.
export const cyberModels: Model[] = source.configurations.map((configuration) => {
  const model = modelFamilies.get(configuration.family);
  return {
    id: `cyber-${configuration.id}`,
    family: configuration.family,
    name: configuration.trustedAccess
      ? `${configuration.configuration}, trusted access`
      : configuration.model,
    lab: configuration.lab,
    labName: configuration.labName,
    released: model?.released ?? null,
    open: model?.open ?? false,
    deprecated: model?.deprecated ?? false,
    effort: configuration.effort,
    effortLabel: configuration.effortLabel,
    effortOrder: configuration.effortOrder,
    intelligence: null,
    omniscience: null,
    terminalBench40: null,
    frontierCode20: null,
    cyberScore: configuration.indexScore,
    cost: configuration.cost,
    costTotal: null,
    tokens: null,
    tokensTotal: null,
    speed: null,
    time: null,
    cyber: {
      configuration: configuration.configuration,
      trustedAccess: configuration.trustedAccess,
      source: source.source,
    },
  };
});

const maxOnlyFamilies = new Set(cyberModels
  .filter((model) => model.effort === 'max')
  .map((model) => model.family)
  .filter((family) => cyberModels.every((model) => model.family !== family || model.effort === 'max')));

/** Retain the only measured Max tier, as in the other benchmark charts. */
export function visibleCyberModels(selected: string[], excluded: string[]) {
  const selectedFamilies = new Set(selected);
  const excludedEfforts = new Set(excluded.map(effortGroup));
  return cyberModels.filter((model) =>
    selectedFamilies.has(model.family) &&
    (!excludedEfforts.has(effortGroup(model.effort)) ||
      (model.effort === 'max' && maxOnlyFamilies.has(model.family))));
}
