import { expect, it } from 'vitest';
import { models, visibleModels, type Model } from './models';
import { resolveChartInteraction } from './chart-interactions';
import { scatterRows } from './scatter-data';

it('shares preview and pin precedence with keyed efficiency records', () => {
  const hover = { id: '10:shared', threshold: 10 };
  const pin = { id: '20:shared', threshold: 20 };
  const rows = [hover, pin];
  expect(resolveChartInteraction(rows, null, null).activeModel).toBeNull();
  expect(resolveChartInteraction(rows, null, hover.id).activeModel).toBe(hover);
  expect(resolveChartInteraction(rows, pin.id, hover.id).activeModel).toBe(pin);
  expect(resolveChartInteraction(rows, pin.id, null).activeModel).toBe(pin);
  expect(resolveChartInteraction([hover], pin.id, hover.id).activeModel).toBe(hover);
});

it('lets a visible hover replace a filtered pin and restores the pin when re-enabled', () => {
  const selected = ['claude-fable-5-1', 'gpt-6-1-sol'];
  const rows = scatterRows(visibleModels(selected, []), 'cost', false);
  const pin = rows.find((row) => row.family === selected[0])!;
  const hover = rows.find((row) => row.family === selected[1])!;
  expect(resolveChartInteraction(rows, pin.id, hover.id).activeModel).toBe(pin);

  const filtered = scatterRows(visibleModels([selected[1]!], []), 'cost', false);
  expect(resolveChartInteraction(filtered, pin.id, hover.id)).toEqual({
    pinned: null,
    activeModel: hover,
  });
  expect(resolveChartInteraction(filtered, pin.id, null).activeModel).toBeNull();
  expect(resolveChartInteraction(rows, pin.id, hover.id).pinned).toBe(pin);
});

it('resolves bar pins and previews after reasoning filters change', () => {
  const rows = visibleModels(['claude-fable-5-1'], []).filter((row) => row.intelligence !== null);
  const pin = rows.find((row) => row.effort === 'high')!;
  const hover = rows.find((row) => row.effort !== pin.effort)!;
  const filtered = visibleModels(['claude-fable-5-1'], [pin.effort])
    .filter((row) => row.intelligence !== null);
  expect(resolveChartInteraction(filtered, pin.id, hover.id)).toEqual({
    pinned: null,
    activeModel: hover,
  });
  expect(resolveChartInteraction(filtered, null, pin.id).activeModel).toBeNull();
  expect(resolveChartInteraction(rows, pin.id, hover.id).pinned).toBe(pin);
});

it('uses scale-eligible rows so a zero-cost pin cannot block a log preview', () => {
  const free: Model = { ...models[0]!, id: 'free', cost: 0, intelligence: 20 };
  const paid: Model = { ...free, id: 'paid', cost: 1 };
  const rows = [free, paid];
  expect(resolveChartInteraction(scatterRows(rows, 'cost', true), free.id, paid.id).activeModel).toBe(free);
  expect(resolveChartInteraction(scatterRows(rows, 'cost', false), free.id, paid.id)).toEqual({
    pinned: null,
    activeModel: paid,
  });
});

it('uses current measurements and drops interactions with no plottable configuration', () => {
  const current: Model = { ...models[0]!, cost: 2, intelligence: 30 };
  const refreshed = { ...current, cost: 3 };
  expect(resolveChartInteraction([refreshed], current.id, null).activeModel).toBe(refreshed);
  expect(resolveChartInteraction([], current.id, current.id)).toEqual({
    pinned: null,
    activeModel: null,
  });
});
