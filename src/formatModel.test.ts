import { expect, it } from 'vitest';
import { format } from './formatModel';

it('keeps adjacent low subscription cost ticks distinct and nonzero', () => {
  const ticks = [0.0001, 0.0002, 0.0005, 0.001, 0.002, 0.005];
  const labels = ticks.map((tick) => format(tick, 'cost', true));
  expect(labels).toEqual(['$0.0001', '$0.0002', '$0.0005', '$0.001', '$0.002', '$0.005']);
  expect(new Set(labels).size).toBe(ticks.length);
  expect(format(0.0000002, 'cost', true)).toBe('$0.0000002');
});

it('retains ordinary cost formatting and true zero while preserving small detail values', () => {
  expect(format(0, 'cost', true)).toBe('$0');
  expect(format(0, 'cost')).toBe('$0.00');
  expect(format(1.25, 'cost')).toBe('$1.25');
  expect(format(null, 'cost')).toBe('Not measured');
  expect(format(0.00053241, 'cost')).toBe('$0.000532');
});
