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

it('keeps the mobile readout closed initially and makes full measurement labels accessible', () => {
  const markup = render(sol, true);
  const summary = markup.slice(markup.indexOf('<summary'), markup.indexOf('</summary>'));
  expect(markup).toContain('<details');
  expect(markup).not.toMatch(/<details[^>]*\sopen(?:[\s=>])/);
  for (const label of ['Intelligence index', 'Cost per task', 'Time per task', 'Tokens per task', 'Output tokens / s'])
    expect(summary).toContain(label);
  expect(summary).toContain('$0.393');
  expect(markup).toContain('View source');
  expect(markup).toContain('$2.00');
  expect(markup).toContain('$10.00');
});

it('shows missing values as unavailable and preserves the estimate marker and source', () => {
  const endpoint = speedEndpoints[0]!;
  const markup = render(endpoint, true);
  const summary = markup.slice(markup.indexOf('<summary'), markup.indexOf('</summary>'));
  expect(summary.match(/title="Not measured"/g)).toHaveLength(3);
  expect(summary).toContain('~39s');
  expect(markup).toContain('Not measured');
  expect(markup).toContain(endpoint.speedSource.url);
  expect(markup).toContain('Local time estimate');
  expect(render(endpoint, false)).not.toContain('<details');
});
