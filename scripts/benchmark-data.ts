import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { subscriptionSchema } from '../src/data/subscription-schema.ts';
import { historySchema, modelFields, snapshotSchema } from '../src/data/schema.ts';

/** Store field names once and adjacent values together so the snapshot compresses better. */
export function benchmarkData(): Plugin {
  const moduleId = '\0virtual:benchmarks';
  const source = new URL('../src/data/benchmarks.json', import.meta.url);
  const historyId = '\0virtual:changelog';
  const historySource = new URL('../src/data/changelog.json', import.meta.url);
  return {
    name: 'benchmark-data',
    resolveId(id) {
      if (id === 'virtual:subscriptions') return '\0virtual:subscriptions';
      if (id === 'virtual:benchmarks') return moduleId;
      if (id === 'virtual:changelog') return historyId;
    },
    async load(id) {
      if (id === '\0virtual:subscriptions') {
        const source = new URL('../src/data/subscriptions.json', import.meta.url);
        this.addWatchFile(fileURLToPath(source));
        const data = subscriptionSchema.parse(JSON.parse(await readFile(source, 'utf8')));
        return `export default ${JSON.stringify(data)};`;
      }
      if (id === historyId) {
        this.addWatchFile(fileURLToPath(historySource));
        const history = historySchema.parse(JSON.parse(await readFile(historySource, 'utf8')));
        return `export default ${JSON.stringify(history)};`;
      }
      if (id !== moduleId) return;
      this.addWatchFile(fileURLToPath(source));
      const snapshot = snapshotSchema.parse(JSON.parse(await readFile(source, 'utf8')));
      const columns = modelFields.map((field) => snapshot.models.map((model) => model[field]));
      return `const fields = ${JSON.stringify(modelFields)};
        const columns = JSON.parse(${JSON.stringify(JSON.stringify(columns))});
        export default {
          fetchedAt: ${JSON.stringify(snapshot.fetchedAt)},
          codingSource: ${JSON.stringify(snapshot.codingSource)},
          models: columns[0].map((_, row) =>
            Object.fromEntries(fields.map((field, column) => [field, columns[column][row]])))
        };`;
    },
  };
}
