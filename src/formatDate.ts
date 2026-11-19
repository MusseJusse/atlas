export function formatUtcDate(value: string, month: 'short' | 'long' = 'long') {
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month,
    year: 'numeric',
    timeZone: 'UTC',
  // en-GB abbreviates September as "Sept"; match the three-letter form of every other month.
  }).replace('Sept', 'Sep');
}

export function formatUtcDateTime(value: string, month: 'short' | 'long' = 'long') {
  return `${formatUtcDate(value, month)}, ${new Date(value).toISOString().slice(11, 16)} UTC`;
}
