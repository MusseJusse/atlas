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
  expect(coding.find((view) => view.id === 'cost-intelligence')?.label).toBe('Cost vs coding score');
  expect(chartViews(false)).toEqual(views);
});


it('ranks best first consistently and respects the explicit direction', () => {
  const settings = readSettings('');
  for (const view of views) {
    const higher = ['intelligence', 'omniscience'].includes(view.id);
    expect(rankingPresentation(view, settings)).toEqual({ descending: higher });
    expect(rankingPresentation(view, { descending: !higher })).toEqual({ descending: !higher });
  }
});


it('keeps the desktop bars preference in saved views while defaulting to rankings', () => {
  const settings = readSettings('?bars=true');
  expect(settings.bars).toBe(true);
  expect(readSettings(writeSettings(settings, 'intelligence')).bars).toBe(true);
  expect(readSettings('/').bars).toBe(false);
});
