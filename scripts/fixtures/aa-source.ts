import { createCipheriv, createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { vi } from 'vitest';
import models from './aa-models.json';

// AA's public models chart, trimmed to imported fields. Core fields: 18 October 2026;
// Omniscience scores: 19 October 2026. Coding component scores and workloads are synthetic.
export const aaModels = models;
const key = Buffer.alloc(32, 7);
export const manifest = { path: '/data/0123456789abcdef.txt', key: key.toString('hex') };

export const providerManifest = { ...manifest, path: '/data/fedcba9876543210.txt' };

export function sourceResponse(rows: unknown[], slugs = aaModels.map((model) => model.slug), current = false) {
  const legacyRecords = `d:${JSON.stringify({
    modelsAndReleases: { models: slugs.map((slug) => ({ slug })) },
  })}\n27:${JSON.stringify({ initialModels: [], manifest })}\n`;
  const records = current
    ? `26:${JSON.stringify({ manifest: providerManifest, children: ['$', '$L29', null, {
        initialModels: slugs.map((slug) => ({ slug })), defaultModels: '$26:props:children', manifest,
      }] })}\n`
    : legacyRecords;
  // Flight JSON records can span script chunks, including splits inside JSON strings.
  const split = Math.floor(records.length / 2);
  const html = [records.slice(0, split), records.slice(split)]
    .map((chunk) => `<script>self.__next_f.push(${JSON.stringify([1, chunk])})</script>`)
    .join('');
  function encrypt(value: unknown) {
    const iv = createHash('sha256').update(key).digest().subarray(0, 12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const compressed = gzipSync(JSON.stringify(value));
    return Buffer.concat([cipher.update(compressed), cipher.final(), cipher.getAuthTag()]);
  }
  return { html, payload: encrypt({ models: rows }), providerPayload: encrypt(slugs.map((modelSlug) => ({ modelSlug }))) };
}

export function sourceFixture<T extends { slug: string }>(rows: T[]) {
  const fetcher = vi.fn<typeof fetch>().mockImplementation(async (url) => {
    const response = sourceResponse(rows, rows.map((model) => model.slug), true);
    return new Response(String(url).endsWith(providerManifest.path) ? response.providerPayload
      : String(url).endsWith('.txt') ? response.payload : response.html);
  });
  return { rows, fetcher };
}
