/** Keep exact X coordinates while separating nearby configurations inside a row. */
export function dodgeConfigurations(points: readonly { id: string; x: number }[]) {
  const sorted = points.toSorted((a, b) => a.x - b.x || a.id.localeCompare(b.id));
  const clusters: (typeof sorted)[] = [];
  for (const point of sorted) {
    const cluster = clusters.at(-1);
    if (cluster && point.x - cluster.at(-1)!.x < 10) cluster.push(point);
    else clusters.push([point]);
  }
  return new Map(clusters.flatMap((cluster) => {
    const step = Math.min(10, 30 / cluster.length);
    return cluster.map((point, index) => [point.id, {
      offset: (index - (cluster.length - 1) / 2) * step,
      size: Math.min(8, step - 1),
    }] as const);
  }));
}

/** Prefer familiar seconds/minutes/hours instead of decimal-minute intervals. */
export function durationTicks(maximum: number) {
  const steps = [1, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200, 14400, 21600, 43200, 86400];
  const step = steps.find((candidate) => candidate >= maximum / 5) ?? Math.ceil(maximum / 5 / 86400) * 86400;
  return Array.from({ length: Math.floor(maximum / step) + 1 }, (_, index) => index * step);
}
