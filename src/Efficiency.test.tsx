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

it.each(['cost', 'speed'])('lets each coincident %s record be chosen in the detail strip', (metric) => {
  vi.stubGlobal('location', { search: `?page=efficiency&metric=${metric}&thresholds=10,20` });
  const markup = renderToStaticMarkup(<Efficiency />);
  expect(markup).toContain('role="group" aria-label="Record details"');
  expect(markup).toContain('<select aria-label="Threshold for overlapping records"');
  expect(markup).toContain('<option value="10:shared">≥ 10</option>');
  expect(markup).toContain('<option value="20:shared" selected="">≥ 20</option>');
  expect(markup).toContain('Shared record, High');
});

it('omits the overlap selector when only one threshold qualifies', () => {
  vi.stubGlobal('location', { search: '?page=efficiency&thresholds=10' });
  const markup = renderToStaticMarkup(<Efficiency />);
  expect(markup).not.toContain('<select');
  expect(markup).toContain('Shared record, High');
});
