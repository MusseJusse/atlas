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

function annotationWidth(text: string) {
  return Array.from(text, (character) =>
    character === '.' || character === ',' ? 2.8 : character === '-' ? 4.4 : 6.4,
  ).reduce((total, width) => total + width, 0);
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
  const top = 30;
  const bottom = height - 96;
  const groups = barGroups(rows, metric, grouped, descending, sortBy);
  const values = rows.map((row) => row.value);
  const totalWeight = groups.reduce((total, group) => total + Math.max(3, group.rows.length), 0);
  let groupStart = left;
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
      const textWidth = annotationWidth(text);
      const labelX = Math.max(
        left + textWidth / 2,
        Math.min(right - textWidth / 2, x + barWidth / 2),
      );
      return { row, x, labelX, labelY: 0, text, textWidth, labelVisible: barWidth > 8 };
    });
    return { ...group, center, groupWidth, barWidth, bars };
  });
  const bars = positioned.flatMap((group) => group.bars);
  const negativeLabels: typeof bars = [];
  // Pack negative labels relative to the deepest bar, then reserve only the
  // space those rows need. Positive and negative bars retain one shared scale.
  for (const group of positioned) {
    const negativeBars = group.bars.filter((bar) => bar.row.value < 0 && bar.labelVisible)
      .toSorted((a, b) => b.row.value - a.row.value);
    let negativeY = 16;
    for (const bar of negativeBars) {
      while (negativeLabels.some((label) =>
        Math.abs(label.labelX - bar.labelX) < (label.textWidth + bar.textWidth) / 2 + 3 && Math.abs(label.labelY - negativeY) < 17,
      )) negativeY += 17;
      bar.labelY = negativeY;
      negativeLabels.push(bar);
    }
  }
  const labelSpace = Math.max(0, ...negativeLabels.map((bar) => bar.labelY + 8));
  const y = linearScale(barDomain(values, 0.15), [bottom - labelSpace, top]);
  const negativeOrigin = y(Math.min(0, ...values));
  for (const bar of bars) {
    bar.labelY = bar.row.value < 0 ? negativeOrigin + bar.labelY : Math.max(36, y(bar.row.value) - 8);
  }
  // Values stay at their bar ends, so annotation height cannot reverse magnitude.
  // When text cannot fit, keep the higher value and reveal others on hover/focus.
  const positiveBars = bars.filter((bar) => bar.row.value >= 0 && bar.labelVisible)
    .toSorted((a, b) => b.row.value - a.row.value);
  const positiveLabels: typeof positiveBars = [];
  for (const bar of positiveBars) {
    bar.labelVisible = !positiveLabels.some((label) =>
      Math.abs(label.labelX - bar.labelX) < (label.textWidth + bar.textWidth) / 2 + 3 &&
      Math.abs(label.labelY - bar.labelY) < 17,
    );
    if (bar.labelVisible) positiveLabels.push(bar);
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
export function spacedAxisTicks(values: number[], position: (value: number) => number, metric: Metric, compact = false) {
  let edge = -Infinity;
  const used = new Set<string>();
  return values.flatMap((value) => {
    const label = format(value, metric, true);
    const x = position(value);
    const halfWidth = label.length * (compact ? 2.8 : 3.5);
    if (used.has(label) || x - halfWidth < edge + (compact ? 4 : 10)) return [];
    edge = x + halfWidth;
    used.add(label);
    return [{ value, label, x }];
  });
}
