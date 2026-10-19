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
  cost: 'Cost per task',
  costTotal: 'Total cost',
  tokens: 'Tokens per task',
  tokensTotal: 'Total tokens',
  speed: 'Output speed',
  time: 'Decode time per task',
  inputPrice: 'Input price per 1M tokens',
  outputPrice: 'Output price per 1M tokens',
  context: 'Context tokens',
} as const;

export type ChangeKind = 'added' | 'updated' | 'removed';
export type FieldChange = {
  field: keyof typeof fieldLabels;
  before: string | number | boolean | null;
  after: string | number | boolean | null;
};
export type ModelChange = {
  id: string;
  name: string;
  effortLabel: string;
  kind: ChangeKind;
  fields: FieldChange[];
};
export type ChangeBatch = {
  checkedAt: string;
  previousFetchedAt: string;
  fetchedAt: string;
  changes: ModelChange[];
};
export type ChangeHistory = {
  source: string;
  baselineFetchedAt: string;
  updates: ChangeBatch[];
};
