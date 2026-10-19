import { mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
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

it.each([1, 2])('restores the original pair and cleans staging files when replacement %i fails', async (failure) => {
  const directory = await mkdtemp(join(tmpdir(), 'model-refresh-rollback-'));
  const snapshotPath = pathToFileURL(join(directory, 'benchmarks.json'));
  const historyPath = pathToFileURL(join(directory, 'changelog.json'));
  const { rows, fetcher } = sourceFixture([structuredClone(aaModels[0]!)]);
  const snapshot = await fetchSnapshot(fetcher);
  const originalSnapshot = JSON.stringify(snapshot);
  const originalHistory = JSON.stringify({
    source: snapshot.source,
    baselineFetchedAt: snapshot.fetchedAt,
    updates: [],
  });
  rows[0]!.release.name = 'Replacement update';
  const replacementError = new Error('Injected replacement failure');
  const renameFile = vi.fn<typeof rename>().mockImplementation(async (from, to) => {
    if (renameFile.mock.calls.length === failure) throw replacementError;
    await rename(from, to);
  });
  try {
    await writeFile(snapshotPath, originalSnapshot);
    await writeFile(historyPath, originalHistory);
    // A stale file from another invocation must not be overwritten or cleaned up.
    await writeFile(new URL(`${snapshotPath.href}.tmp`), 'unrelated staging file');
    const originalFiles = (await readdir(directory)).sort();
    const options = { snapshotPath, historyPath, fetcher, renameFile };

    await expect(refreshBenchmarks(options)).rejects.toBe(replacementError);
    expect(await readFile(snapshotPath, 'utf8')).toBe(originalSnapshot);
    expect(await readFile(historyPath, 'utf8')).toBe(originalHistory);
    expect((await readdir(directory)).sort()).toEqual(originalFiles);
    expect(await readFile(new URL(`${snapshotPath.href}.tmp`), 'utf8')).toBe('unrelated staging file');
    expect(renameFile).toHaveBeenCalledTimes(failure === 2 ? 3 : 1);

    const firstTemp = renameFile.mock.calls[0]![0];
    renameFile.mockClear();
    renameFile.mockImplementation(rename);
    await refreshBenchmarks(options);
    expect(renameFile.mock.calls[0]![0]).not.toEqual(firstTemp);
    expect(snapshotSchema.parse(JSON.parse(await readFile(snapshotPath, 'utf8'))).models[0]!.name)
      .toBe('Replacement update');
    expect(historySchema.parse(JSON.parse(await readFile(historyPath, 'utf8'))).updates).toHaveLength(1);
    expect((await readdir(directory)).sort()).toEqual(originalFiles);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

it('retains the original snapshot backup and reports both errors if rollback also fails', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'model-refresh-recovery-'));
  const snapshotPath = pathToFileURL(join(directory, 'benchmarks.json'));
  const historyPath = pathToFileURL(join(directory, 'changelog.json'));
  const { rows, fetcher } = sourceFixture([structuredClone(aaModels[0]!)]);
  const snapshot = await fetchSnapshot(fetcher);
  const originalSnapshot = JSON.stringify(snapshot);
  const originalHistory = JSON.stringify({
    source: snapshot.source,
    baselineFetchedAt: snapshot.fetchedAt,
    updates: [],
  });
  rows[0]!.release.name = 'Replacement update';
  const replacementError = new Error('Injected replacement failure');
  const rollbackError = new Error('Injected rollback failure');
  const renameFile = vi.fn<typeof rename>().mockImplementation(async (from, to) => {
    if (renameFile.mock.calls.length === 2) throw replacementError;
    if (renameFile.mock.calls.length === 3) throw rollbackError;
    await rename(from, to);
  });
  try {
    await writeFile(snapshotPath, originalSnapshot);
    await writeFile(historyPath, originalHistory);
    await expect(refreshBenchmarks({ snapshotPath, historyPath, fetcher, renameFile }))
      .rejects.toMatchObject({
        errors: [replacementError, rollbackError],
        message: expect.stringContaining('Original snapshot retained at'),
      });
    const backups = (await readdir(directory)).filter((file) => file.endsWith('.backup'));
    expect(backups).toHaveLength(1);
    expect(await readFile(join(directory, backups[0]!), 'utf8')).toBe(originalSnapshot);
    expect(await readFile(historyPath, 'utf8')).toBe(originalHistory);
    expect((await readdir(directory)).filter((file) => file.endsWith('.tmp'))).toEqual([]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
