import { readFile, rename, writeFile } from 'node:fs/promises';
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
}: { snapshotPath?: URL; historyPath?: URL; checkOnly?: boolean; fetcher?: typeof fetch } = {}) {
  const checkedAt = new Date().toISOString();
  const previous = snapshotSchema.parse(JSON.parse(await readFile(snapshotPath, 'utf8')));
  const history = historySchema.parse(JSON.parse(await readFile(historyPath, 'utf8')));
  const next = await fetchSnapshot(fetcher);
  const batch = compareSnapshots(previous, next, checkedAt);
  if (checkOnly || !batch.changes.length) return batch;

  const latestHistory = history.updates[0]?.fetchedAt ?? history.baselineFetchedAt;
  if (latestHistory !== previous.fetchedAt)
    throw new Error('The changelog does not match the current snapshot.');
  const updatedHistory = historySchema.parse({
    ...history,
    source: upstreamUrl,
    updates: [batch, ...history.updates],
  });
  next.models.sort((a, b) => a.id.localeCompare(b.id, 'en'));
  const snapshotTemp = new URL(`${snapshotPath.href}.tmp`);
  const historyTemp = new URL(`${historyPath.href}.tmp`);
  await writeFile(snapshotTemp, serialize(next));
  await writeFile(historyTemp, serialize(updatedHistory));
  await rename(snapshotTemp, snapshotPath);
  await rename(historyTemp, historyPath);
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
