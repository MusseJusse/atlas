import { expect, it } from 'vitest';
import { formatUtcDate, formatUtcDateTime } from './formatDate';

it('preserves abbreviated and long dates on the UTC day', () => {
  const value = '2026-10-19T23:30:00-02:00';
  expect(formatUtcDate(value, 'short')).toBe('20 Oct 2026');
  expect(formatUtcDate(value)).toBe('20 October 2026');
  expect(formatUtcDate('2026-09-21T00:00:00Z', 'short')).toBe('21 Sep 2026');
  expect(formatUtcDate('2026-09-21T00:00:00Z')).toBe('21 September 2026');
});

it('uses the UTC date and zero-padded time across a year boundary', () => {
  expect(formatUtcDateTime('2027-01-01T01:05:59+02:00')).toBe('31 December 2026, 23:05 UTC');
  expect(formatUtcDateTime('2026-10-20T00:05:59Z')).toBe('20 October 2026, 00:05 UTC');
});
