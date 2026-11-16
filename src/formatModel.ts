import type { Model } from './data/schema';
import type { Metric } from './chart-definitions';

// Intl construction dominates repeated chart formatting. There are only a few precision pairs.
const numberFormats = new Map<number, Intl.NumberFormat>();
function formatNumber(value: number, maximumFractionDigits: number, minimumFractionDigits = 0) {
  const key = maximumFractionDigits * 10 + minimumFractionDigits;
  let formatter = numberFormats.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-US', { maximumFractionDigits, minimumFractionDigits });
    numberFormats.set(key, formatter);
  }
  return formatter.format(value);
}

export function format(
  value: number | null,
  metric: Metric,
  compact = false,
): string {
  if (value === null) return 'Not measured';
  if (metric === 'time') {
    if (compact)
      return value < 60
        ? `${Math.round(value)}s`
        : value < 3600
          ? `${+(value / 60).toFixed(1)}m`
          : `${+(value / 3600).toFixed(1)}h`;
    const seconds = Math.round(value);
    return seconds < 60
      ? `${seconds}s`
      : seconds < 3600
        ? `${Math.floor(seconds / 60)}m ${seconds % 60}s`
        : `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  }
  if (metric === 'cost' || metric === 'costTotal') {
    if (compact && value >= 1000) return `$${+(value / 1000).toFixed(1)}k`;
    return (
      '$' +
      formatNumber(
        value,
        metric === 'costTotal' ? 0 : value < 1 ? 3 : 2,
        metric === 'cost' && !compact ? 2 : 0,
      )
    );
  }
  const unit =
    value >= 1e9
      ? ([1e9, 'B'] as const)
      : value >= 1e6
        ? ([1e6, 'M'] as const)
        : value >= 1e3
          ? ([1e3, 'k'] as const)
          : null;
  if (unit) return `${+(value / unit[0]).toFixed(compact ? 0 : 1)}${unit[1]}`;
  return formatNumber(value, metric === 'intelligence' || metric === 'omniscience' || !compact ? 1 : 0);
}

/** Distinguish local estimates wherever model measurements appear. */
export function formatModelValue(model: Model, metric: Metric, compact = false) {
  const value = format(model[metric] ?? null, metric, compact);
  return metric === 'time' && model.time !== null && model.timeEstimate ? `~${value}` : value;
}
