import { describe, expect, it, vi } from 'vitest';
import original from '../src/data/benchmarks.json';
import {
  compareSnapshots,
  extractModelManifest,
  fetchSnapshot,
  snapshotSchema,
  type BenchmarkSnapshot,
} from './model-updates';
import { aaModels, manifest, sourceFixture, sourceResponse } from './fixtures/aa-source';

const checkedAt = '2026-10-18T02:23:00.000Z';
const fixture = (): BenchmarkSnapshot =>
  snapshotSchema.parse({
    fetchedAt: '2026-10-13T20:47:14.735Z',
    models: Array.from({ length: 5 }, (_, index) => ({
      ...original.models[0],
      id: `model-${index}`,
      deprecated: false,
      intelligence: 20,
      cost: null,
      speed: null,
    })),
  });

describe('model updates', () => {
  it('ignores row order and snapshot metadata, including timestamp-only refreshes', () => {
    const previous = fixture();
    const next = {
      ...previous,
      fetchedAt: checkedAt,
      sourceHash: 'new',
      models: [...previous.models].reverse(),
    };
    expect(compareSnapshots(previous, next, checkedAt).changes).toEqual([]);
  });

  it('records additions, removals, null transitions, and metadata edits by ID', () => {
    const previous = fixture();
    const next = structuredClone(previous);
    next.models[0]!.name = 'Updated name';
    next.models[0]!.speed = 200;
    next.models[0]!.intelligence = null;
    next.models[0]!.deprecated = true;
    next.models[1]!.id = 'new-model';
    const batch = compareSnapshots(previous, next, checkedAt);
    expect(batch.changes.map(({ id, kind }) => ({ id, kind }))).toEqual([
      { id: 'model-0', kind: 'updated' },
      { id: 'model-1', kind: 'removed' },
      { id: 'new-model', kind: 'added' },
    ]);
    expect(batch.changes[0]?.fields).toEqual([
      { field: 'name', before: previous.models[0]!.name, after: 'Updated name' },
      { field: 'deprecated', before: false, after: true },
      { field: 'intelligence', before: previous.models[0]!.intelligence, after: null },
      { field: 'speed', before: null, after: 200 },
    ]);
    expect(batch.previousFetchedAt).toBe(previous.fetchedAt);
    expect(batch.checkedAt).toBe(checkedAt);
  });

  it('retains numeric precision and treats measured zero differently from missing data', () => {
    const previous = fixture();
    const next = structuredClone(previous);
    next.models[0]!.speed = 0;
    next.models[1]!.cost = 0.0000000000001;
    expect(compareSnapshots(previous, next, checkedAt).changes.map((change) => change.fields)).toEqual([
      [{ field: 'speed', before: null, after: 0 }],
      [{ field: 'cost', before: null, after: 0.0000000000001 }],
    ]);
  });

  it('rejects stale snapshots and unexpected mass removals', () => {
    const previous = fixture();
    expect(() =>
      compareSnapshots(previous, { ...previous, fetchedAt: '2026-01-01T00:00:00Z' }, checkedAt),
    ).toThrow('older');
    expect(() =>
      compareSnapshots(previous, { ...previous, models: previous.models.slice(0, 3) }, checkedAt),
    ).toThrow('20%');
    expect(
      compareSnapshots(previous, { ...previous, models: previous.models.slice(0, 4) }, checkedAt).changes[0]
        ?.kind,
    ).toBe('removed');
  });

  it('rejects invalid measurements, duplicate IDs, empty data, and missing fields', () => {
    const snapshot = fixture();
    expect(() => snapshotSchema.parse({ ...snapshot, models: [] })).toThrow();
    expect(() =>
      snapshotSchema.parse({ ...snapshot, models: [snapshot.models[0], snapshot.models[0]] }),
    ).toThrow('Duplicate');
    expect(() =>
      snapshotSchema.parse({ ...snapshot, models: [{ ...snapshot.models[0], cost: -1 }] }),
    ).toThrow();
    expect(() =>
      snapshotSchema.parse({ ...snapshot, models: [{ ...snapshot.models[0], speed: undefined }] }),
    ).toThrow();
  });
});

describe('direct Artificial Analysis import', () => {
  it('loads the complete public payload and preserves exact measurements and model identity', async () => {
    const { fetcher } = sourceFixture(structuredClone(aaModels));
    const snapshot = await fetchSnapshot(fetcher);
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      'https://artificialanalysis.ai/models',
      'https://artificialanalysis.ai/data/0123456789abcdef.txt',
    ]);
    expect(snapshot.source).toBe('https://artificialanalysis.ai/models');
    expect(snapshot.models[0]).toEqual({
      id: 'deepseek-v4-1-flash', family: 'deepseek-v4-1-flash', name: 'DeepSeek V4.1 Flash',
      variant: 'DeepSeek V4.1 Flash (max)', lab: 'deepseek', labName: 'DeepSeek',
      released: '2026-09-10', open: true, deprecated: false,
      effort: 'max', effortLabel: 'max', effortOrder: 60, estimated: false,
      intelligence: 39.456167472527, cost: 0.26522527009606844,
      costTotal: 476.89044593693893, tokens: 88573.99849468909, tokensTotal: 253113556,
      speed: 175.852558774099, time: 361.81506607584737,
      inputPrice: 0.3, outputPrice: 1.2, context: 1000000,
    });
  });

  it('preserves missing measurements and explicit effort on models without a suffix', async () => {
    const { fetcher } = sourceFixture(structuredClone(aaModels));
    const { models } = await fetchSnapshot(fetcher);
    expect(models[1]).toMatchObject({
      effort: 'none', effortLabel: 'Non-reasoning', effortOrder: 0,
      cost: null, costTotal: null, tokens: null, tokensTotal: null, speed: 51.790790075056, time: null,
      deprecated: true, estimated: true,
    });
    expect(models[2]).toMatchObject({ effort: 'high', effortOrder: 40 });
    const missingSpeed = sourceFixture([aaModels[0]!, { ...aaModels[1]!, timescaleData: {} }]);
    expect((await fetchSnapshot(missingSpeed.fetcher)).models[1]!.speed).toBeNull();
    const source = sourceFixture([{
      ...aaModels[0]!, effort: undefined, intelligenceIndex: 0, price1mInputTokens: 0,
      intelligenceIndexCost: { ...aaModels[0]!.intelligenceIndexCost!, total: 0 },
      timescaleData: { ...aaModels[0]!.timescaleData, medianOutputSpeed: 0 },
    }]);
    expect((await fetchSnapshot(source.fetcher)).models[0]).toMatchObject({
      effort: 'default', effortLabel: 'Default', effortOrder: 35,
      intelligence: 0, costTotal: 0, speed: 0, inputPrice: 0,
    });
  });

  it('reads split Flight records and ignores unrelated scripts without executing code', () => {
    const { html } = sourceResponse(aaModels);
    expect(extractModelManifest(`<script>throw new Error('must not run')</script>${html}`).manifest)
      .toEqual(manifest);
    expect(() => extractModelManifest('<script>self.__next_f.push(dangerous())</script>')).toThrow();
    expect(() => extractModelManifest(html + html)).toThrow('Expected one');
    expect(() => extractModelManifest(html.replace('/data/', 'https://other.example/data/')))
      .toThrow();
  });

  it('rejects HTTP errors, truncated payloads, incomplete catalogues, and invalid measurements', async () => {
    await expect(fetchSnapshot(vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 503 }))))
      .rejects.toThrow('503');
    for (const rows of [aaModels.slice(0, 1), [{ ...aaModels[0], price1mInputTokens: -1 }], []]) {
      const { html, payload } = sourceResponse(rows);
      const fetcher = vi.fn<typeof fetch>()
        .mockResolvedValueOnce(new Response(html)).mockResolvedValueOnce(new Response(payload));
      await expect(fetchSnapshot(fetcher)).rejects.toThrow();
    }
    const { html, payload } = sourceResponse(aaModels);
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(html))
      .mockResolvedValueOnce(new Response(payload.subarray(0, -1)));
    await expect(fetchSnapshot(fetcher)).rejects.toThrow();
    const missingCosts = sourceFixture([{ ...aaModels[0]!, intelligenceIndexCostPerTask: undefined }]);
    await expect(fetchSnapshot(missingCosts.fetcher)).rejects.toThrow('missing all cost');
    const duplicate = sourceFixture([aaModels[0]!, aaModels[0]!]);
    await expect(fetchSnapshot(duplicate.fetcher)).rejects.toThrow('Duplicate');
  });
});
