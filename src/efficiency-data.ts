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
