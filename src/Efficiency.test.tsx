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

it.each(['cost', 'speed'])('shows the shared model card and coincident %s records at the top left', (metric) => {
  vi.stubGlobal('location', { search: `?page=efficiency&metric=${metric}&thresholds=10,20` });
  const markup = renderToStaticMarkup(<Efficiency />);
  expect(markup).toContain('data-placement="top-left"');
  expect(markup).toContain('class="configuration-inspector"');
  expect(markup).toContain(metric === 'cost' ? 'Cost per task' : 'Output speed');
  expect(markup).toContain('role="group" aria-label="Record details"');
  expect(markup).toContain('<select aria-label="Threshold for overlapping records"');
  expect(markup).toContain('<option value="10:shared">Intelligence ≥ 10</option>');
  expect(markup).toContain('<option value="20:shared" selected="">Intelligence ≥ 20</option>');
  expect(markup).toContain('Shared record');
  expect(markup).toContain('High · Preview');
});

it('omits the overlap selector when only one threshold qualifies', () => {
  vi.stubGlobal('location', { search: '?page=efficiency&thresholds=10' });
  const markup = renderToStaticMarkup(<Efficiency />);
  expect(markup).not.toContain('<select');
  expect(markup).toContain('Shared record');
  expect(markup).toContain('Intelligence ≥ 10');
});

it('hides the model card when no thresholds are selected', () => {
  vi.stubGlobal('location', { search: '?page=efficiency&thresholds=' });
  expect(renderToStaticMarkup(<Efficiency />)).not.toContain('class="configuration-inspector"');
});
