import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { Changelog } from './Changelog';
import type { ChangeHistory } from './data/changelog';

const history: ChangeHistory = {
  source: 'https://artificialanalysis.ai/models',
  baselineFetchedAt: '2026-10-13T20:47:14.735Z',
  updates: [
    {
      checkedAt: '2026-10-18T02:23:00.000Z',
      previousFetchedAt: '2026-10-13T20:47:14.735Z',
      fetchedAt: '2026-10-17T12:00:00.000Z',
      changes: [
        {
          id: 'example',
          name: 'Example <model>',
          effortLabel: 'Max',
          kind: 'added',
          fields: [
            { field: 'speed', before: null, after: 0 },
            { field: 'deprecated', before: false, after: true },
            { field: 'cost', before: 0.0000000000001, after: 0.0000000000002 },
          ],
        },
        { id: 'updated', name: 'Updated model', effortLabel: 'Max', kind: 'updated', fields: [] },
        { id: 'removed', name: 'Removed model', effortLabel: 'Max', kind: 'removed', fields: [] },
      ],
    },
  ],
};

it('defaults to added changes and preserves exact field values', () => {
  const markup = renderToStaticMarkup(<Changelog history={history} />);
  expect(markup).toMatch(/<button[^>]*aria-pressed="true"[^>]*>Added<\/button>/);
  expect(markup).not.toContain('Updated model');
  expect(markup).not.toContain('Removed model');
  expect(markup).toContain('1 change shown');
  expect(markup).toContain('Example &lt;model&gt;');
  expect(markup).toContain('Not available');
  expect(markup).toContain('0 tok/s');
  expect(markup).toContain('No</td>');
  expect(markup).toContain('Yes</td>');
  expect(markup).toContain('$1e-13');
  expect(markup).toContain('$2e-13');
  expect(markup).toContain('18 Oct 2026, 02:23 UTC');
  expect(markup).toContain('17 Oct 2026, 12:00 UTC');
});

it('lists each model from no reasoning up to max', () => {
  const [batch] = history.updates;
  const changes = ['xhigh', 'high', 'Non-reasoning', 'low'].map((effortLabel) => ({
    id: `neon-${effortLabel}`, name: 'Neon', effortLabel, kind: 'added' as const, fields: [],
  }));
  const markup = renderToStaticMarkup(<Changelog history={{ ...history, updates: [{ ...batch!, changes }] }} />);
  expect([...markup.matchAll(/Neon <span[^>]*>([^<]+)</g)].map(([, effort]) => effort)).toEqual(['non-reasoning', 'low', 'high', 'xhigh']);
});

it('explains the baseline without inventing historical additions', () => {
  const markup = renderToStaticMarkup(<Changelog history={{ ...history, updates: [] }} />);
  expect(markup).toContain('No changes recorded yet.');
  expect(markup).toContain('13 October 2026');
  expect(markup).not.toContain('<article');
});
