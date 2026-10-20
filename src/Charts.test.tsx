import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { Chart } from './Charts';
import { models, views, type Model } from './models';
import { defaults } from './state';
import { useHydrated } from './useHydrated';

vi.mock('./useHydrated', () => ({ useHydrated: vi.fn(() => true) }));

afterEach(() => vi.mocked(useHydrated).mockReturnValue(true));

const rangeView = views[1];

function renderChart(rows: Model[], phone: boolean, view = rangeView) {
  return renderToStaticMarkup(
    <Chart
      active
      phone={phone}
      view={view}
      rows={rows}
      settings={defaults}
      highlighted={null}
      onHighlight={() => {}}
    />,
  );
}

it.each([true, false])('shows the existing empty state for range charts, phone=%s', (phone) => {
  for (const rows of [[], [{ ...models[0]!, intelligence: null }]]) {
    const markup = renderChart(rows, phone);
    expect(markup).toContain('No models to display');
    expect(markup).toContain('Select a model with measurements for this view.');
    expect(markup).not.toContain('phone:invisible');
    expect(markup).not.toContain('<svg');
    expect(markup).not.toContain('tabular-nums');
  }
});

it('keeps populated phone ranges without mounting the desktop chart', () => {
  const markup = renderChart([{ ...models[0]!, intelligence: 42 }], true);
  expect(markup).toContain('aria-expanded="false"');
  expect(markup).not.toContain('<svg');
  expect(markup).not.toContain('No models to display');
});

it('keeps empty charts behind the hydration guard', () => {
  vi.mocked(useHydrated).mockReturnValue(false);
  expect(renderChart([], true)).not.toContain('No models to display');
  expect(renderChart([], false)).not.toContain('No models to display');
});
