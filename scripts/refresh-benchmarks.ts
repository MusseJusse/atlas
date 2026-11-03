import { randomUUID } from 'node:crypto';
import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import {
  compareSnapshots,
  fetchSnapshot,
  historySchema,
  snapshotSchema,
  upstreamUrl,
} from './model-updates.ts';

const serialize = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

/** Validate both outputs before replacing either file. A failed check leaves the data untouched. */
export async function refreshBenchmarks({
  snapshotPath = new URL('../src/data/benchmarks.json', import.meta.url),
  historyPath = new URL('../src/data/changelog.json', import.meta.url),
  checkOnly = false,
  fetcher = fetch,
  renameFile = rename,
}: {
  snapshotPath?: URL;
  historyPath?: URL;
  checkOnly?: boolean;
  fetcher?: typeof fetch;
  renameFile?: typeof rename;
} = {}) {
  const checkedAt = new Date().toISOString();
  const originalSnapshot = await readFile(snapshotPath, 'utf8');
  const previous = snapshotSchema.parse(JSON.parse(originalSnapshot));
  const history = historySchema.parse(JSON.parse(await readFile(historyPath, 'utf8')));
  const latestHistory = history.updates[0]?.fetchedAt ?? history.baselineFetchedAt;
  if (latestHistory !== previous.fetchedAt)
    throw new Error('The changelog does not match the current snapshot. Stop any refresh process, then run pnpm data:recover.');
  const next = await fetchSnapshot(fetcher);
  const batch = compareSnapshots(previous, next, checkedAt);
  if (checkOnly || !batch.changes.length) return batch;

  const updatedHistory = historySchema.parse({
    ...history,
    source: upstreamUrl,
    updates: [batch, ...history.updates],
  });
  next.models.sort((a, b) => a.id.localeCompare(b.id, 'en'));
  const suffix = randomUUID();
  const snapshotTemp = new URL(`${snapshotPath.href}.${suffix}.tmp`);
  const historyTemp = new URL(`${historyPath.href}.${suffix}.tmp`);
  const snapshotBackup = new URL(`${snapshotPath.href}.${suffix}.backup`);
  let snapshotReplaced = false;
  let retainBackup = false;
  try {
    await writeFile(snapshotTemp, serialize(next), { flag: 'wx' });
    await writeFile(historyTemp, serialize(updatedHistory), { flag: 'wx' });
    await writeFile(snapshotBackup, originalSnapshot, { flag: 'wx' });
    // Recover from a rejected replacement. These two renames are not crash-atomic.
    await renameFile(snapshotTemp, snapshotPath);
    snapshotReplaced = true;
    await renameFile(historyTemp, historyPath);
  } catch (error) {
    if (snapshotReplaced) {
      try {
        await renameFile(snapshotBackup, snapshotPath);
      } catch (rollbackError) {
        retainBackup = true;
        throw new AggregateError(
          [error, rollbackError],
          `Could not restore the snapshot. Original snapshot retained at ${snapshotBackup.href}`,
        );
      }
    }
    throw error;
  } finally {
    await Promise.all(
      [snapshotTemp, historyTemp, ...(retainBackup ? [] : [snapshotBackup])].map((path) =>
        rm(path, { force: true }),
      ),
    );
  }
  return batch;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const batch = await refreshBenchmarks({ checkOnly: process.argv.includes('--check') });
  const counts = ['added', 'updated', 'removed']
    .map((kind) => `${batch.changes.filter((change) => change.kind === kind).length} ${kind}`)
    .join(', ');
  const summary = `Checked ${batch.checkedAt}\nUpstream snapshot: ${batch.fetchedAt}\n${counts}.\n`;
  console.log(summary);
}
