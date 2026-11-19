import { expect, it } from 'vitest';
import { resolveView, views } from './chart-definitions';
import { readSettings, readView, writeSettings } from './state';

it.each(views)('preserves the $id URL and chart mode', (view) => {
  const url = writeSettings(readSettings(''), view.id);
  expect(readView(url)).toBe(view.id);
  expect(resolveView(view, readSettings(url))).toEqual({ scatter: view.mode === 'scatter', linear: false, score: 'intelligence' });
});

it('resolves the scale by view even when a scatter and a bar chart share a metric', () => {
  const settings = readSettings('?linear=tokens-intelligence,cost-task');
  const linear = views.filter((view) => resolveView(view, settings).linear).map((view) => view.id);
  expect(linear).toEqual(['tokens-intelligence', 'cost-task']);
  expect(readSettings(writeSettings(settings, 'tokens-task'))).toEqual(settings);
});
