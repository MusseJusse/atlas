import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { Vibes } from './Vibes';

it('renders the Vibes page without Muse and waits for a selection before showing details', () => {
  const markup = renderToStaticMarkup(<Vibes />);
  expect(markup).toContain('aria-current="page"');
  expect(markup).toContain('data-axis-label="capability"');
  expect(markup).toContain('data-axis-label="coherency"');
  expect(markup).toContain('at its best, what can it do');
  expect(markup).toContain('does it understand what it&#x27;s doing');
  expect(markup).toContain('GPT-6.1 Terra');
  expect(markup).not.toContain('Muse');
  expect(markup).not.toContain('class="configuration-inspector"');
});
