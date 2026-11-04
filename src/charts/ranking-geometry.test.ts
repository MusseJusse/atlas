import { expect, it } from 'vitest';
import { dodgeConfigurations, durationTicks } from './ranking-geometry';

it('dodges overlapping configurations deterministically within the plot row', () => {
  const points = Array.from({ length: 7 }, (_, index) => ({ id: String(index), x: 0 }));
  const dodged = dodgeConfigurations(points);
  expect(dodgeConfigurations(points.toReversed())).toEqual(dodged);
  const markers = [...dodged.values()];
  for (const marker of markers) expect(Math.abs(marker.offset) + marker.size / 2).toBeLessThan(16);
  for (let index = 1; index < markers.length; index++) {
    expect(markers[index]!.offset - markers[index - 1]!.offset).toBeGreaterThan(markers[index]!.size);
  }
  expect(dodgeConfigurations([{ id: 'a', x: 0 }, { id: 'b', x: 12 }]).get('a')?.offset).toBe(0);
  expect(points.every((point) => point.x === 0)).toBe(true);
});

it('uses whole five-minute ticks for a twenty-minute task range', () => {
  expect(durationTicks(1260)).toEqual([0, 300, 600, 900, 1200]);
  expect(durationTicks(20)).toEqual([0, 5, 10, 15, 20]);
});
