import { expect, it } from 'vitest';
import { chartAtLine } from './useChartNavigation';

it('tracks a tall phone chart throughout its body without a visibility ratio', () => {
  const sections = [
    { id: 'cost-intelligence', top: -1000 },
    { id: 'intelligence', top: -500 },
    { id: 'cost', top: 18858 },
  ];
  expect(chartAtLine(sections, 181)).toBe('intelligence');
  expect(chartAtLine(sections.map(({ id, top }) => ({ id, top: top - 18000 })), 181))
    .toBe('intelligence');
});

it('switches in either direction exactly when a section start crosses the line', () => {
  const sections = [
    { id: 'cost-intelligence', top: -500 },
    { id: 'intelligence', top: 181 },
    { id: 'cost', top: 19539 },
  ];
  expect(chartAtLine(sections, 181)).toBe('intelligence');
  expect(chartAtLine(sections, 180)).toBe('cost-intelligence');
});

it('uses the feed midpoint for adjacent desktop charts and keeps the end charts selected', () => {
  const sections = [{ id: 'first', top: -100 }, { id: 'last', top: 500 }];
  expect(chartAtLine(sections, 400)).toBe('first');
  expect(chartAtLine(sections, 600)).toBe('last');
  expect(chartAtLine(sections, -200)).toBe('first');
  expect(chartAtLine(sections, 2000)).toBe('last');
  expect(chartAtLine([], 400)).toBeUndefined();
});
