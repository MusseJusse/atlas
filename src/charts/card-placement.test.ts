import { expect, it } from 'vitest';
import { placeCard } from './card-placement';

const plot = { width: 800, height: 600 };
const card = { width: 200, height: 150 };
const corners = [
  { right: 20, bottom: 20 },
  { left: 20, top: 20 },
];

it('moves to the corner with fewer points, and counts labels for less than points', () => {
  const crowded = [{ x: 700, y: 500, selected: false }];
  expect(placeCard({ corners, points: crowded, plot, card, compact: {} })).toBe(corners[1]);
  const label = { left: 30, right: 120, top: 30, bottom: 44 };
  expect(placeCard({ corners, points: crowded, labels: [label], plot, card, compact: {} })).toBe(corners[1]);
});

it('goes beside the selected point when every corner would cover it', () => {
  const tiny = { width: 260, height: 200 };
  const points = [{ x: 130, y: 100, selected: true }];
  const place = placeCard({ corners: [{ left: 0, top: 0 }], points, plot: tiny, card, compact: { width: 120 } });
  expect(place).toMatchObject({ left: 52, width: 120 });
});

it('never covers a blocked area, even beside the selected point', () => {
  const controls = { left: 700, right: 790, top: 8, bottom: 44 };
  const topRight = { right: 20, top: 20 };
  expect(placeCard({ corners: [topRight, { left: 20, bottom: 20 }], points: [], blocked: [controls], plot, card, compact: {} })).not.toBe(topRight);
  const points = [{ x: 500, y: 60, selected: true }];
  const beside = placeCard({ corners: [topRight], points, blocked: [{ left: 0, right: 800, top: 0, bottom: 44 }], plot, card, compact: {} });
  expect(beside).toMatchObject({ top: 52 });
});
