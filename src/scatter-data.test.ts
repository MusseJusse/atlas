import { expect, it } from 'vitest';
import { models, paretoFrontier, type Model } from './models';
import { linearScale, logScale } from './scales';
import { scatterDomain, scatterRows } from './scatter-data';

const fixture = (id: string, cost: number | null, intelligence: number | null): Model => ({
  ...models[0]!,
  id,
  family: id,
  cost,
  intelligence,
});

it('keeps measured zero cost and intelligence on linear scatter and its frontier', () => {
  const free = fixture('free', 0, 20);
  const rows = [
    free,
    fixture('dominated', 1, 10),
    fixture('smarter', 2, 30),
    fixture('zero-score', 3, 0),
    fixture('missing-cost', null, 40),
    fixture('missing-score', 0, null),
  ];
  const points = scatterRows(rows, 'cost', true);
  expect(points.map((row) => row.id)).toEqual(['free', 'dominated', 'smarter', 'zero-score']);
  expect(paretoFrontier(points, 'cost').map((row) => row.id)).toEqual(['free', 'smarter']);
  expect(linearScale(scatterDomain(points, 'cost', true), [64, 900], { nice: true })(free.cost!)).toBe(64);
});

it('excludes zero and missing log measurements while preserving positive coordinates', () => {
  const rows = [
    fixture('free', 0, 20),
    fixture('paid', 2, 30),
    fixture('missing-cost', null, 40),
    fixture('missing-score', 1, null),
  ];
  const points = scatterRows(rows, 'cost', false);
  expect(points.map((row) => row.id)).toEqual(['paid']);
  const domain = scatterDomain(points, 'cost', false);
  expect(domain).toEqual([1.4, 2.16]);
  const x = logScale(domain, [46, 356]);
  expect(x(points[0]!.cost!)).toBeGreaterThan(46);
  expect(x(points[0]!.cost!)).toBeLessThan(356);
  expect(scatterRows([rows[0]!], 'cost', false)).toEqual([]);
});

it('plots an all-zero selection at the linear origin on desktop and phone', () => {
  const selected = [fixture('free', 0, 13.13), fixture('free-smarter', 0, 20)];
  const points = scatterRows(selected, 'cost', true);
  expect(points).toEqual(selected);
  const domain = scatterDomain(points, 'cost', true);
  expect(domain[1]).toBeGreaterThan(domain[0]);
  for (const range of [[64, 900], [46, 356]] as const) {
    const x = linearScale(domain, range, { nice: true });
    expect(x.ticks(4).every(Number.isFinite)).toBe(true);
    expect(points.map((row) => x(row.cost!))).toEqual(points.map(() => range[0]));
  }
  expect(scatterRows(selected, 'cost', false)).toEqual([]);
});

it('uses the same zero and null rules for tokens scatter', () => {
  const rows = [
    { ...fixture('zero', 1, 20), tokens: 0 },
    { ...fixture('positive', 1, 30), tokens: 100 },
    { ...fixture('missing', 1, 40), tokens: null },
  ];
  expect(scatterRows(rows, 'tokens', true).map((row) => row.id)).toEqual(['zero', 'positive']);
  expect(scatterRows(rows, 'tokens', false).map((row) => row.id)).toEqual(['positive']);
});
