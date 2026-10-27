import { expect, it, vi } from 'vitest';
import { models } from '../models';
import { nearestPoint, pinHandlers } from './interactions';

it('runs the same pin action for mouse, Enter and Space', () => {
  const model = models[0]!;
  let pinnedId: string | null = null;
  const events: string[] = [];
  const handlers = pinHandlers(model, (selected) => {
    events.push('pin');
    pinnedId = pinnedId === selected.id ? null : selected.id;
  });
  handlers.onClick();
  expect(pinnedId).toBe(model.id);
  const preventDefault = vi.fn();
  handlers.onKeyDown({ key: 'Enter', preventDefault });
  expect(pinnedId).toBeNull();
  handlers.onKeyDown({ key: ' ', preventDefault });
  expect(pinnedId).toBe(model.id);
  handlers.onClick();
  expect(pinnedId).toBeNull();
  expect(preventDefault).toHaveBeenCalledTimes(2);
  expect(events).toEqual(Array.from({ length: 4 }, () => 'pin'));
});

it('leaves other keys and their default browser actions alone', () => {
  const togglePin = vi.fn();
  const preventDefault = vi.fn();
  const handlers = pinHandlers(models[0]!, togglePin);
  for (const key of ['Escape', 'Tab', 'ArrowDown']) handlers.onKeyDown({ key, preventDefault });
  expect(togglePin).not.toHaveBeenCalled();
  expect(preventDefault).not.toHaveBeenCalled();
});

it('selects the closest visible point when neighboring hit areas overlap', () => {
  const first = { id: 'first', x: 10, y: 10 };
  const second = { id: 'second', x: 14, y: 12 };
  expect(nearestPoint([first, second], 10, 10, 13)).toBe(first);
  expect(nearestPoint([second, first], 14, 12, 13)).toBe(second);
  expect(nearestPoint([first, second], 13, 12, 13)).toBe(second);
});

it('resolves exact overlaps consistently and ignores points beyond the hit radius', () => {
  const points = [{ threshold: 10, x: 5, y: 5 }, { threshold: 20, x: 5, y: 5 }];
  expect(nearestPoint(points, 5, 5, 13)).toBe(points[1]);
  expect(nearestPoint(points, 18, 5, 13)).toBe(points[1]);
  expect(nearestPoint(points, 18.1, 5, 13)).toBeNull();
  expect(nearestPoint([], 5, 5, 13)).toBeNull();
});
