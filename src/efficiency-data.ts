import type { Model } from './data/schema';

export const efficiencyThresholds = [10, 20, 30, 40, 50, 60] as const;

type EfficiencyModel = Pick<Model, 'id' | 'released' | 'intelligence' | 'cost'>;

/**
 * Reconstruct release-date records using one snapshot, as AA's efficiency charts do.
 * These are current measurements ordered by release date, not historical prices.
 * AA uses positive measurements for its logarithmic cost axis.
 */
export function efficiencySeries<Row extends EfficiencyModel>(rows: readonly Row[]) {
  const candidates = rows
    .flatMap((model) => {
      const value = model.cost;
      return model.released !== null && model.intelligence !== null &&
        Number.isFinite(model.intelligence) && value !== null && Number.isFinite(value) && value > 0
        ? [{ date: model.released, value, model }]
        : [];
    })
    .sort((a, b) =>
      a.date.localeCompare(b.date) ||
      a.value - b.value ||
      a.model.id.localeCompare(b.model.id),
    );

  return efficiencyThresholds.map((threshold) => {
    let best = Infinity;
    const points = candidates.filter((point) => {
      if (point.model.intelligence! < threshold || point.value >= best)
        return false;
      best = point.value;
      return true;
    });
    return { threshold, points };
  });
}

export type EfficiencyLine = ReturnType<typeof efficiencySeries<Model>>[number];
export type EfficiencyPoint = EfficiencyLine['points'][number];

/** Compare a record with the first record at the same intelligence threshold. */
export function costMultiplier(line: { points: readonly { value: number }[] }, point: { value: number }) {
  return line.points[0]!.value / point.value;
}

/** Format elapsed release-date time, using days below one average Gregorian month. */
export function elapsedTimeSinceFirstRecord(line: { points: readonly { date: string }[] }, point: { date: string }) {
  const days = (Date.parse(point.date) - Date.parse(line.points[0]!.date)) / (1000 * 60 * 60 * 24);
  const months = days / (365.2425 / 12);
  return new Intl.NumberFormat('en', {
    style: 'unit', unit: months < 1 ? 'day' : 'month', unitDisplay: 'long', maximumFractionDigits: 1,
  }).format(months < 1 ? days : months);
}
