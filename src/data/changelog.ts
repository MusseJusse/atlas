import type { SnapshotModel } from './schema';

export type { ChangeKind, FieldChange, ModelChange, ChangeBatch, ChangeHistory } from './schema';

export const fieldLabels = {
  id: 'Model ID',
  family: 'Model family',
  name: 'Name',
  variant: 'Variant',
  lab: 'Lab ID',
  labName: 'Lab',
  released: 'Release date',
  open: 'Open weights',
  deprecated: 'Deprecated',
  effort: 'Reasoning ID',
  effortLabel: 'Reasoning',
  effortOrder: 'Reasoning order',
  estimated: 'Estimated',
  intelligence: 'Intelligence',
  omniscience: 'AA-Omniscience',
  terminalBench40: 'Terminal-Bench 4.0',
  frontierCode20: 'FrontierCode 2.0',
  cost: 'Cost per task',
  costTotal: 'Total cost',
  tokens: 'Tokens per task',
  tokensTotal: 'Total tokens',
  speed: 'Output speed',
  time: 'Decode time per task',
  inputPrice: 'Input price per 1M tokens',
  outputPrice: 'Output price per 1M tokens',
  context: 'Context tokens',
} as const satisfies Record<keyof SnapshotModel, string>;
