import { expect, it } from 'vitest';
import { models } from '../models';
import { efficiencySeries } from '../efficiency-data';
import { efficiencyGeometry } from './efficiency-geometry';

const rows = [
  { ...models[0]!, id: 'first', released: '2026-01-01', intelligence: 40, cost: 1, speed: 100 },
  { ...models[0]!, id: 'second', released: '2026-02-01', intelligence: 40, cost: 0.1, speed: 200 },
];

it('draws steps at record dates and extends the last record only to the snapshot edge', () => {
  const lines = efficiencySeries(rows, 'cost');
  const geometry = efficiencyGeometry(lines, 'cost', 390, 360, '2026-03-01T12:00:00.000Z')!;
  const [first, second] = lines[0]!.points;
  expect(geometry.path(lines[0]!.points)).toBe(
    `M${geometry.x(Date.parse(first!.date))},${geometry.y(1)}` +
    `H${geometry.x(Date.parse(second!.date))}V${geometry.y(0.1)}H${geometry.right}`,
  );
  expect(geometry.y(0.1)).toBeGreaterThan(geometry.y(1));
  expect(geometry.xTicks.every((tick) => geometry.x(tick) >= geometry.left && geometry.x(tick) <= geometry.right)).toBe(true);
  expect(lines[0]!.points).toHaveLength(2);
});

it('keeps cost ratios logarithmic and speed differences linear at readable viewport sizes', () => {
  for (const width of [320, 1200]) {
    const cost = efficiencyGeometry(efficiencySeries(rows, 'cost'), 'cost', width, 360, '2026-03-01')!;
    expect(cost.y(Math.sqrt(0.1))).toBeCloseTo((cost.y(0.1) + cost.y(1)) / 2);
    const speed = efficiencyGeometry(efficiencySeries(rows, 'speed'), 'speed', width, 360, '2026-03-01')!;
    expect(speed.y(150)).toBeCloseTo((speed.y(100) + speed.y(200)) / 2);
    expect(speed.yTicks).toContain(0);
    expect(speed.right).toBeGreaterThan(speed.left);
  }
  const longRange = efficiencyGeometry(efficiencySeries(rows, 'cost'), 'cost', 390, 360, '2027-10-27')!;
  expect(longRange.xTicks.at(-1)).toBe(Date.UTC(2027, 9, 1));
});

it('handles single dates, equal values, and empty series without invalid coordinates', () => {
  const lines = efficiencySeries([rows[0]!], 'cost');
  const geometry = efficiencyGeometry(lines, 'cost', 390, 360, '2026-01-01')!;
  expect(geometry.path(lines[0]!.points)).not.toMatch(/NaN|Infinity/);
  expect(geometry.path([])).toBe('');
  expect(efficiencyGeometry(efficiencySeries([], 'cost'), 'cost', 390, 360, '2026-01-01')).toBeNull();
});
