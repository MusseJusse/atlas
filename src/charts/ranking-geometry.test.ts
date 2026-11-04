import { expect, it } from 'vitest';
import { overlappingConfigurations, durationTicks } from './ranking-geometry';

it('counts close configurations without changing their positions', () => {
  const points = [{ id: 'a', x: 0 }, { id: 'b', x: 4 }, { id: 'c', x: 20 }, { id: 'd', x: 24 }, { id: 'e', x: 40 }];
  expect(overlappingConfigurations(points)).toBe(4);
  expect(overlappingConfigurations(points.toReversed())).toBe(4);
  expect(overlappingConfigurations([{ id: 'a', x: 0 }, { id: 'b', x: 10 }])).toBe(0);
  expect(overlappingConfigurations(Array.from({ length: 7 }, (_, index) => ({ id: String(index), x: 0 })))).toBe(7);
  expect(points.map((point) => point.x)).toEqual([0, 4, 20, 24, 40]);
});

it('uses whole five-minute ticks for a twenty-minute task range', () => {
  expect(durationTicks(1260)).toEqual([0, 300, 600, 900, 1200]);
  expect(durationTicks(20)).toEqual([0, 5, 10, 15, 20]);
});
