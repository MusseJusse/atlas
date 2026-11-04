/** Count configurations whose markers overlap at the current scale. Never move their coordinates. */
export function overlappingConfigurations(points: readonly { id: string; x: number }[]) {
  const sorted = points.toSorted((a, b) => a.x - b.x);
  const overlapping = new Set<string>();
  for (let index = 1; index < sorted.length; index++) {
    const previous = sorted[index - 1]!;
    const current = sorted[index]!;
    if (current.x - previous.x < 10) {
      overlapping.add(previous.id);
      overlapping.add(current.id);
    }
  }
  return overlapping.size;
}

/** Prefer familiar seconds/minutes/hours instead of decimal-minute intervals. */
export function durationTicks(maximum: number) {
  const steps = [1, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200, 14400, 21600, 43200, 86400];
  const step = steps.find((candidate) => candidate >= maximum / 5) ?? Math.ceil(maximum / 5 / 86400) * 86400;
  return Array.from({ length: Math.floor(maximum / step) + 1 }, (_, index) => index * step);
}
