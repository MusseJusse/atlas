import { createDecipheriv, createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { z } from 'zod';
import {
  modelSchema,
  snapshotSchema,
  type BenchmarkSnapshot,
  type ChangeBatch,
  type FieldChange,
} from '../src/data/schema.ts';

// Keep the importer API available to the refresh and sync commands.
export { modelSchema, snapshotSchema, historySchema } from '../src/data/schema.ts';
export type { BenchmarkSnapshot } from '../src/data/schema.ts';

import { codingWorkload } from '../src/data/coding-only.ts';

const text = z.string().min(1);
const measurement = z.number().nonnegative().nullable();

export const upstreamUrl = 'https://artificialanalysis.ai/models';
const maxSourceBytes = 20_000_000;
const manifestSchema = z.object({
  path: z.string().regex(/^\/data\/[a-f0-9]+\.txt$/),
  key: z.string().regex(/^[a-f0-9]{64}$/),
});
const catalogueSchema = z.object({
  models: z.array(z.object({ slug: text })).nonempty(),
});
const aaModelSchema = z.object({
  slug: text,
  shortName: text,
  release: z.object({ slug: text, name: text }),
  creator: z.object({ slug: text, name: text }),
  releaseDate: z.iso.date().nullable(),
  isOpenWeights: z.boolean(),
  deprecated: z.boolean(),
  isReasoning: z.boolean(),
  effort: z.object({ slug: text, label: text, level: z.number().nonnegative() }).optional(),
  intelligenceIndex: z.number().nullable(),
  omniscience: z.number().min(-100).max(100).nullable(),
  terminalBench40: z.number().min(0).max(1).nullable(),
  frontierCode20: z.number().min(0).max(1).nullable(),
  intelligenceIndexEvaluations: z.array(z.object({
    slug: text,
    costPerTask: measurement.nullish(),
    outputTokensPerTask: measurement.nullish(),
    timePerTask: measurement.nullish(),
  })).refine((evaluations) => new Set(evaluations.map((evaluation) => evaluation.slug)).size === evaluations.length,
    'Duplicate evaluation slugs.'),
  intelligenceIndexCost: z.object({ total: measurement }).nullish(),
  intelligenceIndexCostPerTask: z.object({ cost: z.object({ total: measurement }) }).nullish(),
  canonicalIntelligenceIndexTokenCount: z.object({ output: measurement }).nullish(),
  intelligenceIndexOutputTokensPerTask: z.object({ output: measurement }).nullish(),
  intelligenceIndexTimePerTask: measurement.optional(),
  headline: z.object({ outputSpeed: measurement.optional() }).nullish(),
  price1mInputTokens: measurement,
  price1mOutputTokens: measurement,
  contextWindowTokens: measurement,
});

/** Read Next.js JSON records, never execute downloaded scripts or follow Flight references. */
export function extractModelManifest(html: string) {
  const chunks: string[] = [];
  for (const [, script] of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    const push = /^\s*self\.__next_f\.push\(([\s\S]*)\)\s*;?\s*$/.exec(script!);
    if (!push) continue;
    const chunk = z.tuple([z.literal(1), z.string()]).safeParse(JSON.parse(push[1]!));
    if (chunk.success) chunks.push(chunk.data[1]);
  }
  const manifests: z.infer<typeof manifestSchema>[] = [];
  const catalogues: z.infer<typeof catalogueSchema>[] = [];
  function visit(value: unknown) {
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
    } else if (value && typeof value === 'object') {
      if ('initialModels' in value && 'manifest' in value)
        manifests.push(manifestSchema.parse(value.manifest));
      if ('modelsAndReleases' in value)
        catalogues.push(catalogueSchema.parse(value.modelsAndReleases));
      for (const item of Object.values(value)) visit(item);
    }
  }
  for (const line of chunks.join('').split('\n')) {
    // Other Flight records contain module declarations, text, or references, not JSON trees.
    const record = /^[a-f0-9]+:([\[{].*)$/.exec(line);
    if (!record) continue;
    let value: unknown;
    try {
      value = JSON.parse(record[1]!);
    } catch {
      continue;
    }
    visit(value);
  }
  if (manifests.length !== 1 || catalogues.length !== 1)
    throw new Error('Expected one Artificial Analysis model manifest and catalogue.');
  return { manifest: manifests[0]!, catalogue: catalogues[0]! };
}

async function fetchBytes(url: string, fetcher: typeof fetch) {
  const response = await fetcher(url, { signal: AbortSignal.timeout(30_000), redirect: 'error' });
  if (!response.ok) throw new Error(`Could not fetch ${url}: HTTP ${response.status}`);
  const body = Buffer.from(await response.arrayBuffer());
  if (body.length > maxSourceBytes) throw new Error(`Unexpectedly large source: ${url}`);
  return body;
}

/**
 * Import the complete public chart payload using the format used by AA's own browser client.
 * The manifest and decoding key are both published in the unauthenticated models page.
 */
export async function fetchSnapshot(fetcher: typeof fetch = fetch): Promise<BenchmarkSnapshot> {
  const html = (await fetchBytes(upstreamUrl, fetcher)).toString('utf8');
  const { manifest, catalogue } = extractModelManifest(html);
  const payload = await fetchBytes(new URL(manifest.path, upstreamUrl).href, fetcher);
  const key = Buffer.from(manifest.key, 'hex');
  const iv = createHash('sha256').update(key).digest().subarray(0, 12);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(payload.subarray(-16));
  const compressed = Buffer.concat([decipher.update(payload.subarray(0, -16)), decipher.final()]);
  const decoded = gunzipSync(compressed, { maxOutputLength: maxSourceBytes });
  const { models } = z
    .object({ models: z.array(aaModelSchema).nonempty() })
    .parse(JSON.parse(decoded.toString('utf8')));
  const expected = catalogue.models.map((model) => model.slug).sort();
  const actual = models.map((model) => model.slug).sort();
  if (JSON.stringify(expected) !== JSON.stringify(actual))
    throw new Error('Artificial Analysis payload does not match the full model catalogue.');
  const snapshot = snapshotSchema.parse({
    fetchedAt: new Date().toISOString(),
    source: upstreamUrl,
    sourceHash: createHash('sha256').update(payload).digest('hex'),
    models: models.map((model) => {
      const effort = model.effort ??
        (model.isReasoning
          ? { slug: 'default', label: 'Default', level: 35 }
          : { slug: 'none', label: 'Non-reasoning', level: 0 });
      return {
        id: model.slug,
        family: model.release.slug,
        name: model.release.name,
        variant: model.shortName,
        lab: model.creator.slug,
        labName: model.creator.name,
        released: model.releaseDate,
        open: model.isOpenWeights,
        deprecated: model.deprecated,
        effort: effort.slug,
        effortLabel: effort.label,
        effortOrder: effort.level,
        intelligence: model.intelligenceIndex,
        omniscience: model.omniscience,
        terminalBench40: model.terminalBench40,
        frontierCode20: model.frontierCode20,
        ...codingWorkload(model.intelligenceIndexEvaluations),
        cost: model.intelligenceIndexCostPerTask?.cost.total ?? null,
        costTotal: model.intelligenceIndexCost?.total ?? null,
        tokens: model.intelligenceIndexOutputTokensPerTask?.output ?? null,
        tokensTotal: model.canonicalIntelligenceIndexTokenCount?.output ?? null,
        speed: model.headline?.outputSpeed ?? null,
        time: model.intelligenceIndexTimePerTask ?? null,
        inputPrice: model.price1mInputTokens,
        outputPrice: model.price1mOutputTokens,
        context: model.contextWindowTokens,
      };
    }),
  });
  // Optional per-model measurements must still exist somewhere in the full dataset.
  for (const field of ['codingCost', 'codingTokens', 'codingTime', 'terminalBench40', 'frontierCode20', 'omniscience', 'cost', 'costTotal', 'tokens', 'tokensTotal', 'speed', 'time'] as const) {
    if (!snapshot.models.some((model) => model[field] !== null))
      throw new Error(`Artificial Analysis dataset is missing all ${field} measurements.`);
  }
  return snapshot;
}

/** Compare every model field by stable ID; snapshot timestamps and row order are not changes. */
export function compareSnapshots(
  previous: BenchmarkSnapshot,
  next: BenchmarkSnapshot,
  checkedAt: string,
): ChangeBatch {
  if (Date.parse(next.fetchedAt) < Date.parse(previous.fetchedAt))
    throw new Error('The upstream snapshot is older than the current data.');
  if (next.models.length < previous.models.length * 0.8)
    throw new Error('The source lost over 20% of its models. Inspect it before updating.');
  const before = new Map(previous.models.map((model) => [model.id, model]));
  const after = new Map(next.models.map((model) => [model.id, model]));
  const changes: ChangeBatch['changes'] = [];
  const fields = modelSchema.keyof().options;
  for (const id of [...new Set([...before.keys(), ...after.keys()])].sort()) {
    const old = before.get(id);
    const current = after.get(id);
    const model = current ?? old!;
    const details: FieldChange[] =
      old && current
        ? fields.flatMap((field) =>
            old[field] === current[field] ? [] : [{ field, before: old[field], after: current[field] }],
          )
        : [];
    if (!old || !current || details.length)
      changes.push({
        id,
        name: model.name,
        effortLabel: model.effortLabel,
        kind: !old ? 'added' : !current ? 'removed' : 'updated',
        fields: details,
      });
  }
  return { checkedAt, previousFetchedAt: previous.fetchedAt, fetchedAt: next.fetchedAt, changes };
}
