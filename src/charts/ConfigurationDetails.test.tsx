import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { models, type Model } from '../models';
import { speedEndpoints } from '../data/speed-endpoints';
import { ConfigurationDetails } from './ConfigurationDetails';

const sol = models.find((model) => model.id === 'gpt-6-1-sol-xhigh')!;

function render(model: Model, mobile: boolean) {
  return renderToStaticMarkup(
    <ConfigurationDetails
      model={model}
      metric="cost"
      mobile={mobile}
      pinned
      variants={[model]}
      onSelect={() => {}}
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
  expect(desktop).toContain('View source');
  expect(desktop).toContain('$2.00');
  expect(desktop).toContain('$10.00');
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
