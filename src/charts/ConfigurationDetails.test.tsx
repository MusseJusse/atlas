import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { formatModelValue, models, type Model } from '../models';
import { speedEndpoints } from '../data/speed-endpoints';
import type { Metric } from '../chart-definitions';
import { ConfigurationDetails } from './ConfigurationDetails';

const sol = models.find((model) => model.id === 'gpt-6-1-sol-xhigh')!;

function render(model: Model, mobile: boolean, metric: Metric = 'cost') {
  return renderToStaticMarkup(
    <ConfigurationDetails
      model={model}
      metric={metric}
      mobile={mobile}
      pinned
      onClose={() => {}}
    />,
  );
}

it('shows the full model identity and accessible measurement labels', () => {
  const opus = models.find((model) => model.id === 'claude-opus-5-5-xhigh')!;
  const markup = render(opus, true);
  expect(markup).toContain(opus.name);
  expect(markup).toContain('src="/logos/anthropic.svg"');
  for (const label of ['Intelligence index', 'Cost per task', 'Time per task', 'Tokens per task', 'Output tokens / s'])
    expect(markup).toContain(label);

  const desktop = render(sol, false);
  expect(desktop).toContain('$0.393');
  expect(desktop).toContain('Artificial Analysis');
});

it('shows missing values as unavailable and preserves the estimate marker and source', () => {
  const endpoint = speedEndpoints[0]!;
  const markup = render(endpoint, true);
  expect(markup.match(/title="Not measured"/g)).toHaveLength(3);
  expect(markup).toContain('~39s');

  const desktop = render(endpoint, false);
  expect(desktop).toContain('Not measured');
  expect(desktop).toContain(endpoint.speedSource.url);
  expect(desktop).toContain('Local time estimate');
});

it('shows the active chart metric and supporting values without duplicate rows', () => {
  const totalTokens = render(sol, false, 'tokensTotal');
  expect(totalTokens).toContain('Total tokens');
  expect(totalTokens).toContain(formatModelValue(sol, 'tokensTotal'));
  expect(totalTokens.match(/<dt /g)).toHaveLength(3);
  for (const metric of ['cost', 'intelligence', 'omniscience'] as const) {
    const markup = render(sol, false, metric);
    expect(markup.match(/<dt /g)).toHaveLength(3);
    expect(markup.match(/Cost per task/g)).toHaveLength(1);
  }
});
