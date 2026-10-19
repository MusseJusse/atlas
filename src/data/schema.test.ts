import { expect, it } from 'vitest';
import snapshot from './benchmarks.json';
import history from './changelog.json';
import { fieldLabels } from './changelog';
import { efforts } from './efforts';
import { historySchema, modelSchema, snapshotSchema } from './schema';

it('validates the complete bundled data without changing values or precision', () => {
  expect(snapshotSchema.parse(snapshot)).toEqual(snapshot);
  expect(historySchema.parse(history)).toEqual(history);
  expect(Object.keys(fieldLabels).sort()).toEqual(modelSchema.keyof().options.toSorted());
});

it('covers every current effort and accepts future efforts and nullable releases', () => {
  expect(new Set(efforts)).toEqual(new Set(snapshot.models.map((model) => model.effort)));
  expect(
    modelSchema.parse({
      ...snapshot.models[0],
      released: null,
      effort: 'future-effort',
      effortLabel: 'Future effort',
      effortOrder: 70,
    }),
  ).toMatchObject({ released: null, effort: 'future-effort', effortOrder: 70 });
});

it('validates history fields against the model schema and preserves scalar values', () => {
  const batch = history.updates[0]!;
  const change = batch.changes[0]!;
  const withField = (field: string) => ({
    ...history,
    updates: [
      {
        ...batch,
        changes: [
          {
            ...change,
            kind: 'updated',
            fields: [{ field, before: null, after: -5.316666666666666 }],
          },
        ],
      },
    ],
  });
  expect(historySchema.parse(withField('omniscience')).updates[0]?.changes[0]?.fields).toEqual([
    { field: 'omniscience', before: null, after: -5.316666666666666 },
  ]);
  expect(() => historySchema.parse(withField('unknown-field'))).toThrow();
  expect(() => historySchema.parse({ ...history, baselineFetchedAt: 'yesterday' })).toThrow();
});
