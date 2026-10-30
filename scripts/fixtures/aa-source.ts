import { createCipheriv, createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { vi } from 'vitest';
import models from './aa-models.json';

// AA's public models chart, trimmed to imported fields. Core fields: 18 October 2026;
// Omniscience scores: 19 October 2026. Coding component scores are synthetic.
export const aaModels = models;
const key = Buffer.alloc(32, 7);
export const manifest = { path: '/data/0123456789abcdef.txt', key: key.toString('hex') };

export function sourceResponse(rows: unknown[], slugs = aaModels.map((model) => model.slug)) {
  const records = `d:${JSON.stringify({
    modelsAndReleases: { models: slugs.map((slug) => ({ slug })) },
  })}\n27:${JSON.stringify({ initialModels: [], manifest })}\n`;
  // Flight JSON records can span script chunks, including splits inside JSON strings.
  const split = Math.floor(records.length / 2);
  const html = [records.slice(0, split), records.slice(split)]
    .map((chunk) => `<script>self.__next_f.push(${JSON.stringify([1, chunk])})</script>`)
    .join('');
  const iv = createHash('sha256').update(key).digest().subarray(0, 12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const compressed = gzipSync(JSON.stringify({ models: rows }));
  const payload = Buffer.concat([cipher.update(compressed), cipher.final(), cipher.getAuthTag()]);
  return { html, payload };
}

export function sourceFixture<T extends { slug: string }>(rows: T[]) {
  const fetcher = vi.fn<typeof fetch>().mockImplementation(async (url) => {
    const response = sourceResponse(rows, rows.map((model) => model.slug));
    return new Response(String(url).endsWith('.txt') ? response.payload : response.html);
  });
  return { rows, fetcher };
}
