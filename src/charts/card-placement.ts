import type { CSSProperties } from 'react';

export type PlotPoint = { x: number; y: number; selected: boolean };
export type PlotBox = { left: number; right: number; top: number; bottom: number };

/**
 * Place a details card over a plot, in the corner that covers the fewest points and never the selected one.
 * Labels count for less than points, so a card can cover a label before it covers a point.
 * A card bigger than every free corner goes beside the selected point instead, on its roomier side.
 * The first corner wins ties. Coordinates are relative to the plot.
 */
export function placeCard({ corners, points, labels = [], plot, card, compact }: {
  corners: readonly CSSProperties[];
  points: readonly PlotPoint[];
  labels?: readonly PlotBox[];
  plot: { width: number; height: number };
  card: { width: number; height: number };
  /** Size overrides for narrow plots, kept when the card moves beside the point. */
  compact: CSSProperties;
}): CSSProperties {
  const cost = (place: CSSProperties) => {
    const x = typeof place.left === 'number' ? place.left : plot.width - Number(place.right) - card.width;
    const y = typeof place.top === 'number' ? place.top : plot.height - Number(place.bottom) - card.height;
    const covered = points.reduce((total, point) => {
      // The selected point needs a wider 12px berth than its neighbours.
      const margin = point.selected ? 12 : 6;
      const inside = point.x >= x - margin && point.x <= x + card.width + margin && point.y >= y - margin && point.y <= y + card.height + margin;
      return total + (inside ? (point.selected ? 1000 : 1) : 0);
    }, 0);
    const overlapped = labels.filter((label) => label.right >= x && label.left <= x + card.width && label.bottom >= y && label.top <= y + card.height);
    return covered + overlapped.length * 0.25;
  };
  const best = corners.reduce((current, next) => (cost(next) < cost(current) ? next : current));
  const selected = points.find((point) => point.selected);
  if (!selected || cost(best) < 1000) return best;
  const top = Math.max(8, Math.min(plot.height - card.height - 8, selected.y - card.height / 2));
  return {
    left: selected.x > plot.width / 2
      ? Math.max(0, selected.x - 16 - card.width)
      : Math.min(plot.width - card.width - 8, selected.x + 16),
    top,
    maxHeight: `calc(100% - ${top + 8}px)`,
    ...compact,
  };
}
