import { expect, it } from 'vitest';
import { allowanceDate } from './PricingDetails';

it('reads allowance days, months, and ranges without ever printing Invalid Date', () => {
  expect(allowanceDate('2026-11-11')).toBe('11 Nov 2026');
  expect(allowanceDate('2026-09-08~2026-10-30')).toBe('8 Sep 2026 to 30 Oct 2026');
  expect(allowanceDate('2026-08')).toBe('Aug 2026');
  expect(allowanceDate('soon')).toBe('soon');
});
