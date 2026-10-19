import { expect, it, vi } from 'vitest';
import { models } from '../models';
import { pinHandlers } from './interactions';

it('runs the same pin action for mouse, Enter and Space after cancelling delayed hover', () => {
  const model = models[0]!;
  let pinnedId: string | null = null;
  const events: string[] = [];
  const handlers = pinHandlers(model, (selected) => {
    events.push('pin');
    pinnedId = pinnedId === selected.id ? null : selected.id;
  }, () => events.push('cancel hover'));
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
  expect(events).toEqual(Array.from({ length: 4 }, () => ['cancel hover', 'pin']).flat());
});

it('leaves other keys and their default browser actions alone', () => {
  const togglePin = vi.fn();
  const cancelHover = vi.fn();
  const preventDefault = vi.fn();
  const handlers = pinHandlers(models[0]!, togglePin, cancelHover);
  for (const key of ['Escape', 'Tab', 'ArrowDown']) handlers.onKeyDown({ key, preventDefault });
  expect(togglePin).not.toHaveBeenCalled();
  expect(cancelHover).not.toHaveBeenCalled();
  expect(preventDefault).not.toHaveBeenCalled();
});
