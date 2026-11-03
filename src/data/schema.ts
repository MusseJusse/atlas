import { z } from 'zod';
import type { TaskPricing } from './subscriptions.ts';

const text = z.string().min(1);
const measurement = z.number().nonnegative().nullable();
export const modelSchema = z.strictObject({
  id: text,
  family: text,
  name: text,
  variant: text,
  lab: text,
  labName: text,
  released: z.iso.date().nullable(),
  open: z.boolean(),
  deprecated: z.boolean(),
  effort: text,
  effortLabel: text,
  effortOrder: z.number().nonnegative(),
  intelligence: z.number().nullable(),
  omniscience: z.number().min(-100).max(100).nullable().default(null),
  terminalBench40: z.number().min(0).max(1).nullable().default(null),
  frontierCode20: z.number().min(0).max(1).nullable().default(null),
  codingCost: measurement.default(null),
  codingTokens: measurement.default(null),
  codingTime: measurement.default(null),
  codingTokensTotal: measurement.default(null),
  codingCostTotal: measurement.default(null),
  cost: measurement,
  costTotal: measurement,
  tokens: measurement,
  tokensTotal: measurement,
  speed: measurement,
  time: measurement,
  inputPrice: measurement,
  outputPrice: measurement,
  context: measurement,
});
export const snapshotSchema = z
  .object({
    fetchedAt: z.iso.datetime(),
    source: z.url().optional(),
    sourceHash: text.optional(),
    codingSource: z.object({ fetchedAt: z.iso.datetime(), sourceHash: text }).optional(),
    models: z.array(modelSchema).nonempty(),
  })
  .superRefine(({ models }, ctx) => {
    if (new Set(models.map((model) => model.id)).size !== models.length)
      ctx.addIssue({ code: 'custom', message: 'Duplicate model IDs in the snapshot.' });
  });
export type BenchmarkSnapshot = z.infer<typeof snapshotSchema>;
export type SnapshotModel = z.infer<typeof modelSchema>;

const changeValue = z.union([z.string(), z.number(), z.boolean(), z.null()]);
export const historySchema = z.strictObject({
  source: z.url(),
  baselineFetchedAt: z.iso.datetime(),
  updates: z.array(
    z.strictObject({
      checkedAt: z.iso.datetime(),
      previousFetchedAt: z.iso.datetime(),
      fetchedAt: z.iso.datetime(),
      changes: z.array(
        z.strictObject({
          id: text,
          name: text,
          effortLabel: text,
          kind: z.enum(['added', 'updated', 'removed']),
          fields: z.array(
            z.strictObject({
              field: modelSchema.keyof(),
              before: changeValue,
              after: changeValue,
            }),
          ),
        }),
      ),
    }),
  ),
});

export type ChangeHistory = z.infer<typeof historySchema>;
export type ChangeBatch = ChangeHistory['updates'][number];
export type ModelChange = ChangeBatch['changes'][number];
export type ChangeKind = ModelChange['kind'];
export type FieldChange = ModelChange['fields'][number];

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
  'omniscience',
  'terminalBench40',
  'frontierCode20',
  'codingCost',
  'codingTokens',
  'codingTime',
  'codingTokensTotal',
  'codingCostTotal',
  'cost',
  'inputPrice',
  'outputPrice',
  'costTotal',
  'tokens',
  'tokensTotal',
  'speed',
  'time',
] as const satisfies readonly (keyof SnapshotModel)[];

export type Model = Pick<SnapshotModel, (typeof modelFields)[number]> & {
  taskPricing?: TaskPricing;
  codingIndex?: number | null;
  codingScore?: number | null;
  codingAgent?: { name: string; configuration: string; source: string };
  cyberScore?: number | null;
  cyber?: { configuration: string; trustedAccess: boolean; source: string };
  speedSource?: { url: string; fetchedAt: string };
  timeEstimate?: {
    baselineModelId: string;
    baselineTokens: number;
    baselineFetchedAt: string;
  };
};
export type Snapshot = Pick<BenchmarkSnapshot, 'fetchedAt' | 'codingSource' | 'sourceHash'> & { models: Model[] };
