import { nice } from 'd3-array';
import { barDomain, linearScale, logScale } from '../scales';
import { scatterDomain, scatterRows } from '../scatter-data';
import { barGroups, formatModelValue, paretoFrontier, type Model } from '../models';
import { metrics, type Metric } from '../chart-definitions';

export type MeasuredRow = Model & { value: number };
export type ScatterRow = MeasuredRow & { intelligence: number };

/** Keep null measurements absent and give geometry an explicit numeric value. */
export function measureRows(rows: Model[], metric: Metric): MeasuredRow[] {
  return rows.flatMap((row) => {
    const value = row[metric];
    return value === null ? [] : [{ ...row, value }];
  });
}

export function measureScatterRows(rows: Model[], metric: Metric, linear: boolean): ScatterRow[] {
  // scatterRows guarantees both measurements before this single projection.
  return scatterRows(rows, metric, linear).map((row) => ({ ...row, value: row[metric]! }));
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
    Math.floor((Math.min(...rows.map((row) => row.intelligence), 30) - 4) / 10) * 10,
  );
  const scoreMax =
    Math.ceil((Math.max(...rows.map((row) => row.intelligence), 50) + 2) / 5) * 5;
  const y = linearScale([scoreMin, scoreMax], [bottom, top]);
  const frontier = paretoFrontier(rows, metric);
  const frontierIds = new Set(frontier.map((row) => row.id));
  const frontierFamilies = new Set(frontier.map((row) => row.family));
  const series = [...new Set(rows.map((row) => row.family))].map((family) => ({
    family,
    rows: rows
      .filter((row) => row.family === family)
      .toSorted((a, b) => a.effortOrder - b.effortOrder),
  }));
  const labelPositions = series
    .map((series) => ({ ...series, end: series.rows.at(-1)! }))
    .sort((a, b) => y(a.end.intelligence) - y(b.end.intelligence));
  const labelSpacing = Math.min(24, (bottom - top) / Math.max(1, labelPositions.length - 1));
  let lastY = top - labelSpacing;
  const labels = labelPositions.map((series) => {
    lastY = Math.max(y(series.end.intelligence), lastY + labelSpacing);
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
      .map((model, index) => `${index ? 'L' : 'M'}${x(model.value)},${y(model.intelligence)}`)
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
) {
  const left = width < 600 ? 46 : 64;
  const right = width - 18;
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
      const negative = row.value < 0;
      let labelY = y(row.value) + (negative ? 16 : -8);
      while (
        barWidth > 8 &&
        valueLabels.some(
          (label) =>
            Math.abs(label.x - labelX) < (label.width + textWidth) / 2 + 4 &&
            Math.abs(label.y - labelY) < 17,
        )
      )
        labelY += negative ? 17 : -17;
      if (barWidth > 8) valueLabels.push({ x: labelX, y: labelY, width: textWidth });
      return { row, x, labelX, labelY, text };
    });
    return { ...group, center, groupWidth, barWidth, bars };
  });
  return { left, right, top, bottom, y, positioned };
}

/** Rank each model's best selected configuration, independently of the requested sort direction. */
export function mobileBarGeometry(
  rows: MeasuredRow[],
  metric: Metric,
  descending: boolean,
) {
  const higherIsBetter = metrics[metric].higherIsBetter;
  const groups = barGroups(rows, metric, true, descending, higherIsBetter ? 'maximum' : 'minimum')
    .map((group) => ({
      ...group,
      representative: group.rows.find((row) =>
        row.value === (higherIsBetter ? group.maximum : group.minimum),
      )!,
    }));
  const [min, max] = nice(...barDomain(rows.map((row) => row.value)), 4);
  const position = linearScale([min, max], [0, 100]);
  const zero = position(0);
  const ticks = position.ticks(3);
  return { groups, min, max, position, zero, ticks };
}
