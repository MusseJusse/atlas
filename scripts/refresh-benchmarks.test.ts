import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it, vi } from 'vitest';
import snapshot from '../src/data/benchmarks.json';
import { refreshBenchmarks } from './refresh-benchmarks';
import { historySchema, snapshotSchema } from './model-updates';

it('writes paired data and history once, leaves dry runs and failures untouched, and keeps prior history', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'model-refresh-'));
  const snapshotPath = pathToFileURL(join(directory, 'benchmarks.json'));
  const historyPath = pathToFileURL(join(directory, 'changelog.json'));
  const initialSnapshot = { ...snapshot, fetchedAt: '2026-10-13T20:47:14.735Z' };
  const history = {
    source: 'https://slopalytics.com/',
    baselineFetchedAt: initialSnapshot.fetchedAt,
    updates: [],
  };
  const next = structuredClone(initialSnapshot);
  next.fetchedAt = '2026-10-17T02:17:00.000Z';
  next.models[0]!.name = 'First update';
  const fetcher = vi
    .fn<typeof fetch>()
    .mockImplementation(
      async (url) =>
        new Response(
          String(url).endsWith('.js')
            ? `const data=${JSON.stringify(next)}`
            : '<script type="module" src="/index.js"></script>',
        ),
    );
  const options = { snapshotPath, historyPath, fetcher };
  const contents = async () => [await readFile(snapshotPath, 'utf8'), await readFile(historyPath, 'utf8')];
  try {
    await writeFile(snapshotPath, JSON.stringify(initialSnapshot));
    await writeFile(historyPath, JSON.stringify(history));
    const initial = await contents();
    await refreshBenchmarks({ ...options, checkOnly: true });
    expect(await contents()).toEqual(initial);
    await refreshBenchmarks(options);
    const first = await contents();
    expect(snapshotSchema.parse(JSON.parse(first[0]!)).models[0]!.name).toBe('First update');
    expect(historySchema.parse(JSON.parse(first[1]!)).updates).toHaveLength(1);
    await refreshBenchmarks(options);
    expect(await contents()).toEqual(first);

    next.fetchedAt = '2026-10-18T02:17:00.000Z';
    next.models[0]!.name = 'Second update';
    await refreshBenchmarks(options);
    const second = await contents();
    expect(
      historySchema.parse(JSON.parse(second[1]!)).updates.map((batch) => batch.changes[0]!.fields[0]!.after),
    ).toEqual(['Second update', 'First update']);

    await expect(
      refreshBenchmarks({
        ...options,
        fetcher: vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 503 })),
      }),
    ).rejects.toThrow('503');
    expect(await contents()).toEqual(second);
    next.models = [];
    await expect(refreshBenchmarks(options)).rejects.toThrow();
    expect(await contents()).toEqual(second);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
