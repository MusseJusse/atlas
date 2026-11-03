import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { recoverBenchmarks } from './recover-benchmarks';
import { fetchSnapshot } from './model-updates';
import { aaModels, sourceFixture } from './fixtures/aa-source';

it('recovers an interrupted replacement, preserves staging files, and is safe to retry', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'benchmark-recover-'));
  const snapshotPath = pathToFileURL(join(directory, 'benchmarks.json'));
  const historyPath = pathToFileURL(join(directory, 'changelog.json'));
  const original = await fetchSnapshot(sourceFixture([structuredClone(aaModels[0]!)]).fetcher);
  const replaced = { ...original, fetchedAt: '2026-11-01T00:00:00.000Z' };
  const backupPath = new URL(`${snapshotPath.href}.interrupted.backup`);
  try {
    await writeFile(snapshotPath, JSON.stringify(replaced));
    await writeFile(historyPath, JSON.stringify({ source: original.source, baselineFetchedAt: original.fetchedAt, updates: [] }));
    await writeFile(backupPath, JSON.stringify(original));
    await writeFile(new URL(`${historyPath.href}.interrupted.tmp`), 'unfinished staging file');
    const options = { snapshotPath, historyPath };
    // Ambiguous backups must never cause an arbitrary restore.
    const duplicate = new URL(`${snapshotPath.href}.another.backup`);
    await writeFile(duplicate, JSON.stringify(original));
    await expect(recoverBenchmarks(options)).rejects.toThrow('found 2');
    expect(JSON.parse(await readFile(snapshotPath, 'utf8'))).toEqual(replaced);
    await rm(duplicate);
    expect(await recoverBenchmarks(options)).toBe(true);
    expect(JSON.parse(await readFile(snapshotPath, 'utf8'))).toEqual(original);
    expect(await recoverBenchmarks(options)).toBe(false);
    expect((await readdir(directory)).sort()).toEqual(['benchmarks.json', 'changelog.json', 'changelog.json.interrupted.tmp']);
    // Without a matching backup, do not invent history or accept an inconsistent pair.
    await writeFile(snapshotPath, JSON.stringify(replaced));
    await expect(recoverBenchmarks(options)).rejects.toThrow('found 0');
    expect(JSON.parse(await readFile(snapshotPath, 'utf8'))).toEqual(replaced);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
