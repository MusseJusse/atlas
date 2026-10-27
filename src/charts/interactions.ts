import type { KeyboardEvent } from 'react';
import type { Model } from '../models';

export type Interactions = {
  activeModel: Model | null;
  pinned: Model | null;
  highlighted: string | null;
  hover: (model: Model | null) => void;
  togglePin: (model: Model) => void;
  highlight: (family: string | null) => void;
};

/** SVG buttons share mouse and keyboard activation. */
export function pinHandlers<Row>(
  model: Row,
  togglePin: (model: Row) => void,
) {
  function onClick() {
    togglePin(model);
  }
  return {
    onClick,
    onKeyDown(event: Pick<KeyboardEvent<SVGGElement>, 'key' | 'preventDefault'>) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onClick();
      }
    },
  };
}

/** Resolve overlapping hit areas by distance; later entries win exact ties. */
export function nearestPoint<Row extends { x: number; y: number }>(
  points: readonly Row[],
  x: number,
  y: number,
  radius: number,
) {
  let nearest: Row | null = null;
  let distance = radius * radius;
  for (const point of points) {
    const squared = (point.x - x) ** 2 + (point.y - y) ** 2;
    if (squared <= distance) {
      nearest = point;
      distance = squared;
    }
  }
  return nearest;
}
