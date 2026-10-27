import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { Efficiency } from './Efficiency';

vi.mock('virtual:benchmarks', async () => {
  const { default: baseline } = await import('./data/benchmarks.json');
  return {
    default: {
      fetchedAt: '2026-10-26T12:00:00.000Z',
      models: [{
        ...baseline.models[0], id: 'shared', name: 'Shared record', effortLabel: 'High',
        released: '2026-09-22', intelligence: 25, cost: 0.1, speed: 100,
      }],
    },
  };
});

afterEach(() => vi.unstubAllGlobals());

it('waits for a hovered or pinned point before showing the model card', () => {
  vi.stubGlobal('location', { search: '?page=efficiency&thresholds=10,20' });
  const markup = renderToStaticMarkup(<Efficiency />);
  expect(markup).not.toContain('class="configuration-inspector"');
  expect(markup).not.toContain('<select');
});
