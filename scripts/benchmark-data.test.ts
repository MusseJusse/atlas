import { readFile } from 'node:fs/promises';
import { build } from 'vite';
import { afterEach, expect, it, vi } from 'vitest';
import snapshot from '../src/data/benchmarks.json';
import history from '../src/data/changelog.json';
import { benchmarkData } from './benchmark-data';

vi.mock('node:fs/promises', () => ({ readFile: vi.fn() }));
afterEach(() => vi.resetAllMocks());

const bundle = (input: string) =>
  build({
    configFile: false,
    logLevel: 'silent',
    plugins: [benchmarkData()],
    build: { write: false, rollupOptions: { input, preserveEntrySignatures: 'strict' } },
  });

it('rejects invalid bundled snapshots at the build boundary', async () => {
  vi.mocked(readFile).mockResolvedValue(JSON.stringify({ ...snapshot, models: [] }));
  await expect(bundle('virtual:benchmarks')).rejects.toThrow();
});

it('rejects invalid bundled history at the build boundary', async () => {
  vi.mocked(readFile).mockResolvedValue(JSON.stringify({ ...history, updates: [{ changes: [] }] }));
  await expect(bundle('virtual:changelog')).rejects.toThrow();
});

it('emits validated history as data without the runtime validator', async () => {
  vi.mocked(readFile).mockResolvedValue(JSON.stringify(history));
  const result = await bundle('virtual:changelog');
  if (Array.isArray(result) || !('output' in result)) throw new Error('Expected a single bundle.');
  const chunk = result.output.find((entry) => entry.type === 'chunk');
  expect(chunk?.moduleIds).toEqual(['\0virtual:changelog']);
  expect(chunk?.code).toContain(history.baselineFetchedAt);
});
