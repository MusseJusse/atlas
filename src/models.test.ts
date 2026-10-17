import { describe, expect, it } from 'vitest';
import {
  barGroups,
  defaultSelected,
  fetchedAt,
  format,
  models,
  paretoFrontier,
  views,
  visibleModels,
  type Model,
} from './models';
import snapshot from './data/benchmarks.json';
import { modelFields } from './data/schema';
import { readSettings, readView, writeSettings } from './state';
import { speedEndpoints } from './data/speed-endpoints';

const fixture = (id: string, cost: number | null, intelligence: number | null): Model => ({
  ...models[0]!,
  id,
  family: id,
  cost,
  intelligence,
});

it('packs every configuration without changing consumed fields or numeric precision', () => {
  expect(fetchedAt).toBe(snapshot.fetchedAt);
  expect(models).toEqual(
    snapshot.models.map((model) => Object.fromEntries(modelFields.map((field) => [field, model[field]]))),
  );
});

it('keeps number precision when reusing formatters across chart metrics', () => {
  expect(format(0.12345, 'cost')).toBe('$0.123');
  expect(format(2, 'cost')).toBe('$2.00');
  expect(format(2, 'cost', true)).toBe('$2');
  expect(format(1234.5, 'costTotal')).toBe('$1,235');
  expect(format(52.35, 'intelligence')).toBe('52.4');
  expect(format(52.35, 'tokens', true)).toBe('52');
  expect(format(null, 'cost')).toBe('Not measured');
});

describe('benchmark comparisons', () => {
  it('removes dominated points and lower-scoring ties without treating missing values as zero', () => {
    const rows = [
      fixture('missing-cost', null, 100),
      fixture('missing-score', 0.01, null),
      fixture('cheap', 1, 20),
      fixture('tie', 1, 25),
      fixture('dominated', 2, 24),
      fixture('best', 3, 30),
      fixture('same-score', 4, 30),
    ];
    expect(paretoFrontier(rows, 'cost').map((row) => row.id)).toEqual(['tie', 'best']);
  });
  it('excludes reasoning variants without removing other variants in the same family', () => {
    const rows = visibleModels(defaultSelected, ['none', 'high']);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some((row) => row.effort === 'high' || row.effort === 'none')).toBe(false);
    expect(rows.some((row) => row.effort === 'max')).toBe(true);
    expect(rows.every((row) => defaultSelected.includes(row.family))).toBe(true);
  });
  it('keeps max visible when it is the only reasoning tier, ignoring non-reasoning variants', () => {
    const selected = ['glm-5-3-flash', 'deepseek-v4-1-flash', 'gpt-6-1-sol'];
    const rows = visibleModels(selected, ['none', 'max']);
    expect(rows.filter((row) => row.effort === 'max').map((row) => row.id)).toEqual([
      'deepseek-v4-1-flash',
      'glm-5-3-flash',
    ]);
    expect(rows.some((row) => row.effort === 'none')).toBe(false);
    expect(rows.every((row) => selected.includes(row.family))).toBe(true);
    expect(visibleModels([], ['none', 'max'])).toEqual([]);
  });
  it('still lets non-reasoning variants follow their own filter', () => {
    expect(visibleModels(['deepseek-v4-1-flash'], ['max']).map((row) => row.id)).toEqual([
      'deepseek-v4-1-flash',
      'deepseek-v4-1-flash-non-reasoning',
    ]);
  });
  it('sorts grouped bars by their largest measured value and preserves nulls', () => {
    const rows = [fixture('cheap', 1, 20), fixture('expensive', 3, 25), fixture('missing', null, 30)];
    expect(barGroups(rows, 'cost', true, true).map((group) => group.id)).toEqual(['expensive', 'cheap']);
  });
  it('prefers higher output speed when finding the intelligence frontier', () => {
    const rows = [
      { ...fixture('fast', 1, 20), speed: 300 },
      { ...fixture('fast-tie', 1, 25), speed: 300 },
      { ...fixture('dominated', 1, 24), speed: 200 },
      { ...fixture('smart', 1, 30), speed: 100 },
      { ...fixture('missing-speed', 1, 100), speed: null },
    ];
    expect(paretoFrontier(rows, 'speed').map((row) => row.id)).toEqual(['fast-tie', 'smart']);
  });
  it('keeps the speed-only endpoint separate from standard models and unmeasured charts', () => {
    const [endpoint] = speedEndpoints;
    const rows = visibleModels(['gpt-6-1-sol', endpoint.family], ['none', 'max']);
    expect(rows).toContainEqual(endpoint);
    const standardRows = rows.filter((row) => row.family === 'gpt-6-1-sol');
    expect(standardRows.length).toBeGreaterThan(0);
    expect(standardRows.every((row) => row.effort !== 'max')).toBe(true);
    const groups = barGroups(rows, 'speed', true, true);
    expect(groups[0]?.id).toBe(endpoint.family);
    expect(groups[0]?.rows).toEqual([endpoint]);
    for (const view of views.filter((view) => view.metric !== 'speed')) {
      expect(barGroups([endpoint], view.metric, true, true)).toEqual([]);
    }
    expect(paretoFrontier([endpoint], 'speed')).toEqual([]);
    expect(defaultSelected).toContain(endpoint.family);
    const url = writeSettings({ ...readSettings(''), selected: [endpoint.family] }, 'output-speed');
    expect(readView(url)).toBe('output-speed');
    expect(readSettings(url).selected).toEqual([endpoint.family]);
  });
});

it('defaults the Pareto line to off and preserves an explicit URL choice', () => {
  const settings = readSettings('');
  expect(settings.frontier).toBe(false);
  expect(writeSettings(settings, 'cost-intelligence')).toBe('/');
  expect(readSettings('?frontier=false').frontier).toBe(false);
  expect(readSettings('?frontier=true').frontier).toBe(true);
  expect(writeSettings({ ...settings, frontier: true }, 'cost-intelligence')).toBe('?frontier=true');
});

it('round-trips an empty selection and view controls through the URL', () => {
  const settings = {
    ...readSettings(''),
    selected: [],
    excluded: [],
    frontier: false,
    labels: false,
    grouped: false,
    linear: ['cost-intelligence'],
    descending: true,
    scatter: true,
  };
  expect(readSettings(writeSettings(settings, 'cost-total'))).toEqual(settings);
});
