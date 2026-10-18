import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it, vi } from 'vitest';
import { refreshBenchmarks } from './refresh-benchmarks';
import { historySchema, snapshotSchema, fetchSnapshot } from './model-updates';
import { aaModels, sourceFixture } from './fixtures/aa-source';

it('writes paired data and history once, leaves dry runs and failures untouched, and keeps prior history', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'model-refresh-'));
  const snapshotPath = pathToFileURL(join(directory, 'benchmarks.json'));
  const historyPath = pathToFileURL(join(directory, 'changelog.json'));
  const { rows: next, fetcher } = sourceFixture([structuredClone(aaModels[0]!)]);
  const initialSnapshot = { ...await fetchSnapshot(fetcher), fetchedAt: '2026-10-13T20:47:14.735Z' };
  const history = {
    source: 'https://slopalytics.com/',
    baselineFetchedAt: initialSnapshot.fetchedAt,
    updates: [],
  };
  next[0]!.release.name = 'First update';
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
    expect(historySchema.parse(JSON.parse(first[1]!)).source).toBe('https://artificialanalysis.ai/models');
    await refreshBenchmarks(options);
    expect(await contents()).toEqual(first);

    next[0]!.release.name = 'Second update';
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
    next.splice(0);
    await expect(refreshBenchmarks(options)).rejects.toThrow();
    expect(await contents()).toEqual(second);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
