import { expect, it } from 'vitest';
import { z } from 'zod';
import { codingAgents, codingAgentSource, visibleCodingAgents } from './coding-agents';
import { families, models } from '../models';
import { defaults, readSettings, writeSettings } from '../state';
import { measureScatterRows, scatterGeometry } from '../charts/geometry';

it('validates the separate source snapshot and retains the published numeric precision', () => {
  const snapshot = z.object({
    fetchedAt: z.iso.datetime(), source: z.url(), sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
    version: z.literal('2.0'),
    configurations: z.array(z.object({
      id: z.string().min(1), family: z.string().min(1), model: z.string().min(1),
      agent: z.string().min(1), configuration: z.string().min(1),
      lab: z.string().min(1), labName: z.string().min(1),
      effort: z.enum(['default', 'low', 'medium', 'high', 'xhigh', 'max']),
      indexScore: z.number().min(0).max(1).nullable(), cost: z.number().nonnegative().nullable(),
    })).nonempty(),
  }).parse(codingAgentSource);
  expect(snapshot).toEqual(codingAgentSource);
  expect(new Set(codingAgents.map((row) => row.id)).size).toBe(codingAgents.length);
  for (const source of snapshot.configurations) {
    const row = codingAgents.find((row) => row.id === `coding-${source.id}`)!;
    expect(row.codingScore).toBe(source.indexScore === null ? null : source.indexScore * 100);
    expect(row.cost).toBe(source.cost);
    expect(row.codingAgent?.configuration).toBe(source.configuration);
    for (const metric of ['intelligence', 'omniscience', 'tokens', 'tokensTotal', 'costTotal', 'time', 'speed'] as const)
      expect(row[metric]).toBeNull();
    expect(models.some((model) => model.id === row.id)).toBe(false);
    expect(families.some((family) => family.family === row.family)).toBe(true);
  }
  const sol = codingAgents.find((row) => row.family === 'gpt-6-1-sol')!;
  expect(sol.codingScore).toBe(0.541279798631476 * 100);
  expect(sol.cost).toBe(1.5046389983744);
});

it('uses the picker and reasoning filters without hiding max-only agent measurements by default', () => {
  expect(visibleCodingAgents([], [])).toEqual([]);
  const defaultRows = visibleCodingAgents(defaults.selected, defaults.excluded);
  expect(defaultRows.some((row) => row.family === 'gpt-6-1-sol' && row.effort === 'max')).toBe(true);
  expect(defaultRows.every((row) => defaults.selected.includes(row.family))).toBe(true);
  expect(visibleCodingAgents(['grok-4-7'], ['xhigh'])).toEqual([]);
  const router = codingAgents.find((row) => row.family === 'coding-devin-astra-swe2')!;
  expect(visibleCodingAgents([router.family], [])).toEqual([router]);
  const url = writeSettings({ ...defaults, selected: [router.family], linear: ['coding-agents'] }, 'coding-agents');
  expect(readSettings(url).selected).toEqual([router.family]);
  expect(readSettings(url).linear).toEqual(['coding-agents']);
});

it('uses coding scores for eligibility, coordinates and dominance, keeping tools as separate series', () => {
  const base = codingAgents.find((row) => row.family === 'gpt-6-1-sol')!;
  const rows = [
    { ...base, id: 'free', cost: 0, codingScore: 0 },
    { ...base, id: 'cheap', cost: 1, codingScore: 50 },
    { ...base, id: 'expensive', cost: 2, codingScore: 40, intelligence: 99,
      codingAgent: { ...base.codingAgent!, name: 'Another tool' } },
    { ...base, id: 'missing-cost', cost: null },
    { ...base, id: 'missing-score', codingScore: null, intelligence: 99 },
  ];
  const linear = measureScatterRows(rows, 'cost', true, 'codingScore');
  expect(linear.map((row) => row.id)).toEqual(['free', 'cheap', 'expensive']);
  const logarithmic = measureScatterRows(rows, 'cost', false, 'codingScore');
  expect(logarithmic.map((row) => row.id)).toEqual(['cheap', 'expensive']);
  expect(measureScatterRows([base], 'cost', false)).toEqual([]);
  for (const width of [390, 1000]) {
    const geometry = scatterGeometry(linear, 'cost', width, 640, true, true);
    expect([...geometry.frontierIds]).toEqual(['free', 'cheap']);
    expect(geometry.y(linear[1]!.score)).toBeLessThan(geometry.y(linear[2]!.score));
    expect(geometry.series).toHaveLength(3);
    expect(geometry.series.every((series) => series.rows.length === 1)).toBe(true);
    expect(geometry.labels.every((label) => label.y >= geometry.top && label.y <= geometry.bottom)).toBe(true);
  }
});


it('keeps dense agent labels apart while retaining every measured point', () => {
  const rows = measureScatterRows(codingAgents, 'cost', false, 'codingScore');
  expect(rows).toHaveLength(22);
  const geometry = scatterGeometry(rows, 'cost', 936, 466, true, false);
  expect(geometry.series).toHaveLength(rows.length);
  expect(geometry.labels.length).toBeLessThan(rows.length);
  for (let index = 1; index < geometry.labels.length; index++)
    expect(geometry.labels[index]!.y - geometry.labels[index - 1]!.y).toBeGreaterThanOrEqual(39.9);
});
