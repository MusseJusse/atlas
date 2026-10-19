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

/** SVG buttons share mouse/keyboard activation, including pending hover cancellation. */
export function pinHandlers(
  model: Model,
  togglePin: Interactions['togglePin'],
  beforeActivate?: () => void,
) {
  function onClick() {
    beforeActivate?.();
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
