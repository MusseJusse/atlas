import { expect, it } from 'vitest';
import { z } from 'zod';
import { cyberModels, cyberSource, visibleCyberModels } from './cyber-index';
import { families, models } from '../models';
import { defaults, readSettings, writeSettings } from '../state';
import { measureScatterRows, scatterGeometry } from '../charts/geometry';

it('validates the Cyber snapshot and preserves its score and workload cost precision', () => {
  const source = z.strictObject({
    fetchedAt: z.iso.datetime(), source: z.url(), sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
    version: z.literal('1'), taskCount: z.literal(262),
    configurations: z.array(z.strictObject({
      id: z.uuid(), slug: z.string().min(1), family: z.string().min(1), model: z.string().min(1),
      configuration: z.string().min(1), lab: z.string().min(1), labName: z.string().min(1),
      effort: z.enum(['default', 'high', 'xhigh', 'max']), effortLabel: z.string().min(1),
      effortOrder: z.number().nonnegative(), trustedAccess: z.boolean(),
      indexScore: z.number().min(0).max(100).nullable(), cost: z.number().nonnegative().nullable(),
    })).nonempty(),
  }).parse(cyberSource);
  expect(new Set(cyberModels.map((row) => row.id)).size).toBe(source.configurations.length);
  for (const configuration of source.configurations) {
    const row = cyberModels.find((row) => row.id === `cyber-${configuration.id}`)!;
    expect(row.cyberScore).toBe(configuration.indexScore);
    expect(row.cost).toBe(configuration.cost);
    expect(row.cyber?.configuration).toBe(configuration.configuration);
    expect(families.some((family) => family.family === row.family)).toBe(true);
    expect(models.some((model) => model.id === row.id)).toBe(false);
    for (const metric of ['intelligence', 'omniscience', 'tokens', 'tokensTotal', 'costTotal', 'time', 'speed'] as const)
      expect(row[metric]).toBeNull();
  }
  const kimi = cyberModels.find((row) => row.family === 'kimi-k3-1-pro')!;
  expect(kimi.cyberScore).toBe(64.0651080825665);
  expect(kimi.cost).toBe(2.8095579804770177);
  const opus = cyberModels.find((row) => row.family === 'claude-opus-5-5')!;
  expect(opus.cost).toBe(9.752490584189793);
  expect(opus.effortLabel).toBe('Max, Default Fallback');
});

it('uses picker and reasoning filters, retaining the only measured Max tier', () => {
  expect(visibleCyberModels([], [])).toEqual([]);
  const rows = visibleCyberModels(defaults.selected, defaults.excluded);
  expect(rows.some((row) => row.family === 'claude-opus-5-5' && row.effort === 'max')).toBe(true);
  expect(rows.every((row) => defaults.selected.includes(row.family))).toBe(true);
  expect(visibleCyberModels(['grok-4-7'], ['xhigh'])).toEqual([]);
  expect(visibleCyberModels(['kimi-k3-1-pro'], ['medium'])).toEqual([]);
  expect(visibleCyberModels(['gpt-6-1-sol'], [])).toEqual([]);
  const trusted = cyberModels.find((row) => row.cyber?.trustedAccess)!;
  expect(trusted.family).toBe('gpt-6-sol-daybreak-blue');
  expect(families.find((family) => family.family === trusted.family)?.model.name).toContain('trusted access');
  expect(visibleCyberModels(['gpt-6-sol'], []).some((row) => row.id === trusted.id)).toBe(false);
  const url = writeSettings({ ...defaults, selected: [trusted.family] }, 'cost-intelligence');
  expect(readSettings(url).selected).toEqual([trusted.family]);
});

it('uses Cyber scores for eligibility, coordinates and frontier on desktop and phone', () => {
  const base = cyberModels[0]!;
  const rows = [
    { ...base, id: 'free', cost: 0, cyberScore: 0 },
    { ...base, id: 'cheap', cost: 1, cyberScore: 50 },
    { ...base, id: 'expensive', cost: 2, cyberScore: 40, intelligence: 99 },
    { ...base, id: 'missing-cost', cost: null },
    { ...base, id: 'missing-score', cyberScore: null, intelligence: 99 },
  ];
  const linear = measureScatterRows(rows, 'cost', true, 'cyberScore');
  expect(linear.map((row) => row.id)).toEqual(['free', 'cheap', 'expensive']);
  expect(measureScatterRows(rows, 'cost', false, 'cyberScore').map((row) => row.id)).toEqual(['cheap', 'expensive']);
  expect(measureScatterRows([base], 'cost', false)).toEqual([]);
  for (const width of [390, 1000]) {
    const geometry = scatterGeometry(linear, 'cost', width, 640, true, true);
    expect([...geometry.frontierIds]).toEqual(['free', 'cheap']);
    expect(geometry.y(linear[1]!.score)).toBeLessThan(geometry.y(linear[2]!.score));
  }
});
