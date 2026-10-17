import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { modelFields, type Snapshot } from '../src/data/schema.ts';

/** Store field names once and adjacent values together so the snapshot compresses better. */
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
      const columns = modelFields.map((field) => snapshot.models.map((model) => model[field]));
      return `const fields = ${JSON.stringify(modelFields)};
        const columns = JSON.parse(${JSON.stringify(JSON.stringify(columns))});
        export default {
          fetchedAt: ${JSON.stringify(snapshot.fetchedAt)},
          models: columns[0].map((_, row) =>
            Object.fromEntries(fields.map((field, column) => [field, columns[column][row]])))
        };`;
    },
  };
}
