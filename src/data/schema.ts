type SnapshotModel = (typeof import('./benchmarks.json'))['models'][number];

// Only these snapshot fields are used by the app. Keep the original JSON for attribution.
export const modelFields = [
  'id',
  'family',
  'name',
  'lab',
  'labName',
  'released',
  'open',
  'deprecated',
  'effort',
  'effortLabel',
  'effortOrder',
  'intelligence',
  'cost',
  'costTotal',
  'tokens',
  'tokensTotal',
  'speed',
  'time',
] as const satisfies readonly (keyof SnapshotModel)[];

export type Model = Pick<SnapshotModel, (typeof modelFields)[number]>;
export type Snapshot = { fetchedAt: string; models: Model[] };
