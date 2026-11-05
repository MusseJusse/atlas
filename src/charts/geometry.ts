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
  const labelCapacity = Math.max(1, Math.floor((bottom - top) / (agentLabels ? 40 : 24)) + 1);
  // Thin labels to fit the available height in every dataset. Every point remains interactive.
  const labelStep = Math.ceil(labelPositions.length / labelCapacity);
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
  const logTicks = x.ticks(mobile ? 4 : 10).filter((value) => {
    if (linear) return true;
    const significant = value / 10 ** Math.floor(Math.log10(value));
    return (mobile ? [1, 3] : [1, 2, 5]).some((target) => Math.abs(significant - target) < 0.001);
  });
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

export function barGeometry(
  rows: MeasuredRow[],
  metric: Metric,
  width: number,
  height: number,
  grouped: boolean,
  descending: boolean,
  sortBy: 'minimum' | 'maximum' = 'maximum',
) {
  const left = width < 600 ? 46 : 64;
  const right = width - 18;
  const top = metric === 'omniscience' ? 50 : 30;
  const bottom = height - 96;
  const groups = barGroups(rows, metric, grouped, descending, sortBy);
  const values = rows.map((row) => row.value);
  // Leave room for negative value labels above the reasoning marks and model names.
  const negativeCount = Math.max(0, ...groups.map((group) => group.rows.filter((row) => row.value < 0).length));
  const labelSpace = negativeCount ? Math.max(42, negativeCount * 17 + 16) : 0;
  const y = linearScale(
    barDomain(values, 0.15),
    [bottom - labelSpace, top],
  );
  const totalWeight = groups.reduce((total, group) => total + Math.max(3, group.rows.length), 0);
  let groupStart = left;
  const valueLabels: { x: number; y: number; width: number }[] = [];
  const positioned = groups.map((group) => {
    const groupWidth = ((right - left) * Math.max(3, group.rows.length)) / totalWeight;
    const center = groupStart + groupWidth / 2;
    groupStart += groupWidth;
    const gap = Math.min(4, groupWidth * 0.025);
    const barWidth = Math.max(1, Math.min(38, (groupWidth - 16) / group.rows.length - gap));
    const start = center - (group.rows.length * (barWidth + gap) - gap) / 2;
    const bars = group.rows.map((row, index) => {
      const x = start + index * (barWidth + gap);
      const text = barWidth > 8 ? formatModelValue(row, metric, true) : '';
      const textWidth = text.length * 6.4;
      const labelX = Math.max(
        left + textWidth / 2,
        Math.min(right - textWidth / 2, x + barWidth / 2),
      );
      const labelY = y(row.value) + (row.value < 0 ? 16 : -8);
      return { row, x, labelX, labelY, text, labelVisible: barWidth > 8 };
    });
    // Negative annotations share a band below the deepest bar. Deeper values
    // may move down for collisions, but never above shallower annotations.
    const negativeBars = bars.filter((bar) => bar.row.value < 0).toSorted((a, b) => b.row.value - a.row.value);
    let negativeY = Math.max(...negativeBars.map((bar) => y(bar.row.value)), 0) + 16;
    for (const bar of negativeBars) {
      const textWidth = bar.text.length * 6.4;
      while (barWidth > 8 && valueLabels.some((label) =>
        Math.abs(label.x - bar.labelX) < (label.width + textWidth) / 2 + 4 && Math.abs(label.y - negativeY) < 17,
      )) negativeY += 17;
      bar.labelY = negativeY;
      if (barWidth > 8) valueLabels.push({ x: bar.labelX, y: negativeY, width: textWidth });
    }
    return { ...group, center, groupWidth, barWidth, bars };
  });
  // Pack toward the top in value order. If the heading leaves no more room,
  // higher values replace conflicting lower labels, available on hover/focus.
  const positiveBars = positioned
    .flatMap((group) => group.bars.filter((bar) => bar.row.value >= 0 && bar.labelVisible))
    .toSorted((a, b) => a.row.value - b.row.value);
  const positiveLabels: typeof positiveBars = [];
  const minimumLabelY = 36;
  for (const bar of positiveBars) {
    const textWidth = bar.text.length * 6.4;
    bar.labelY = Math.max(minimumLabelY, bar.labelY);
    const collisions = () => positiveLabels.filter((label) => label.labelVisible &&
      Math.abs(label.labelX - bar.labelX) < (label.text.length * 6.4 + textWidth) / 2 + 4 &&
      Math.abs(label.labelY - bar.labelY) < 17,
    );
    while (collisions().length && bar.labelY - 17 >= minimumLabelY) bar.labelY -= 17;
    for (const label of collisions()) label.labelVisible = false;
    positiveLabels.push(bar);
  }
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
