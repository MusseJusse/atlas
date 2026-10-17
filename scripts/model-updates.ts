import { parse, type AnyNode } from 'acorn';
import { simple } from 'acorn-walk';
import { z } from 'zod';
import {
  fieldLabels,
  type ChangeBatch,
  type ChangeHistory,
  type FieldChange,
} from '../src/data/changelog.ts';

const text = z.string().min(1);
const measurement = z.number().nonnegative().nullable();
export const modelSchema = z.strictObject({
  id: text,
  family: text,
  name: text,
  variant: text,
  lab: text,
  labName: text,
  released: z.iso.date().nullable(),
  open: z.boolean(),
  deprecated: z.boolean(),
  effort: text,
  effortLabel: text,
  effortOrder: z.number().nonnegative(),
  estimated: z.boolean(),
  intelligence: z.number().nullable(),
  cost: measurement,
  costTotal: measurement,
  tokens: measurement,
  tokensTotal: measurement,
  speed: measurement,
  time: measurement,
  inputPrice: measurement,
  outputPrice: measurement,
  context: measurement,
});
export const snapshotSchema = z
  .object({
    fetchedAt: z.iso.datetime(),
    source: z.url().optional(),
    sourceHash: text.optional(),
    models: z.array(modelSchema).nonempty(),
  })
  .superRefine(({ models }, ctx) => {
    if (new Set(models.map((model) => model.id)).size !== models.length)
      ctx.addIssue({ code: 'custom', message: 'Duplicate model IDs in the snapshot.' });
  });
export type BenchmarkSnapshot = z.infer<typeof snapshotSchema>;

const changeValue = z.union([z.string(), z.number(), z.boolean(), z.null()]);
export const historySchema = z.strictObject({
  source: z.url(),
  baselineFetchedAt: z.iso.datetime(),
  updates: z.array(
    z.strictObject({
      checkedAt: z.iso.datetime(),
      previousFetchedAt: z.iso.datetime(),
      fetchedAt: z.iso.datetime(),
      changes: z.array(
        z.strictObject({
          id: text,
          name: text,
          effortLabel: text,
          kind: z.enum(['added', 'updated', 'removed']),
          fields: z.array(
            z.strictObject({
              field: modelSchema.keyof(),
              before: changeValue,
              after: changeValue,
            }),
          ),
        }),
      ),
    }),
  ),
}) satisfies z.ZodType<ChangeHistory>;

/** Decode only data literals. Never execute JavaScript downloaded from the source. */
function literal(node: AnyNode): unknown {
  switch (node.type) {
    case 'Literal':
      if (node.value === null || ['string', 'number', 'boolean'].includes(typeof node.value))
        return node.value;
      break;
    case 'TemplateLiteral':
      if (node.expressions.length === 0) return node.quasis[0]!.value.cooked;
      break;
    case 'UnaryExpression': {
      const value = literal(node.argument);
      if (node.operator === '!' && typeof value === 'number') return !value;
      if (node.operator === '-' && typeof value === 'number') return -value;
      if (node.operator === '+' && typeof value === 'number') return value;
      break;
    }
    case 'ArrayExpression':
      return node.elements.map((element) => {
        if (!element) throw new Error('Snapshot arrays cannot contain holes.');
        return literal(element);
      });
    case 'ObjectExpression':
      return Object.fromEntries(
        node.properties.map((property) => {
          if (
            property.type !== 'Property' ||
            property.computed ||
            property.kind !== 'init' ||
            property.method
          )
            throw new Error('Snapshot properties must be plain data.');
          const key = property.key;
          const name = key.type === 'Identifier' ? key.name : literal(key);
          if (typeof name !== 'string') throw new Error('Invalid snapshot property name.');
          return [name, literal(property.value)];
        }),
      );
  }
  throw new Error(`Unsupported snapshot expression: ${node.type}`);
}

/** Locate the embedded snapshot by its fields, independent of minified variable names. */
export function extractSnapshots(javascript: string): BenchmarkSnapshot[] {
  const snapshots: BenchmarkSnapshot[] = [];
  simple(parse(javascript, { ecmaVersion: 'latest', sourceType: 'module' }), {
    ObjectExpression(node) {
      const keys = node.properties.flatMap((property) => {
        if (property.type !== 'Property' || property.computed) return [];
        return property.key.type === 'Identifier'
          ? [property.key.name]
          : property.key.type === 'Literal'
            ? [property.key.value]
            : [];
      });
      if (keys.includes('fetchedAt') && keys.includes('models'))
        snapshots.push(snapshotSchema.parse(literal(node)));
    },
  });
  return snapshots;
}

export const upstreamUrl = 'https://slopalytics.com/';

async function fetchText(url: string, fetcher: typeof fetch) {
  const response = await fetcher(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Could not fetch ${url}: HTTP ${response.status}`);
  const body = await response.text();
  if (body.length > 10_000_000) throw new Error(`Unexpectedly large source: ${url}`);
  return body;
}

export async function fetchSnapshot(fetcher: typeof fetch = fetch): Promise<BenchmarkSnapshot> {
  const html = await fetchText(upstreamUrl, fetcher);
  const scripts = [...html.matchAll(/<script\b[^>]*>/gi)];
  const assets = scripts.flatMap(([tag]) => {
    if (!/\btype\s*=\s*["']module["']/i.test(tag)) return [];
    const src = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
    if (!src) return [];
    const url = new URL(src, upstreamUrl);
    if (url.origin !== new URL(upstreamUrl).origin) throw new Error('Unexpected script origin.');
    return [url.href];
  });
  if (assets.length === 0 || assets.length > 10)
    throw new Error('Could not identify the upstream module scripts.');
  const snapshots = (
    await Promise.all(
      [...new Set(assets)].map(async (url) => extractSnapshots(await fetchText(url, fetcher))),
    )
  ).flat();
  if (snapshots.length !== 1) throw new Error(`Expected one benchmark snapshot, found ${snapshots.length}.`);
  return snapshots[0]!;
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
  const fields = modelSchema.keyof().options satisfies (keyof typeof fieldLabels)[];
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
