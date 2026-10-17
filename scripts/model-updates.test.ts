import { describe, expect, it, vi } from 'vitest';
import original from '../src/data/benchmarks.json';
import {
  compareSnapshots,
  extractSnapshots,
  fetchSnapshot,
  snapshotSchema,
  type BenchmarkSnapshot,
} from './model-updates';

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

describe('upstream snapshot extraction', () => {
  it('reads minified literals and template strings without executing the bundle', () => {
    const snapshot = fixture();
    const data = JSON.stringify(snapshot)
      .replace(/true/g, '!0')
      .replace(/false/g, '!1')
      .replace('"model-0"', '`model-0`');
    expect(extractSnapshots(`throw new Error('must not run'); const renamed = ${data};`)).toEqual([snapshot]);
  });

  it('rejects executable values and interpolated strings inside snapshot data', () => {
    const data = JSON.stringify(fixture());
    expect(() => extractSnapshots(`const data=${data.replace('"model-0"', 'dangerous()')};`)).toThrow(
      'CallExpression',
    );
    expect(() =>
      extractSnapshots(`const data=${data.replace('"model-0"', '`model-${dangerous()}`')};`),
    ).toThrow('TemplateLiteral');
  });

  it('discovers the current hashed module filename from HTML', async () => {
    const snapshot = fixture();
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response('<script type="module" crossorigin src="/assets/index-new-hash.js"></script>'),
      )
      .mockResolvedValueOnce(new Response(`const data=${JSON.stringify(snapshot)}`));
    expect(await fetchSnapshot(fetcher)).toEqual(snapshot);
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      'https://slopalytics.com/',
      'https://slopalytics.com/assets/index-new-hash.js',
    ]);
  });

  it('fails on HTTP errors, cross-origin scripts, missing snapshots, and ambiguous snapshots', async () => {
    await expect(
      fetchSnapshot(vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 503 }))),
    ).rejects.toThrow('503');
    await expect(
      fetchSnapshot(
        vi
          .fn<typeof fetch>()
          .mockResolvedValue(
            new Response('<script type="module" src="https://other.example/index.js"></script>'),
          ),
      ),
    ).rejects.toThrow('origin');
    for (const data of [
      'const empty = {};',
      `const a=${JSON.stringify(fixture())}; const b=${JSON.stringify(fixture())};`,
    ]) {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(new Response('<script type="module" src="/index.js"></script>'))
        .mockResolvedValueOnce(new Response(data));
      await expect(fetchSnapshot(fetcher)).rejects.toThrow('Expected one');
    }
  });
});
