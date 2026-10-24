import { expect, it } from 'vitest';
import { resolveView, views } from './chart-definitions';
import { readSettings, readView, writeSettings } from './state';

it.each(views)('preserves the $id URL and chart mode with either scatter preference', (view) => {
  for (const scatter of [true, false]) {
    const settings = { ...readSettings(''), scatter };
    const url = writeSettings(settings, view.id);
    expect(readView(url)).toBe(view.id);
    expect(resolveView(view, readSettings(url))).toEqual({
      scatter: ['cost-intelligence', 'coding-agents', 'cyber-index'].includes(view.id) || (view.id === 'tokens-task' && scatter),
      linear: false,
      score: view.id === 'coding-agents' ? 'codingScore' : view.id === 'cyber-index' ? 'cyberScore' : 'intelligence',
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
