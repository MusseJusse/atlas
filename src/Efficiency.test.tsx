import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { Efficiency } from './Efficiency';

vi.mock('virtual:benchmarks', async () => {
  const { default: baseline } = await import('./data/benchmarks.json');
  const record = (id: string, released: string, intelligence: number, cost: number) => ({
    ...baseline.models[0], id, name: id, effortLabel: 'High', released, intelligence, cost,
  });
  return {
    default: {
      fetchedAt: '2026-10-26T12:00:00.000Z',
      models: [record('First', '2026-07-01', 45, 8), record('Cheaper', '2026-09-01', 42, 0.5)],
    },
  };
});

it('leads with the biggest price drop and keeps every row closed until opened', () => {
  const markup = renderToStaticMarkup(<Efficiency />);
  expect(markup).toContain('Reaching 10 on the Intelligence index costs 16× less than in July.');
  expect(markup).toContain('Score ≥ 40: $8.00 to $0.50, 16× cheaper in 2 months');
  expect(markup).toContain('No model with a measured cost reaches this score yet.');
  expect(markup).not.toContain('aria-expanded="true"');
  expect(markup.match(/<ol [^>]*hidden/g)).toHaveLength(4);
});
