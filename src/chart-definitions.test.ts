import { expect, it } from 'vitest';
import { chartViews, rankingPresentation, resolveView, views } from './chart-definitions';
import { readSettings, readView, writeSettings } from './state';

it.each(views)('preserves the $id URL and chart mode with either scatter preference', (view) => {
  for (const scatter of [true, false]) {
    const settings = { ...readSettings(''), scatter };
    const url = writeSettings(settings, view.id);
    expect(readView(url)).toBe(view.id);
    expect(resolveView(view, readSettings(url))).toEqual({
      scatter: view.id === 'cost-intelligence' || (view.id === 'tokens-task' && scatter),
      linear: false,
      score: 'intelligence',
    });
  }
});

it('resolves axis choices by view even when views share a metric or switch chart mode', () => {
  const settings = readSettings('?linear=cost-task,tokens-task&scatter=false');
  const resolved = views.map((view) => [view.id, resolveView(view, settings).linear]);
  expect(resolved.filter(([, linear]) => linear).map(([id]) => id))
    .toEqual(['tokens-task', 'cost-task']);

  const tokens = views.find((view) => view.id === 'tokens-task')!;
  expect(resolveView(tokens, settings)).toEqual({ scatter: false, linear: true, score: 'intelligence' });
  expect(resolveView(tokens, { ...settings, scatter: true }))
    .toEqual({ scatter: true, linear: true, score: 'intelligence' });
  expect(readSettings(writeSettings(settings, tokens.id))).toEqual(settings);
});

it('persists Coding Only in the URL and applies the coding score across all chart views', () => {
  const settings = { ...readSettings(''), codingOnly: true };
  expect(writeSettings(settings, 'cost-intelligence')).toBe('?codingOnly=true');
  expect(readSettings(writeSettings(settings, 'cost-intelligence'))).toEqual(settings);
  expect(readSettings('?codingOnly=false').codingOnly).toBe(false);
  for (const view of views) {
    expect(resolveView(view, settings).score)
      .toBe('codingIndex');
  }
});

it('changes the score bar metric without changing chart IDs or unrelated benchmark scores', () => {
  const coding = chartViews(true);
  expect(coding.map((view) => view.id)).toEqual(views.map((view) => view.id));
  expect(coding.find((view) => view.id === 'intelligence'))
    .toMatchObject({ label: 'Coding score', metric: 'codingIndex' });
  expect(coding.find((view) => view.id === 'omniscience')?.metric).toBe('omniscience');
  expect(chartViews(false)).toEqual(views);
});


it('uses the better-first table order on both screen sizes and respects explicit sort', async () => {
  const { models } = await import('./models');
  const rows = Array.from({ length: 13 }, (_, index) => ({ ...models[0]!, id: `dense-${index}`, family: `dense-${index}`, intelligence: 42, cost: 1 }));
  const settings = readSettings('');
  const intelligence = views.find((view) => view.id === 'intelligence')!;
  const cost = views.find((view) => view.id === 'cost-task')!;
  for (const phone of [false, true]) {
    expect(rankingPresentation(rows, intelligence, settings, phone)).toEqual({ dense: true, descending: true });
    expect(rankingPresentation(rows, cost, settings, phone)).toEqual({ dense: true, descending: false });
    expect(rankingPresentation(rows, intelligence, { ...settings, descending: false }, phone).descending).toBe(false);
  }
});


it('ignores unmeasured models at the table boundary and switches before labels crowd', async () => {
  const { models } = await import('./models');
  const view = views.find((view) => view.id === 'intelligence')!;
  const settings = readSettings('');
  const measured = [{ ...models[0]!, name: 'A', intelligence: 42 }];
  const unavailable = Array.from({ length: 20 }, (_, index) => ({ ...models[0]!, id: `missing-${index}`, family: `missing-${index}`, intelligence: null }));
  expect(rankingPresentation([...measured, ...unavailable], view, settings, false, 960))
    .toEqual(rankingPresentation(measured, view, settings, false, 960));
  const longNames = Array.from({ length: 10 }, (_, index) => ({ ...models[0]!, id: `wide-${index}`, family: `wide-${index}`, name: 'Muse Wonder Full', intelligence: 42 }));
  expect(rankingPresentation(longNames, view, settings, false, 900).dense).toBe(true);
  expect(rankingPresentation(longNames, view, settings, false, 1600).dense).toBe(false);
});
