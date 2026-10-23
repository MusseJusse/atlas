import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { models, modelColor, type Model } from '../models';
import { defaults } from '../state';
import { measureRows } from './geometry';
import { MobileBars } from './MobileBars';
import type { Metric } from '../chart-definitions';

const base = models[0]!;

function renderBars(rows: Model[], metric: Metric, descending: boolean | null = null) {
  return renderToStaticMarkup(
    <MobileBars
      rows={measureRows(rows, metric)}
      metric={metric}
      settings={{ ...defaults, descending }}
      expanded={rows[0]?.family ?? null}
      onExpand={() => {}}
    />,
  );
}

it('labels the best selected score and exposes all reasoning values in its table', () => {
  const low = { ...base, id: 'low', family: 'gpt-6-astra', name: 'GPT-6 Astra', effortLabel: 'Low', intelligence: 10 };
  const high = { ...low, id: 'high', effortLabel: 'High', effortOrder: 40, intelligence: 42 };
  const markup = renderBars([low, high, { ...low, id: 'missing', intelligence: null }], 'intelligence');
  const button = markup.match(/<button[\s\S]*?<\/button>/)?.[0];
  expect(button).toContain('42');
  expect(button).toContain('High reasoning');
  expect(button).not.toContain('Low reasoning');
  expect(markup).toContain(`background:${modelColor(high)}`);
  expect(markup).toContain('aria-expanded="true"');
  expect(markup).toContain('scope="col"');
  expect(markup).toContain('scope="row"');
  expect(markup).toContain('>Low</td>');
  expect(markup).toContain('>High</td>');
  expect(markup).not.toContain('Not measured');
});

it('uses the representative runtime provenance even when sort order reverses', () => {
  const actual = { ...base, id: 'actual', family: 'runtime', time: 30, timeEstimate: undefined };
  const estimated = {
    ...actual, id: 'estimated', time: 10, effortOrder: 60,
    timeEstimate: { baselineModelId: base.id, baselineTokens: 100, baselineFetchedAt: '2026-10-19T00:00:00Z' },
  };
  for (const descending of [false, true]) {
    const markup = renderBars([actual, estimated], 'time', descending);
    const button = markup.match(/<button[\s\S]*?<\/button>/)?.[0];
    expect(button).toContain('~10s');
    expect(markup).toContain('Lowest');
  }
  const markup = renderBars([{ ...actual, time: 5 }, estimated], 'time');
  const button = markup.match(/<button[\s\S]*?<\/button>/)?.[0];
  expect(button).toContain('5s');
  expect(button).not.toContain('~');
});
