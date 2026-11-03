import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { formatModelValue, models, type Model } from '../models';
import { speedEndpoints } from '../data/speed-endpoints';
import type { Metric } from '../chart-definitions';
import { ConfigurationDetails } from './ConfigurationDetails';

// Fix formatting inputs so upstream benchmark changes do not alter these UI assertions.
const sol = { ...models.find((model) => model.id === 'gpt-6-1-sol-xhigh')!, cost: 0.393 };

function render(model: Model, metric: Metric = 'cost') {
  return renderToStaticMarkup(
    <ConfigurationDetails
      model={model}
      metric={metric}
      pinned
      onClose={() => {}}
    />,
  );
}

it('shows the full model identity and accessible measurement labels', () => {
  const opus = models.find((model) => model.id === 'claude-opus-5-5-xhigh')!;
  const markup = render(opus);
  expect(markup).toContain(opus.name);
  expect(markup).toContain('src="/logos/anthropic.svg"');
  for (const label of ['Intelligence index', 'Cost per task', 'Total tokens'])
    expect(markup).toContain(label);

  const solMarkup = render(sol);
  expect(solMarkup).toContain('$0.393');
  expect(solMarkup).toContain('Artificial Analysis');
});

it('shows missing values as unavailable and preserves the estimate marker and source', () => {
  const endpoint = { ...speedEndpoints[0]!, time: 39.2 };
  const markup = render(endpoint, 'time');
  expect(markup).toContain('Not measured');
  expect(markup).toContain('~39s');
  expect(markup).toContain(endpoint.speedSource.url);
  expect(markup).toContain('Local time estimate');
});

it('shows the active chart metric and supporting values without duplicate rows', () => {
  const totalTokens = render(sol, 'tokensTotal');
  expect(totalTokens).toContain('Total tokens');
  expect(totalTokens).toContain(formatModelValue(sol, 'tokensTotal'));
  expect(totalTokens.match(/<dt /g)).toHaveLength(3);
  for (const metric of ['cost', 'intelligence', 'omniscience'] as const) {
    const markup = render(sol, metric);
    expect(markup.match(/<dt /g)).toHaveLength(3);
    expect(markup.match(/Cost per task/g)).toHaveLength(1);
  }
});

it('shows the agent configuration, coding score and agent cost with the correct source', async () => {
  const { codingAgents } = await import('../data/coding-agents');
  const sol = codingAgents.find((row) => row.family === 'gpt-6-1-sol')!;
  const markup = render(sol);
  expect(markup).toContain('Codex - GPT-6.1 Sol (max)');
  expect(markup).toContain('Coding Agent Index v2.0');
  expect(markup).toContain('54.1');
  expect(markup).toContain('$1.50');
  expect(markup).toContain('href="https://artificialanalysis.ai/agents/coding-agents"');
  expect(markup).not.toContain('Intelligence index');
  expect(markup).not.toContain('Total tokens');
  expect(markup.match(/<dt /g)).toHaveLength(2);
});

it('shows Cyber scores and costs with the evaluation source and fallback settings', async () => {
  const { cyberModels } = await import('../data/cyber-index');
  const opus = cyberModels.find((row) => row.family === 'claude-opus-5-5')!;
  const markup = render(opus);
  expect(markup).toContain('Max, Default Fallback');
  expect(markup).toContain('Cyber Index');
  expect(markup).toContain('28.7');
  expect(markup).toContain('$9.75');
  expect(markup).toContain('href="https://artificialanalysis.ai/evaluations/artificial-analysis-cyber-index"');
  expect(markup).not.toContain('Intelligence index');
  expect(markup.match(/<dt /g)).toHaveLength(2);
  const trusted = cyberModels.find((row) => row.cyber?.trustedAccess)!;
  expect(render(trusted)).toContain('trusted access');
});

it('shows the selected coding score and existing cost in the main scatter details', () => {
  const markup = renderToStaticMarkup(
    <ConfigurationDetails
      model={{ ...sol, codingIndex: 43.25 }}
      metric="cost"
      score="codingIndex"
      pinned
      onClose={() => {}}
    />,
  );
  expect(markup).toContain('Coding score');
  expect(markup).toContain('43.3');
  expect(markup).toContain('$0.393');
  expect(markup).not.toContain('Intelligence index');
  expect(markup).not.toContain('Coding Agent Index');
});

it('distinguishes subscription estimates and API fallbacks with provenance', async () => {
  const { subscriptionRows } = await import('../data/subscriptions');
  const { defaults } = await import('../state');
  const [priced] = subscriptionRows([sol], { ...defaults, pricingMode: 'subscription' });
  const markup = render(priced!);
  expect(markup).toContain('Estimated subscription / task');
  expect(markup).toContain('Measured API / task');
  expect(markup).toContain('External coding token mix');
  expect(markup).toContain('ChatGPT Pro 10x');
  const [fallback] = subscriptionRows([{ ...sol, family: 'unknown' }], { ...defaults, pricingMode: 'subscription' });
  expect(render(fallback!)).toContain('API fallback');
  expect(render(fallback!)).not.toContain('Estimated subscription / task');
  expect(render(sol)).toContain('Cost per task · API');
});
