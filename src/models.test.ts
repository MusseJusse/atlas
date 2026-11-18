import { describe, expect, it } from 'vitest';
import { barGroups, efforts, families, fetchedAt, models, paretoFrontier, views, visibleModels, type Model } from './models';
import { defaultSelected } from './model-presentation';
import { format, formatModelValue } from './formatModel';
import snapshot from './data/benchmarks.json';
import { modelFields } from './data/schema';
import { chartDescending, readSettings, readView, writeSettings, type Settings } from './state';
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
  it.each([
    ['minimal', 'low', 'medium'],
    ['default', 'medium', 'low'],
  ])('filters %s with %s while preserving source configurations', (effort, group, otherGroup) => {
    expect(efforts).toEqual(['none', 'low', 'medium', 'high', 'xhigh', 'max']);
    expect(readSettings('').excluded).toEqual(['none', 'max']);
    const source = models.filter((model) => model.effort === effort || model.effort === group);
    const selected = [...new Set(source.map((model) => model.family))];
    expect(source.some((model) => model.effort === effort)).toBe(true);
    expect(source.some((model) => model.effort === group)).toBe(true);
    expect(visibleModels(selected, []).filter((model) => source.includes(model))).toEqual(source);
    expect(visibleModels(selected, [otherGroup]).filter((model) => source.includes(model))).toEqual(source);
    expect(visibleModels(selected, [group]).some((model) => source.includes(model))).toBe(false);
  });
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
    expect(rows.filter((row) => !row.speedSource).every((row) => defaultSelected.includes(row.family))).toBe(true);
  });
  it('keeps max visible when it is the only reasoning tier, ignoring non-reasoning variants', () => {
    const selected = ['glm-5-3-flash', 'deepseek-v4-1-flash', 'gpt-6-1-sol'];
    const rows = visibleModels(selected, ['none', 'max']);
    expect(rows.filter((row) => row.effort === 'max').map((row) => row.id)).toEqual([
      'deepseek-v4-1-flash',
      'glm-5-3-flash',
      'gpt-6-1-sol-ultrafast',
    ]);
    expect(rows.some((row) => row.effort === 'none')).toBe(false);
    expect(rows.filter((row) => !row.speedSource).every((row) => selected.includes(row.family))).toBe(true);
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
  it('groups and sorts intelligence scores independently of cost, keeping zero scores', () => {
    const low = { ...fixture('low', null, 42.3), family: 'scored', effortOrder: 10 };
    const high = { ...fixture('high', 1, 52.4), family: 'scored', effortOrder: 30 };
    const zero = fixture('zero', null, 0);
    const rows = [high, fixture('missing-score', 1, null), zero, low];
    const groups = barGroups(rows, 'intelligence', true, true);
    expect(groups.map((group) => group.id)).toEqual(['scored', 'zero']);
    expect(groups[0]?.rows).toEqual([low, high]);
    expect(barGroups(rows, 'intelligence', false, false).map((group) => group.id)).toEqual([
      'zero', 'low', 'high',
    ]);
    expect(formatModelValue(high, 'intelligence', true)).toBe('52.4');
    expect(paretoFrontier(rows, 'intelligence')).toEqual([high]);
    const settings = { ...readSettings(''), selected: ['gpt-6-1-sol'], excluded: ['none'] };
    const url = writeSettings(settings, 'intelligence');
    expect(readView(url)).toBe('intelligence');
    expect(readSettings(url)).toEqual(settings);
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
  it('shows negative and zero Omniscience scores without requiring intelligence or cost', () => {
    const rows = [
      { ...fixture('negative', null, null), omniscience: -5.35 },
      { ...fixture('zero', null, null), omniscience: 0 },
      { ...fixture('positive', null, null), omniscience: 40.65 },
      { ...fixture('missing', 1, 50), omniscience: null },
    ];
    expect(barGroups(rows, 'omniscience', true, true).map((group) => group.id)).toEqual([
      'positive', 'zero', 'negative',
    ]);
    expect(formatModelValue(rows[0]!, 'omniscience', true)).toBe('-5.4');
    expect(formatModelValue(rows[1]!, 'omniscience')).toBe('0');
    const settings = { ...readSettings(''), descending: true };
    const url = writeSettings(settings, 'omniscience');
    expect(readView(url)).toBe('omniscience');
    expect(readSettings(url)).toEqual(settings);
  });
  it('keeps the endpoint separate from standard models and unmeasured charts', () => {
    const [endpoint] = speedEndpoints;
    const rows = visibleModels([endpoint.parentFamily], ['none', 'max']);
    expect(rows).toContainEqual(endpoint);
    const standardRows = rows.filter((row) => row.family === 'gpt-6-1-sol');
    expect(standardRows.length).toBeGreaterThan(0);
    expect(standardRows.every((row) => row.effort !== 'max')).toBe(true);
    const groups = barGroups(rows, 'speed', true, true);
    expect(groups[0]?.id).toBe(endpoint.family);
    expect(groups[0]?.rows).toEqual([endpoint]);
    for (const view of views.filter((view) => view.metric !== 'time')) {
      expect(barGroups([endpoint], view.metric, true, true)).toEqual([]);
    }
    expect(paretoFrontier([endpoint], 'speed')).toEqual([]);
    const url = writeSettings({ ...readSettings(''), selected: [endpoint.parentFamily] }, 'time-task');
    expect(readView(url)).toBe('time-task');
    expect(readSettings(url).selected).toEqual([endpoint.parentFamily]);
  });
  it('estimates Ultrafast task time from High tokens and labels only that estimate', () => {
    const [endpoint] = speedEndpoints;
    const baseline = models.find((model) => model.id === endpoint.timeEstimate?.baselineModelId);
    expect(baseline?.family).toBe(endpoint.parentFamily);
    expect(baseline?.effort).toBe('high');
    expect(endpoint.timeEstimate?.baselineTokens).toBe(baseline?.tokens);
    expect(endpoint.time).toBeCloseTo(baseline!.tokens! / endpoint.speed!, 8);
    expect(endpoint.timeEstimate?.baselineFetchedAt).toBe(fetchedAt);
    const measuredExample = { ...endpoint, time: 39.21483418496219 };
    expect(formatModelValue(measuredExample, 'time')).toBe('~39s');
    expect(formatModelValue(measuredExample, 'time', true)).toBe('~39s');
    expect(formatModelValue(endpoint, 'speed')).toBe('336.4');
    expect(formatModelValue({ ...endpoint, time: null }, 'time')).toBe('Not measured');
    expect(formatModelValue({ ...measuredExample, timeEstimate: undefined }, 'time')).toBe('39s');
  });
  it('includes task times and the Ultrafast estimate while omitting missing measurements', () => {
    const [endpoint] = speedEndpoints;
    const selected = [endpoint.parentFamily];
    const url = writeSettings({ ...readSettings(''), selected }, 'time-task');
    expect(readView(url)).toBe('time-task');
    const rows = [
      ...visibleModels(readSettings(url).selected, ['none', 'max']),
      { ...fixture('missing-time', 1, 50), time: null },
    ];
    const groups = barGroups(rows, 'time', true, false);
    expect(groups.map((group) => group.id)).toEqual([endpoint.family, endpoint.parentFamily]);
    expect(groups[0]?.rows).toEqual([endpoint]);
    expect(groups[1]?.rows.every((row) => row.time !== null && row.effort !== 'max')).toBe(true);
  });
  it('uses one Sol picker entry to enable and disable both standard and Ultrafast bars', () => {
    const [endpoint] = speedEndpoints;
    expect(families.filter(({ family }) => family === endpoint.parentFamily)).toHaveLength(1);
    expect(families.some(({ family }) => family === endpoint.family)).toBe(false);
    const disabled = defaultSelected.filter((family) => family !== endpoint.parentFamily);
    const url = writeSettings({ ...readSettings(''), selected: disabled }, 'time-task');
    expect(visibleModels(readSettings(url).selected, []).some(
      (row) => row.family === endpoint.parentFamily || row.family === endpoint.family,
    )).toBe(false);
    const enabled = visibleModels([...disabled, endpoint.parentFamily], ['none', 'max']);
    expect(enabled.some((row) => row.family === endpoint.parentFamily)).toBe(true);
    expect(enabled).toContainEqual(endpoint);
    expect(barGroups(enabled, 'speed', true, false).at(-1)?.id).toBe(endpoint.family);
  });
});

describe('chart ordering', () => {
  it.each(['cost', 'costTotal', 'tokens', 'tokensTotal', 'time'] as const)(
    'sorts overlapping mobile %s ranges by their lowest measured value',
    (metric) => {
      const rows = [
        { ...fixture('wide-high', 1, 1), family: 'wide', effortOrder: 30, [metric]: 10 },
        { ...fixture('narrow-low', 1, 1), family: 'narrow', effortOrder: 10, [metric]: 2 },
        { ...fixture('wide-low', 1, 1), family: 'wide', effortOrder: 10, [metric]: 1 },
        { ...fixture('narrow-high', 1, 1), family: 'narrow', effortOrder: 30, [metric]: 3 },
        { ...fixture('missing', 1, 1), [metric]: null },
      ];
      const descending = chartDescending(metric, true, readSettings('').descending);
      const groups = barGroups(rows, metric, true, descending, descending ? 'maximum' : 'minimum');
      expect(groups.map((group) => group.id)).toEqual(['wide', 'narrow']);
      expect(groups[0]?.minimum).toBe(1);
      expect(groups[0]?.maximum).toBe(10);
      expect(groups[0]?.rows.map((row) => row.id)).toEqual(['wide-low', 'wide-high']);
      // Desktop bars still compare the highest value in each model group.
      expect(barGroups(rows, metric, true, false).map((group) => group.id)).toEqual(['narrow', 'wide']);
      expect(barGroups(rows, metric, true, true, 'maximum').map((group) => group.id)).toEqual(['wide', 'narrow']);
    },
  );

  it.each([
    ['cost', ['low', 'high']],
    ['costTotal', ['low', 'high']],
    ['tokens', ['low', 'high']],
    ['tokensTotal', ['low', 'high']],
    ['time', ['low', 'high']],
    ['intelligence', ['high', 'low']],
    ['omniscience', ['high', 'low']],
    ['speed', ['high', 'low']],
  ] as const)('defaults mobile %s ranges to best first and desktop bars to ascending', (metric, expected) => {
    const rows = [
      { ...fixture('low', 1, 1), [metric]: -1 },
      { ...fixture('high', 2, 2), [metric]: 2 },
      { ...fixture('missing', null, null), [metric]: null },
    ];
    const { descending } = readSettings('');
    expect(barGroups(rows, metric, true, chartDescending(metric, true, descending)).map((group) => group.id))
      .toEqual(expected);
    expect(barGroups(rows, metric, true, chartDescending(metric, false, descending)).map((group) => group.id))
      .toEqual(['low', 'high']);
  });

  it.each([true, false])('preserves an explicit descending=%s choice across metrics and viewports', (descending) => {
    const settings = { ...readSettings(''), descending };
    const url = writeSettings(settings, 'intelligence');
    expect(url).toContain(`sort=${descending ? 'desc' : 'asc'}`);
    expect(readSettings(url)).toEqual(settings);
    for (const { metric } of views) {
      expect(chartDescending(metric, true, readSettings(url).descending)).toBe(descending);
      expect(chartDescending(metric, false, readSettings(url).descending)).toBe(descending);
    }
  });

  it('keeps automatic ordering when a URL has no recognized sort choice', () => {
    expect(readSettings('').descending).toBeNull();
    expect(readSettings('?sort=unknown').descending).toBeNull();
    expect(writeSettings(readSettings(''), 'cost-intelligence')).toBe('/');
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

it('defaults tokens per task to scatter and preserves a bar chart choice through the URL', () => {
  const settings = readSettings('');
  expect(settings.scatter).toBe(true);
  expect(writeSettings(settings, 'cost-intelligence')).toBe('/');
  expect(readSettings('?scatter=tokens-task').scatter).toBe(true);
  const url = writeSettings({ ...settings, scatter: false }, 'tokens-task');
  expect(url).toBe('?scatter=false&chart=tokens-task');
  expect(readSettings(url).scatter).toBe(false);
});

it('round-trips an empty selection and view controls through the URL', () => {
  const settings: Settings = {
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
  expect(readSettings(writeSettings(settings, 'cost-task'))).toEqual(settings);
});
