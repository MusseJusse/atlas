import { readFile, readdir, rename } from 'node:fs/promises';
import { basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { historySchema, snapshotSchema } from '../src/data/schema.ts';

/** Restore the pre-refresh snapshot after interruption between the two output renames.
 * Run only after the refresh process has stopped. Unrelated staging files stay untouched.
 */
export async function recoverBenchmarks({
  snapshotPath = new URL('../src/data/benchmarks.json', import.meta.url),
  historyPath = new URL('../src/data/changelog.json', import.meta.url),
}: { snapshotPath?: URL; historyPath?: URL } = {}) {
  const history = historySchema.parse(JSON.parse(await readFile(historyPath, 'utf8')));
  const expected = history.updates[0]?.fetchedAt ?? history.baselineFetchedAt;
  const snapshot = snapshotSchema.parse(JSON.parse(await readFile(snapshotPath, 'utf8')));
  if (snapshot.fetchedAt === expected) return false;

  const directory = new URL('.', snapshotPath);
  const prefix = `${basename(fileURLToPath(snapshotPath))}.`;
  const backups: URL[] = [];
  for (const name of await readdir(directory)) {
    if (!name.startsWith(prefix) || !name.endsWith('.backup')) continue;
    const backup = new URL(encodeURIComponent(name), directory);
    const parsed = snapshotSchema.safeParse(JSON.parse(await readFile(backup, 'utf8')));
    if (parsed.success && parsed.data.fetchedAt === expected) backups.push(backup);
  }
  if (backups.length !== 1)
    throw new Error(`Expected one snapshot backup matching changelog ${expected}, found ${backups.length}. Restore the data pair from Git together.`);
  await rename(backups[0]!, snapshotPath);
  return true;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const restored = await recoverBenchmarks();
  console.log(restored ? 'Restored the snapshot to match the changelog. Retry the refresh.' : 'Snapshot and changelog already match.');
}
