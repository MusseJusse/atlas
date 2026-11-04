import { expect, it } from 'vitest';
import { visibleChartRows } from './chart-rows';
import { chartViews, views } from './chart-definitions';
import { codingOnlyRows } from './data/coding-only';
import { models, type Model } from './models';
import { readSettings } from './state';

const costView = views.find((view) => view.id === 'cost-intelligence')!;
const intelligenceView = views.find((view) => view.id === 'intelligence')!;
const settings = readSettings('?excluded=none,low,max');
const max: Model = { ...models[0]!, id: 'max', family: 'test', effort: 'max', intelligence: 32, cost: 0.6 };
const high: Model = { ...max, id: 'high', effort: 'high', intelligence: 28 };
const none: Model = { ...max, id: 'none', effort: 'none' };

// Effect hosts now measure the DeepSeek high tier, so this regression on PR #78 uses synthetic rows:
// a Max tier with measurements, and a cheaper tier missing the cost axis.
it('keeps Max visible when other tiers lack chart measurements', () => {
  const rows = [max, { ...high, cost: null }, none];
  expect(visibleChartRows(rows, costView, settings).map((row) => row.effort)).toEqual(['max']);
  expect(visibleChartRows(rows, intelligenceView, settings).map((row) => row.effort)).toEqual(['high']);
});

it.each([
  { cost: null, intelligence: 28 },
  { cost: 0.4, intelligence: null },
])('ignores a reasoning alternative missing an axis measurement: %j', (measurements) => {
  const rows = [max, { ...high, ...measurements }, none];
  expect(visibleChartRows(rows, costView, settings)).toEqual([max]);
  expect(visibleChartRows(rows, costView, { ...settings, excluded: ['max'] })).toEqual([max, none]);
});

it('honors Max exclusion when another reasoning tier has both measurements, even if excluded too', () => {
  expect(visibleChartRows([max, high, none], costView, settings)).toEqual([high]);
  expect(visibleChartRows([max, high], costView, { ...settings, excluded: ['max', 'high'] })).toEqual([]);
});

it('counts measured zero costs on linear scales but not logarithmic scales', () => {
  const freeHigh = { ...high, cost: 0 };
  expect(visibleChartRows([max, freeHigh], costView, settings)).toEqual([max]);
  expect(visibleChartRows([max, freeHigh], costView, { ...settings, linear: [costView.id] })).toEqual([freeHigh]);
});

it('uses the coding workload measurements before finding available reasoning alternatives', () => {
  const rows = codingOnlyRows([
    { ...max, terminalBench40: 0.5, frontierCode20: 0.6, codingCost: 1 },
    { ...high, terminalBench40: 0.4, frontierCode20: 0.5, codingCost: null },
  ]);
  const codingSettings = { ...settings, codingOnly: true };
  const view = chartViews(true).find((view) => view.id === costView.id)!;
  expect(visibleChartRows(rows, view, codingSettings).map((row) => row.id)).toEqual(['max']);
});
