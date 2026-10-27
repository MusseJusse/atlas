import { expect, it } from 'vitest';
import { efficiencySeries } from './efficiency-data';

const fixture = (
  id: string,
  released: string | null,
  intelligence: number | null,
  cost: number | null,
  speed: number | null = 100,
) => ({ id, released, intelligence, cost, speed });

it('keeps strict cost records in release order without changing the input', () => {
  const rows = [
    fixture('last', '2026-03-01', 40, 0.5),
    fixture('first', '2026-01-01', 40, 2),
    fixture('worse', '2026-02-01', 40, 3),
    fixture('equal', '2026-02-10', 40, 2),
    fixture('middle', '2026-02-20', 40, 1),
  ];
  const original = [...rows];
  const series = efficiencySeries(rows, 'cost');
  expect(series.map((line) => line.threshold)).toEqual([10, 20, 30, 40, 50, 60]);
  expect(series[0]!.points.map(({ date, value, model }) => [date, value, model.id])).toEqual([
    ['2026-01-01', 2, 'first'],
    ['2026-02-20', 1, 'middle'],
    ['2026-03-01', 0.5, 'last'],
  ]);
  expect(series[4]!.points).toEqual([]);
  expect(rows).toEqual(original);
});

it('uses inclusive thresholds without rounding intelligence scores', () => {
  const rows = [
    fixture('below', '2026-01-01', 39.99, 0.1),
    fixture('exact', '2026-02-01', 40, 1),
    fixture('above', '2026-03-01', 50.01, 0.8),
  ];
  const series = efficiencySeries(rows, 'cost');
  expect(series[2]!.points.map(({ model }) => model.id)).toEqual(['below']);
  expect(series[3]!.points.map(({ model }) => model.id)).toEqual(['exact', 'above']);
  expect(series[4]!.points.map(({ model }) => model.id)).toEqual(['above']);
});

it('uses increasing output speed records independently of cost', () => {
  const rows = [
    fixture('first', '2026-01-01', 30, null, 100),
    fixture('slower', '2026-02-01', 30, 0.1, 80),
    fixture('faster', '2026-03-01', 30, null, 200),
    fixture('same', '2026-04-01', 30, 0.01, 200),
  ];
  expect(efficiencySeries(rows, 'speed')[2]!.points.map(({ model }) => model.id))
    .toEqual(['first', 'faster']);
});

it('keeps one deterministic winner per date and preserves its configuration', () => {
  const rows = [
    { ...fixture('z', '2026-01-01', 40, 0.5, 200), effort: 'max' },
    { ...fixture('a', '2026-01-01', 40, 0.5, 200), effort: 'high' },
    { ...fixture('worse', '2026-01-01', 40, 1, 100), effort: 'low' },
  ];
  for (const metric of ['cost', 'speed'] as const) {
    const expected = efficiencySeries(rows, metric);
    expect(expected[3]!.points.map(({ model }) => [model.id, model.effort]))
      .toEqual([['a', 'high']]);
    expect(efficiencySeries([...rows].reverse(), metric)).toEqual(expected);
  }
});

it('omits missing and non-positive measurements as AA does, without inventing points', () => {
  const rows = [
    fixture('no-date', null, 60, 0.1, 400),
    fixture('no-score', '2026-01-01', null, 0.1, 400),
    fixture('no-value', '2026-01-01', 60, null, null),
    fixture('zero', '2026-01-01', 60, 0, 0),
    fixture('invalid', '2026-01-01', 60, NaN, Infinity),
    fixture('measured', '2026-02-01', 60, 1, 100),
  ];
  for (const metric of ['cost', 'speed'] as const)
    expect(efficiencySeries(rows, metric)[5]!.points.map(({ model }) => model.id))
      .toEqual(['measured']);
  expect(efficiencySeries([], 'cost').every(({ points }) => points.length === 0)).toBe(true);
});

it('keeps a qualifying same-day record when a better measurement falls below its threshold', () => {
  const rows = [
    fixture('earlier', '2026-01-01', 40, 2, 50),
    fixture('below', '2026-02-01', 39.99, 0.1, 500),
    fixture('qualifies', '2026-02-01', 40, 1, 100),
  ];
  for (const metric of ['cost', 'speed'] as const) {
    const series = efficiencySeries(rows, metric);
    expect(series[2]!.points.map(({ model }) => model.id)).toEqual(['earlier', 'below']);
    expect(series[3]!.points.map(({ model }) => model.id)).toEqual(['earlier', 'qualifies']);
  }
});
