import { expect, it } from 'vitest';
import { resolveView, views } from './chart-definitions';
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

it('persists Coding Only in the URL and applies it only to the main cost scatter', () => {
  const settings = { ...readSettings(''), codingOnly: true };
  expect(writeSettings(settings, 'cost-intelligence')).toBe('?codingOnly=true');
  expect(readSettings(writeSettings(settings, 'cost-intelligence'))).toEqual(settings);
  expect(readSettings('?codingOnly=false').codingOnly).toBe(false);
  for (const view of views) {
    expect(resolveView(view, settings).score)
      .toBe(view.id === 'cost-intelligence' ? 'codingIndex' : 'intelligence');
  }
});
