import { barDomain, linearScale, logScale } from '../scales';
import { scatterDomain, scatterRows } from '../scatter-data';
import { barGroups, paretoFrontier, type Model } from '../models';
import { format, formatModelValue } from '../formatModel';
import { shortName } from '../model-presentation';
import { durationTicks } from './ranking-geometry';
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

/**
 * Width reserved right of the scatter plot for direct model labels. Plots narrower than 480px
 * use the legend below instead; plots under 760px get a slimmer gutter that still fits short names.
 */
export function scatterLabelGutter(width: number, labels: boolean) {
  return !labels || width < 480 ? 0 : width < 760 ? 165 : 235;
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
  const right = width - (scatterLabelGutter(width, labelsEnabled) || 24);
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
  // Use the densest tick set whose labels all fit, so wide cost ranges never run labels together.
  // Phones also stop at five 1-3 ticks, which keeps the narrow axis calm.
  const tickSets = (mobile ? [[1, 3], [1]] : [[1, 2, 5], [1, 3], [1]]).map(tickSteps);
  const logTicks = tickSets.find((ticks) =>
    (!mobile || ticks.length <= 5) && spacedAxisTicks(ticks, x, metric).length === ticks.length,
  ) ?? tickSets.at(-1)!;
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

// Rough 13px DM Sans advances: narrow punctuation and digits, wide capitals, and an average for the rest.
const captionGlyph = (char: string) => '.,-1 ilIjt()'.includes(char) ? 4 : 'MWmw'.includes(char) ? 11 : /[A-Z0-9]/.test(char) ? 8.4 : 7;
export const captionWidth = (text: string) => [...text].reduce((sum, char) => sum + captionGlyph(char), 0);

/** Split a name at the space nearest its middle. */
function splitCaption(name: string) {
  const spaces = [...name.matchAll(/ /g)].map((match) => match.index);
  if (!spaces.length) return [name];
  const split = spaces.reduce((best, index) => Math.abs(index - name.length / 2) < Math.abs(best - name.length / 2) ? index : best);
  return [name.slice(0, split), name.slice(split + 1)];
}

/** A 13px model name under its group: one line when it fits, otherwise two. */
export function captionLines(name: string, width: number) {
  return captionWidth(name) <= width ? [name] : splitCaption(name);
}

/** The wider line of a name's caption, as captionLines would set it in two lines. */
function captionSpan(name: string) {
  return Math.min(captionWidth(name), Math.max(...splitCaption(name).map(captionWidth)));
}

/**
 * Diagonal captions run at most this long, which keeps about 95% of names whole. Longer names end in an
 * ellipsis; their full name is in the caption's tooltip and in the card a bar's hover, focus or pin opens.
 */
export const diagonalCaption = { angle: 40, maxWidth: 200 };
export function fitDiagonalCaption(name: string) {
  if (captionWidth(name) <= diagonalCaption.maxWidth) return name;
  let cut = name;
  while (cut.length > 1 && captionWidth(`${cut}…`) > diagonalCaption.maxWidth) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}…`;
}

/**
 * Separate bars scroll once a group could no longer fit 5px bars, as with the All preset.
 * Names that don't fit their group turn diagonal (see barGeometry), so dense plots stay compact.
 * Weights match barGeometry, where a group spans max(3, bars) shares of the plot.
 */
export function separateBarWidth(rows: Model[], width: number, grouped: boolean) {
  const groups = new Map<string, Model[]>();
  for (const row of rows) {
    const key = grouped ? row.family : row.id;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  const total = [...groups.values()].reduce((sum, group) => sum + Math.max(3, group.length), 0);
  const plot = (minimum: (group: Model[]) => number) =>
    Math.ceil(total * Math.max(0, ...[...groups.values()].map((group) => minimum(group) / Math.max(3, group.length))) + barLayout.left + barLayout.right);
  return Math.max(width, plot((group) => Math.max(32, group.length * (5 + barLayout.gap) + barLayout.padding)));
}

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
  const groups = barGroups(rows, metric, grouped, descending);
  const totalWeight = groups.reduce((total, group) => total + (combined ? 1 : Math.max(3, group.rows.length)), 0);
  const weightOf = (group: (typeof groups)[number]) => combined ? 1 : Math.max(3, group.rows.length);
  // When any name can't fit its group in two lines, every caption runs diagonally from under its logo,
  // and the plot gives up enough height for the longest one.
  const names = groups.map((group) => shortName(group.rows[0]!));
  const diagonal = groups.some((group, index) => captionSpan(names[index]!) > ((right - left) * weightOf(group)) / totalWeight - 6);
  const radians = (diagonalCaption.angle * Math.PI) / 180;
  const diagonalWidths = names.map((name) => Math.min(diagonalCaption.maxWidth, captionWidth(name)));
  const diagonalDepth = Math.sin(radians) * Math.max(0, ...diagonalWidths);
  // Diagonal captions reach left of their group, so the first groups start far enough in to keep theirs clear of the axis.
  let inset = 0;
  if (diagonal) {
    let offset = 0;
    groups.forEach((group, index) => {
      const groupWidth = ((right - left) * weightOf(group)) / totalWeight;
      // The 12px margin absorbs error in the width estimate and the slight rescale from the inset itself.
      inset = Math.max(inset, Math.cos(radians) * diagonalWidths[index]! + 12 - (offset + groupWidth / 2));
      offset += groupWidth;
    });
  }
  const groupWidthOf = (group: (typeof groups)[number]) => ((right - left - inset) * weightOf(group)) / totalWeight;
  const bottom = diagonal ? Math.min(height - 96, height - 62 - diagonalDepth) : height - 96;
  const values = rows.map((row) => row.value);
  // Leave room for negative value labels above the reasoning marks and model names.
  const labelSpace = values.some((value) => value < 0) ? 42 : 0;
  const domain = barDomain(values, 0.15);
  const y = linearScale(domain, [bottom - labelSpace, top]);
  // Durations tick at whole seconds, minutes and hours, as the phone ranking does, never at "8.3m".
  const ticks = metric === 'time' ? durationTicks(domain[1]) : y.ticks(4);
  let groupStart = left + inset;
  const laidOut = groups.map((group) => {
    const groupWidth = groupWidthOf(group);
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
      const text = barWidth > 8 && endpoint && (!combined || ordered.findLast((item) => item.value === row.value)?.id === row.id) ? valueLabel(row, metric) : '';
      return { row, x, baseline, labelX: x + barWidth / 2, labelY: 0, text };
    });
    // Keep DOM and keyboard order aligned with the effort markers, independently
    // of the value order used to calculate segment baselines and shading.
    const effortOrder = new Map(group.rows.map((row, index) => [row.id, index]));
    bars.sort((a, b) => effortOrder.get(a.row.id)! - effortOrder.get(b.row.id)!);
    return { ...group, center, groupWidth, barWidth, bars };
  });
  const positioned = placeValueLabels(laidOut, y, left, right, bottom);
  return { left, right, top, bottom, y, ticks, positioned, diagonal };
}

type LaidOutGroup = { barWidth: number; bars: { row: MeasuredRow; x: number; labelX: number; labelY: number; text: string }[] };

// Glyph side bearings already leave air between labels, so 1px of extra gap reads as separate.
/** Bar prices keep cents ("$3.10", not "$3.1") so neighbours share precision; sub-cent prices need the compact form. */
function valueLabel(row: MeasuredRow, metric: Metric) {
  return formatModelValue(row, metric, metric !== 'cost' || row.value < 0.001);
}

const valueLabelMetrics = { lineHeight: 17, gap: 1 };
// Advance widths of 11px DM Sans UI, measured in the browser. Other characters use the widest digit.
const glyphWidths: Record<string, number> = { '1': 3.7, '.': 2.3, ',': 2.3, '-': 6, '$': 6.5, M: 9.2, k: 5.6, s: 5.6, ' ': 2.6 };

/** Estimate a bar value label's rendered width, so labels pack as tightly as they really are. */
export function valueLabelWidth(text: string) {
  return [...text].reduce((width, char) => width + (glyphWidths[char] ?? 7.4), 0);
}

/**
 * Place each value label at its bar's end without covering another label or any bar.
 * Labels wider than their bar first slide sideways over the shorter neighbour, then step away from the axis.
 * Labels stay between the unit heading and the reasoning marks and move at most one line off their bar,
 * so a stagger never reads as a different value. A label with no free spot is dropped, and its value
 * remains in the focus and pin details.
 */
function placeValueLabels<Group extends LaidOutGroup>(groups: Group[], y: (value: number) => number, left: number, right: number, bottom: number) {
  const { lineHeight, gap } = valueLabelMetrics;
  const columns = groups.flatMap((group) => group.bars.map((bar) => ({
    x0: bar.x, x1: bar.x + group.barWidth,
    y0: Math.min(y(bar.row.value), y(0)), y1: Math.max(y(bar.row.value), y(0)),
  })));
  const placed: { x: number; y: number; width: number }[] = [];
  const clear = (x: number, labelY: number, width: number) =>
    placed.every((label) => Math.abs(label.x - x) >= (label.width + width) / 2 + gap || Math.abs(label.y - labelY) >= lineHeight) &&
    // The glyph box spans roughly cap height above the baseline and a little below it.
    columns.every((column) => x + width / 2 <= column.x0 - 1 || x - width / 2 >= column.x1 + 1 || labelY + 3 <= column.y0 || labelY - 9 >= column.y1);
  // Tallest bars place first: they block their neighbours anyway, and their labels matter most.
  const order = groups.flatMap((group, groupIndex) => group.bars.map((bar, barIndex) => ({ group, bar, groupIndex, barIndex })))
    .toSorted((a, b) => Math.abs(b.bar.row.value) - Math.abs(a.bar.row.value));
  const placedBars = new Map<string, Group['bars'][number]>();
  for (const { group, bar, groupIndex, barIndex } of order) placedBars.set(`${groupIndex}:${barIndex}`, place(group, bar));
  return groups.map((group, groupIndex) => ({
    ...group,
    bars: group.bars.map((_, barIndex) => placedBars.get(`${groupIndex}:${barIndex}`)!),
  }));

  function place(group: Group, bar: Group['bars'][number]) {
    if (!bar.text) return bar;
    const width = valueLabelWidth(bar.text);
    const negative = bar.row.value < 0;
    const fit = (x: number) => Math.max(left + width / 2, Math.min(right - width / 2, x));
    const centre = bar.x + group.barWidth / 2;
    const xs = width > group.barWidth
      ? [centre, bar.x + group.barWidth - width / 2, bar.x + width / 2].map(fit)
      : [fit(centre)];
    const start = y(bar.row.value) + (negative ? 16 : -8);
    // The unit heading's baseline is at 17px; reasoning marks start about 8px below the axis bottom.
    const inside = (labelY: number) => (negative ? labelY + 3 <= bottom + 6 : labelY - 9 >= 22);
    let spot: { x: number; y: number } | null = null;
    search: for (const labelY of [start, start + (negative ? lineHeight : -lineHeight)]) {
      if (!inside(labelY)) break;
      for (const x of xs) if (clear(x, labelY, width)) { spot = { x, y: labelY }; break search; }
    }
    if (!spot) return { ...bar, text: '' };
    placed.push({ ...spot, width });
    return { ...bar, labelX: spot.x, labelY: spot.y };
  }
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
