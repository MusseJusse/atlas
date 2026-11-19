import snapshot from 'virtual:benchmarks';
import source from './coding-agents.json';
import { effortGroup } from './efforts';
import type { Model } from './schema';

export const codingAgentSource = source;
const modelFamilies = new Map(snapshot.models.map((model) => [model.family, model]));
const effortOrder = new Map<string, number>([
  ['default', 0], ['low', 20], ['medium', 30], ['high', 40], ['xhigh', 50], ['max', 60],
]);

// Agent measurements come from their own workload. Never copy model benchmark measurements.
export const codingAgents: Model[] = source.configurations.map((configuration) => {
  const model = modelFamilies.get(configuration.family);
  return {
    id: `coding-${configuration.id}`,
    family: configuration.family,
    name: model?.name ?? configuration.model,
    lab: model?.lab ?? configuration.lab,
    labName: model?.labName ?? configuration.labName,
    released: model?.released ?? null,
    open: model?.open ?? false,
    deprecated: model?.deprecated ?? false,
    effort: configuration.effort,
    // Lowercase, like the benchmark data's reasoning levels.
    effortLabel: configuration.effort === 'default' ? 'default settings' : configuration.effort,
    effortOrder: effortOrder.get(configuration.effort) ?? 0,
    intelligence: null,
    omniscience: null,
    codingScore: configuration.indexScore === null ? null : configuration.indexScore * 100,
    cost: configuration.cost,
    inputPrice: null,
    outputPrice: null,
    costTotal: null,
    tokens: null,
    tokensTotal: null,
    speed: null,
    time: null,
    codingAgent: {
      name: configuration.agent,
      configuration: configuration.configuration,
      source: source.source,
    },
  };
});

const maxOnlyFamilies = new Set(codingAgents
  .filter((model) => model.effort === 'max')
  .map((model) => model.family)
  .filter((family) => codingAgents.every((model) => model.family !== family || model.effort === 'max')));

/** Use the model picker, retaining a family's only measured reasoning tier like model charts. */
export function visibleCodingAgents(selected: string[], excluded: string[]) {
  const selectedFamilies = new Set(selected);
  const excludedEfforts = new Set(excluded);
  return codingAgents.filter((model) =>
    selectedFamilies.has(model.family) &&
    (!excludedEfforts.has(effortGroup(model.effort)) ||
      (model.effort === 'max' && maxOnlyFamilies.has(model.family))));
}
