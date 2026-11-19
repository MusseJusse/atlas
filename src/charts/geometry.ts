import { barDomain, linearScale, logScale } from '../scales';
import { scatterDomain, scatterRows } from '../scatter-data';
import { barGroups, paretoFrontier, type Model } from '../models';
import { format, formatModelValue } from '../formatModel';
import type { Metric, ScoreMetric } from '../chart-definitions';

export type MeasuredRow = Model & { value: number };
export type ScatterRow = MeasuredRow & { score: number };

/** Keep null measurements absent and give geometry an explicit numeric value. */
export function measureRows(rows: Model[], metric: Metric): MeasuredRow[] {
  return rows.flatMap((row) => {
    const value = row[metric];
    return value == null ? [] : [{ ...row, value }];
  });
}

export function measureScatterRows(rows: Model[], metric: Metric, linear: boolean, score: ScoreMetric = 'intelligence'): ScatterRow[] {
  // scatterRows guarantees both measurements before this single projection.
  return scatterRows(rows, metric, linear, score).map((row) => ({ ...row, value: row[metric]!, score: row[score]! }));
}

/** Geometry depends only on measured rows, dimensions and the visible axis choices. */
export function scatterGeometry(
  rows: ScatterRow[],
  metric: Metric,
  width: number,
  height: number,
  labelsEnabled: boolean,
  linear: boolean,
) {
  const mobile = width < 600;
  const left = mobile ? 46 : 64;
  const right = width - (labelsEnabled && !mobile ? 235 : 24);
  const top = 30;
  const bottom = Math.max(130, height - 60);
  const domain = scatterDomain(rows, metric, linear);
  const x = linear
    ? linearScale(domain, [left, right], { nice: true })
    : logScale(domain, [left, right]);
  const scoreMin = Math.max(
    0,
    Math.floor((Math.min(...rows.map((row) => row.score), 30) - 4) / 10) * 10,
  );
  const scoreMax =
    Math.ceil((Math.max(...rows.map((row) => row.score), 50) + 2) / 5) * 5;
  const y = linearScale([scoreMin, scoreMax], [bottom, top]);
  const frontier = paretoFrontier(rows, metric, (row) => row.score);
  const frontierIds = new Set(frontier.map((row) => row.id));
  const frontierFamilies = new Set(frontier.map((row) => row.family));
  const seriesId = (row: ScatterRow) => row.codingAgent ? row.id : row.family;
  const series = [...new Set(rows.map(seriesId))].map((id) => ({
    id,
    family: rows.find((row) => seriesId(row) === id)!.family,
    rows: rows
      .filter((row) => seriesId(row) === id)
      .toSorted((a, b) => a.effortOrder - b.effortOrder),
  }));
  const labelPositions = series
    .map((series) => ({ ...series, end: series.rows.at(-1)! }))
    .sort((a, b) => y(a.end.score) - y(b.end.score));
  const agentLabels = rows.some((row) => row.codingAgent);
  const labelCapacity = Math.max(1, Math.floor((bottom - top) / 40) + 1);
  // Keep agent names and tool names apart in dense selections. Every point remains interactive.
  const labelStep = agentLabels ? Math.ceil(labelPositions.length / labelCapacity) : 1;
  const visibleLabels = labelPositions.filter((_, index) => index % Math.max(1, labelStep) === 0);
  const labelSpacing = Math.min(agentLabels ? 40 : 24, (bottom - top) / Math.max(1, visibleLabels.length - 1));
  let lastY = top - labelSpacing;
  const labels = visibleLabels.map((series) => {
    lastY = Math.max(y(series.end.score), lastY + labelSpacing);
    return { ...series, y: lastY };
  });
  let nextY = bottom + labelSpacing;
  for (const label of labels.toReversed()) {
    label.y = Math.min(label.y, nextY - labelSpacing);
    nextY = label.y;
  }
  const tickSteps = (targets: number[]) => x.ticks(mobile ? 4 : 10).filter((value) => {
    if (linear) return true;
    const significant = value / 10 ** Math.floor(Math.log10(value));
    return targets.some((target) => Math.abs(significant - target) < 0.001);
  });
  // Wide cost ranges on phones keep only powers of ten, so tick labels don't run together.
  const mobileTicks = mobile ? tickSteps([1, 3]) : [];
  const logTicks = !mobile ? tickSteps([1, 2, 5]) : mobileTicks.length > 5 ? tickSteps([1]) : mobileTicks;
  const path = (data: ScatterRow[]) =>
    data
      .map((model, index) => `${index ? 'L' : 'M'}${x(model.value)},${y(model.score)}`)
      .join('');
  return {
    left,
    right,
    top,
    bottom,
    x,
    y,
    frontier,
    frontierIds,
    frontierFamilies,
    series,
    labels,
    logTicks,
    path,
  };
}

export const barLayout = { left: 64, narrowLeft: 46, right: 18, padding: 16, gap: 4, gapRatio: 0.025, markerWidth: 12 };

/** Dense grouped bar plots scroll only when configuration targets cannot fit. */
export function combinedBarWidth(rows: Model[], width: number) {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.family, (counts.get(row.family) ?? 0) + 1);
  const target = Math.max(0, ...counts.values()) * barLayout.markerWidth;
  const groupWidth = Math.min((target + barLayout.padding) / (1 - barLayout.gapRatio), target + barLayout.padding + barLayout.gap);
  const left = barLayout.left;
  return Math.max(width, Math.ceil(counts.size * groupWidth + left + barLayout.right));
}

export function barGeometry(
  rows: MeasuredRow[],
  metric: Metric,
  width: number,
  height: number,
  grouped: boolean,
  descending: boolean,
  combine = false,
) {
  const combined = grouped && combine;
  const left = width < 600 ? barLayout.narrowLeft : barLayout.left;
  const right = width - barLayout.right;
  const top = metric === 'omniscience' ? 50 : 30;
  const bottom = height - 96;
  const groups = barGroups(rows, metric, grouped, descending);
  const values = rows.map((row) => row.value);
  // Leave room for negative value labels above the reasoning marks and model names.
  const labelSpace = values.some((value) => value < 0) ? 42 : 0;
  const y = linearScale(
    barDomain(values, 0.15),
    [bottom - labelSpace, top],
  );
  const totalWeight = groups.reduce((total, group) => total + (combined ? 1 : Math.max(3, group.rows.length)), 0);
  let groupStart = left;
  const valueLabels: { x: number; y: number; width: number }[] = [];
  const positioned = groups.map((group) => {
    const groupWidth = ((right - left) * (combined ? 1 : Math.max(3, group.rows.length))) / totalWeight;
    const center = groupStart + groupWidth / 2;
    groupStart += groupWidth;
    const gap = Math.min(barLayout.gap, groupWidth * barLayout.gapRatio);
    const barWidth = Math.max(1, Math.min(combined ? Math.max(74, group.rows.length * barLayout.markerWidth) : 38, (groupWidth - barLayout.padding) / (combined ? 1 : group.rows.length) - gap));
    const start = center - ((combined ? 1 : group.rows.length) * (barWidth + gap) - gap) / 2;
    // Values are endpoints, not additive scores. Sort by distance from zero so
    // non-monotonic reasoning results and signed scores keep their true heights.
    const ordered = combined ? group.rows.toSorted((a, b) => Math.abs(a.value) - Math.abs(b.value) || a.effortOrder - b.effortOrder) : group.rows;
    let positive = 0;
    let negativeEnd = 0;
    const bars = ordered.map((row, index) => {
      const baseline = combined ? row.value < 0 ? negativeEnd : positive : 0;
      if (row.value < 0) negativeEnd = row.value;
      else positive = row.value;
      const x = start + (combined ? 0 : index * (barWidth + gap));
      const endpoint = !combined || row.value === (row.value < 0 ? group.minimum : group.maximum);
      const text = barWidth > 8 && endpoint && (!combined || ordered.findLast((item) => item.value === row.value)?.id === row.id) ? formatModelValue(row, metric, true) : '';
      const textWidth = text.length * 6.4;
      const labelX = Math.max(
        left + textWidth / 2,
        Math.min(right - textWidth / 2, x + barWidth / 2),
      );
      const negative = row.value < 0;
      let labelY = y(row.value) + (negative ? 16 : -8);
      while (
        text &&
        valueLabels.some(
          (label) =>
            Math.abs(label.x - labelX) < (label.width + textWidth) / 2 + 4 &&
            Math.abs(label.y - labelY) < 17,
        )
      )
        labelY += negative ? 17 : -17;
      if (text) valueLabels.push({ x: labelX, y: labelY, width: textWidth });
      return { row, x, baseline, labelX, labelY, text };
    });
    // Keep DOM and keyboard order aligned with the effort markers, independently
    // of the value order used to calculate segment baselines and shading.
    const effortOrder = new Map(group.rows.map((row, index) => [row.id, index]));
    bars.sort((a, b) => effortOrder.get(a.row.id)! - effortOrder.get(b.row.id)!);
    return { ...group, center, groupWidth, barWidth, bars };
  });
  return { left, right, top, bottom, y, positioned };
}

export function rangeGeometry(
  rows: MeasuredRow[],
  metric: Metric,
  descending: boolean,
) {
  // Phone ranges rank the requested endpoint; desktop groups rank their maximum.
  const groups = barGroups(rows, metric, true, descending, descending ? 'maximum' : 'minimum');
  const [min, max] = barDomain(rows.map((row) => row.value));
  const position = linearScale([min, max], [0, 100]);
  return { groups, min, max, position };
}

/** Keep tick labels readable when precise low prices need more characters. */
export function spacedAxisTicks(values: number[], position: (value: number) => number, metric: Metric) {
  let edge = -Infinity;
  const used = new Set<string>();
  return values.flatMap((value) => {
    const label = format(value, metric, true);
    const x = position(value);
    const halfWidth = label.length * 3.5;
    if (used.has(label) || x - halfWidth < edge + 10) return [];
    edge = x + halfWidth;
    used.add(label);
    return [{ value, label, x }];
  });
}
