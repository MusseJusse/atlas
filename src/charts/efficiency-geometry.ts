import type { EfficiencyLine, EfficiencyMetric, EfficiencyPoint } from '../efficiency-data';
import { linearScale, logScale } from '../scales';

/** Keep axes fixed while thresholds are toggled, using every series in this snapshot. */
export function efficiencyGeometry(
  lines: readonly EfficiencyLine[],
  metric: EfficiencyMetric,
  width: number,
  height: number,
  fetchedAt: string,
) {
  const points = lines.flatMap((line) => line.points);
  if (!points.length) return null;
  const left = 72;
  const right = width - 24;
  const top = 24;
  const bottom = height - 52;
  const first = new Date(Math.min(...points.map((point) => Date.parse(point.date))));
  const start = Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1);
  const end = Math.max(Date.parse(fetchedAt.slice(0, 10)), ...points.map((point) => Date.parse(point.date)));
  const x = linearScale([start, Math.max(start + 86_400_000, end)], [left, right]);
  const values = points.map((point) => point.value);
  const minPower = Math.floor(Math.log10(Math.min(...values)));
  const maxPower = Math.max(minPower + 1, Math.ceil(Math.log10(Math.max(...values))));
  const y = metric === 'cost'
    ? logScale([10 ** minPower, 10 ** maxPower], [bottom, top])
    : linearScale([0, Math.max(...values) * 1.08], [bottom, top], { nice: true });
  const yTicks = metric === 'cost'
    ? Array.from({ length: maxPower - minPower + 1 }, (_, index) => 10 ** (minPower + index))
    : y.ticks(5);
  const last = new Date(end);
  const months = (last.getUTCFullYear() - first.getUTCFullYear()) * 12 + last.getUTCMonth() - first.getUTCMonth();
  const step = Math.max(1, Math.ceil(months / Math.max(2, Math.floor((right - left) / 100))));
  const xTicks: number[] = [];
  for (let month = 0; month <= months; month += step)
    xTicks.push(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + month, 1));
  const lastMonth = Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), 1);
  if (x(lastMonth) - x(xTicks.at(-1)!) >= 70) xTicks.push(lastMonth);

  function path(records: readonly EfficiencyPoint[]) {
    const [first, ...rest] = records;
    if (!first) return '';
    let result = `M${x(Date.parse(first.date))},${y(first.value)}`;
    for (const point of rest) result += `H${x(Date.parse(point.date))}V${y(point.value)}`;
    return `${result}H${right}`;
  }
  return { x, y, xTicks, yTicks, left, right, top, bottom, path };
}
