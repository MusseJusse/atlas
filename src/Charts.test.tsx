import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { Chart } from './Charts';
import { models, views, type Model } from './models';
import { rankingPresentation } from './chart-definitions';
import { defaults } from './state';
import { useHydrated } from './useHydrated';

vi.mock('./useHydrated', () => ({ useHydrated: vi.fn(() => true) }));

afterEach(() => vi.mocked(useHydrated).mockReturnValue(true));

const rangeView = views.find((view) => view.id === 'intelligence')!;

function renderChart(rows: Model[], view = rangeView) {
  return renderToStaticMarkup(
    <Chart
      active
      presentation={rankingPresentation(view, defaults)}
      view={view}
      rows={rows}
      settings={defaults}
      highlighted={null}
      onHighlight={() => {}}
    />,
  );
}

it('shows the existing empty state for ranking charts', () => {
  for (const rows of [[], [{ ...models[0]!, intelligence: null }]]) {
    const markup = renderChart(rows);
    expect(markup).toContain('No models to display');
    expect(markup).toContain('Choose models in the model filters or enable more reasoning levels.');
    expect(markup).not.toContain('phone:invisible');
    expect(markup).not.toMatch(/<svg[^>]*role="group"/);
    expect(markup).not.toContain('tabular-nums');
  }
});

it('renders horizontal rankings without a second desktop chart', () => {
  const markup = renderChart([{ ...models[0]!, intelligence: 42 }]);
  expect(markup).toContain('aria-expanded="false"');
  expect(markup).not.toMatch(/<svg[^>]*role="group"/);
  expect(markup).not.toContain('No models to display');
});

it('keeps empty charts behind the hydration guard', () => {
  vi.mocked(useHydrated).mockReturnValue(false);
  expect(renderChart([])).not.toContain('No models to display');
});

it('keeps subscription provenance inside the SVG and fallback points out of frontier mode', async () => {
  const { subscriptionRows, pricingDisclosure } = await import('./data/subscriptions');
  const settings = { ...defaults, pricingMode: 'subscription' as const, frontier: true };
  const rows = subscriptionRows(models.filter((row) => ['gpt-6-1-sol', 'gpt-6-1-terra'].includes(row.family)), settings);
  // App passes only supported estimates to subscription frontier charts.
  const eligible = rows.filter((row) => row.taskPricing?.basis === 'subscription');
  const markup = renderToStaticMarkup(<Chart active presentation={rankingPresentation(views[0], settings)} view={views[0]} rows={eligible} settings={settings}
    pricingContext={pricingDisclosure(rows, false)} highlighted={null} onHighlight={() => {}} />);
  expect(markup).toContain('<metadata>');
  expect(markup).toContain('One model uses the full allowance');
  expect(markup).toContain('External coding token mix');
  expect(markup).toContain('ChatGPT Pro 10x');
  expect(markup).not.toContain('GPT-6.1 Terra,');
});
