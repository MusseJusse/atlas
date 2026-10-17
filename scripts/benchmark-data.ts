import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { modelFields, type Snapshot } from '../src/data/schema.ts';

/** Store field names once instead of repeating them for every configuration. */
export function benchmarkData(): Plugin {
  const moduleId = '\0virtual:benchmarks';
  const source = new URL('../src/data/benchmarks.json', import.meta.url);
  return {
    name: 'benchmark-data',
    resolveId(id) {
      if (id === 'virtual:benchmarks') return moduleId;
    },
    async load(id) {
      if (id !== moduleId) return;
      this.addWatchFile(fileURLToPath(source));
      const snapshot: Snapshot = JSON.parse(await readFile(source, 'utf8'));
      const rows = snapshot.models.map((model) => modelFields.map((field) => model[field]));
      return `const fields = ${JSON.stringify(modelFields)};
        export default {
          fetchedAt: ${JSON.stringify(snapshot.fetchedAt)},
          models: JSON.parse(${JSON.stringify(JSON.stringify(rows))}).map(values =>
            Object.fromEntries(fields.map((field, index) => [field, values[index]])))
        };`;
    },
  };
}
