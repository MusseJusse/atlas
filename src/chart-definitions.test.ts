import { expect, it } from 'vitest';
import { resolveView, views } from './chart-definitions';
import { readSettings, readView, writeSettings } from './state';

it.each(views)('preserves the $id URL and chart mode', (view) => {
  const url = writeSettings(readSettings(''), view.id);
  expect(readView(url)).toBe(view.id);
  expect(resolveView(view, readSettings(url))).toEqual({ scatter: view.mode === 'scatter', linear: false, score: 'intelligence' });
});

it('resolves the scale by view even when a scatter and a bar chart share a metric', () => {
  const settings = readSettings('?linear=tokens-task,cost-task');
  const linear = views.filter((view) => resolveView(view, settings).linear).map((view) => view.id);
  expect(linear).toEqual(['tokens-task', 'cost-task']);
  expect(readSettings(writeSettings(settings, 'tokens-ranking'))).toEqual(settings);
});

it('opens saved tokens links as the chart they showed before axis menus', () => {
  expect(readView('?chart=tokens-task')).toBe('tokens-task');
  expect(readView('?chart=tokens-task&scatter=false')).toBe('tokens-ranking');
});
