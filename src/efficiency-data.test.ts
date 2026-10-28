import { expect, it } from 'vitest';
import { costMultiplier, efficiencySeries } from './efficiency-data';

const fixture = (
  id: string,
  released: string | null,
  intelligence: number | null,
  cost: number | null,
) => ({ id, released, intelligence, cost });

it('compares each record with the first cost at its own threshold', () => {
  const lines = efficiencySeries([
    fixture('first', '2026-01-01', 30, 10),
    fixture('higher', '2026-02-01', 40, 5),
    fixture('latest', '2026-03-01', 40, 2),
  ]);
  expect(costMultiplier(lines[2]!, lines[2]!.points[2]!)).toBe(5);
  expect(costMultiplier(lines[3]!, lines[3]!.points[1]!)).toBe(2.5);
  expect(costMultiplier(lines[3]!, lines[3]!.points[0]!)).toBe(1);
});

it('keeps strict cost records in release order without changing the input', () => {
  const rows = [
    fixture('last', '2026-03-01', 40, 0.5),
    fixture('first', '2026-01-01', 40, 2),
    fixture('worse', '2026-02-01', 40, 3),
    fixture('equal', '2026-02-10', 40, 2),
    fixture('middle', '2026-02-20', 40, 1),
  ];
  const original = [...rows];
  const series = efficiencySeries(rows);
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
  const series = efficiencySeries(rows);
  expect(series[2]!.points.map(({ model }) => model.id)).toEqual(['below']);
  expect(series[3]!.points.map(({ model }) => model.id)).toEqual(['exact', 'above']);
  expect(series[4]!.points.map(({ model }) => model.id)).toEqual(['above']);
});

it('keeps one deterministic winner per date and preserves its configuration', () => {
  const rows = [
    { ...fixture('z', '2026-01-01', 40, 0.5), effort: 'max' },
    { ...fixture('a', '2026-01-01', 40, 0.5), effort: 'high' },
    { ...fixture('worse', '2026-01-01', 40, 1), effort: 'low' },
  ];
  const expected = efficiencySeries(rows);
  expect(expected[3]!.points.map(({ model }) => [model.id, model.effort]))
    .toEqual([['a', 'high']]);
  expect(efficiencySeries([...rows].reverse())).toEqual(expected);
});

it('omits missing and non-positive measurements as AA does, without inventing points', () => {
  const rows = [
    fixture('no-date', null, 60, 0.1),
    fixture('no-score', '2026-01-01', null, 0.1),
    fixture('no-value', '2026-01-01', 60, null),
    fixture('zero', '2026-01-01', 60, 0),
    fixture('invalid', '2026-01-01', 60, NaN),
    fixture('measured', '2026-02-01', 60, 1),
  ];
  expect(efficiencySeries(rows)[5]!.points.map(({ model }) => model.id))
    .toEqual(['measured']);
  expect(efficiencySeries([]).every(({ points }) => points.length === 0)).toBe(true);
});

it('keeps a qualifying same-day record when a better measurement falls below its threshold', () => {
  const rows = [
    fixture('earlier', '2026-01-01', 40, 2),
    fixture('below', '2026-02-01', 39.99, 0.1),
    fixture('qualifies', '2026-02-01', 40, 1),
  ];
  const series = efficiencySeries(rows);
  expect(series[2]!.points.map(({ model }) => model.id)).toEqual(['earlier', 'below']);
  expect(series[3]!.points.map(({ model }) => model.id)).toEqual(['earlier', 'qualifies']);
});
