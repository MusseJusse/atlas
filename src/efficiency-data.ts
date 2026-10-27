import type { Model } from './data/schema';

export const efficiencyThresholds = [10, 20, 30, 40, 50, 60] as const;
export type EfficiencyMetric = 'cost' | 'speed';

type EfficiencyModel = Pick<Model, 'id' | 'released' | 'intelligence' | EfficiencyMetric>;

/**
 * Reconstruct release-date records using one snapshot, as AA's efficiency charts do.
 * These are current measurements ordered by release date, not historical prices.
 * AA uses positive measurements for both charts, including its logarithmic cost axis.
 */
export function efficiencySeries<Row extends EfficiencyModel>(
  rows: readonly Row[],
  metric: EfficiencyMetric,
) {
  const direction = metric === 'cost' ? 1 : -1;
  const candidates = rows
    .flatMap((model) => {
      const value = model[metric];
      return model.released !== null && model.intelligence !== null &&
        Number.isFinite(model.intelligence) && value !== null && Number.isFinite(value) && value > 0
        ? [{ date: model.released, value, model }]
        : [];
    })
    .sort((a, b) =>
      a.date.localeCompare(b.date) ||
      (a.value - b.value) * direction ||
      a.model.id.localeCompare(b.model.id),
    );

  return efficiencyThresholds.map((threshold) => {
    let best = metric === 'cost' ? Infinity : -Infinity;
    const points = candidates.filter((point) => {
      if (point.model.intelligence! < threshold || (point.value - best) * direction >= 0)
        return false;
      best = point.value;
      return true;
    });
    return { threshold, points };
  });
}

export type EfficiencyLine = ReturnType<typeof efficiencySeries<Model>>[number];
export type EfficiencyPoint = EfficiencyLine['points'][number];
