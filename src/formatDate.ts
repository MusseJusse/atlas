export function formatUtcDate(value: string, month: 'short' | 'long' = 'long') {
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month,
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatUtcDateTime(value: string) {
  return `${formatUtcDate(value)}, ${new Date(value).toISOString().slice(11, 16)} UTC`;
}
