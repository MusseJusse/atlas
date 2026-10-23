import { extent } from 'd3-array';
import type { Metric, Model } from './models';
import type { ScoreMetric } from './chart-definitions';

/** Share the scale's eligible measurements across every part of the scatter chart. */
export function scatterRows(rows: Model[], metric: Metric, linear: boolean, score: ScoreMetric = 'intelligence') {
  return rows.filter((row) => {
    const value = row[metric];
    return value !== null && row[score] != null && (linear || value > 0);
  });
}

/** Keep an all-zero linear selection at the origin with a usable axis. */
export function scatterDomain(rows: Model[], metric: Metric, linear: boolean): [number, number] {
  const [min = 0.01, max = 1] = extent(rows, (row) => row[metric]!);
  return linear ? [0, max === 0 ? 1 : max * 1.08] : [min * 0.7, max * 1.08];
}
