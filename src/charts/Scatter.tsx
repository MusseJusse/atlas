import { taskCostLabel } from './PricingDetails';
import { useMemo, type MouseEvent } from 'react';
import { SvgLogo } from '../Logo';
import { modelColor, shortName } from '../model-presentation';
import { format } from '../formatModel';
import { scoreLabels, metrics, type Metric, type ScoreMetric } from '../chart-definitions';
import type { Settings } from '../state';
import { nearestPoint, pinHandlers, type Interactions } from './interactions';
import { scatterGeometry, scatterLabelGutter, type ScatterRow } from './geometry';

export function Scatter({
  rows,
  metric,
  scoreMetric = 'intelligence',
  linear,
  settings,
  width,
  height,
  interactions,
}: {
  rows: ScatterRow[];
  metric: Metric;
  scoreMetric?: ScoreMetric;
  linear: boolean;
  settings: Settings;
  width: number;
  height: number;
  interactions: Interactions;
}) {
  const {
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
    labelSpacing,
    logTicks,
    path,
  } = useMemo(
    () => scatterGeometry(rows, metric, width, height, settings.labels, linear),
    [rows, metric, width, height, settings.labels, linear],
  );
  const { activeModel } = interactions;
  const activeFamily = activeModel?.family ?? interactions.highlighted;
  const guide = activeModel
    ? {
        x: x(activeModel[metric]!),
        y: y(activeModel[scoreMetric]!),
        color: modelColor(activeModel),
      }
    : null;
  // Hit areas overlap where levels sit close together, so a tap pins the point nearest to it, not the one painted last.
  const points = useMemo(() => rows.map((row) => ({ row, x: x(row.value), y: y(row.score) })), [rows, x, y]);
  function pointAt(event: MouseEvent<SVGGElement>, fallback: ScatterRow) {
    const svg = event.currentTarget.ownerSVGElement;
    const matrix = svg?.getScreenCTM()?.inverse();
    if (!svg || !matrix) return fallback;
    const { x: pointX, y: pointY } = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix);
    return nearestPoint(points, pointX, pointY, 13)?.row ?? fallback;
  }

  return (
    <>
      <text x={left} y={18} fill="var(--fg-2)" fontSize="12">
        {scoreLabels[scoreMetric]}
      </text>
      {y.ticks(6).map((tick) => (
        <g key={tick} transform={`translate(0,${y(tick)})`}>
          <line x1={left} x2={right} stroke="var(--grid)" strokeDasharray="2 6" />
          <text x={left - 17} y={4} textAnchor="end" fill="var(--fg-3)" fontSize="12">
            {tick}
          </text>
        </g>
      ))}
      {logTicks.map((tick) => (
        <g key={tick} transform={`translate(${x(tick)},${bottom})`}>
          <line y2={5} stroke="var(--line-2)" />
          <text y={26} textAnchor="middle" fill="var(--fg-3)" fontSize="12">
            {format(tick, metric, true)}
          </text>
        </g>
      ))}
      <line x1={left} x2={right} y1={bottom} y2={bottom} stroke="var(--line-2)" />
      {settings.frontier && (
        <path
          d={path(frontier)}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.8"
          strokeDasharray="6 5"
          opacity="0.65"
          pointerEvents="none"
        />
      )}
      {guide && (
        <g
          stroke={guide.color}
          strokeWidth={1}
          strokeDasharray="6 4"
          pointerEvents="none"
          aria-hidden="true"
        >
          <line x1={left} x2={right} y1={guide.y} y2={guide.y} />
          <line x1={guide.x} x2={guide.x} y1={top} y2={bottom} />
        </g>
      )}
      {series.map((series) => (
        // A keyboard-focused point stays fully visible even when another series is pinned.
        <g key={series.id} opacity={activeFamily && activeFamily !== series.family ? 0.15 : 1} className="[&:has(:focus-visible)]:opacity-100">
          <path
            d={path(series.rows)}
            fill="none"
            stroke={modelColor(series.rows[0]!)}
            strokeWidth="2.25"
            opacity={settings.frontier ? (frontierFamilies.has(series.family) ? 0.25 : 0.08) : 0.6}
          />
          {series.rows.map((model) => {
            const onFrontier = frontierIds.has(model.id);
            const active = activeModel?.id === model.id;
            return (
              <g
                key={model.id}
                role="button"
                tabIndex={0}
                aria-label={`${model.codingAgent?.configuration ?? `${model.name}, ${model.effortLabel}`}, ${metric === 'cost' ? taskCostLabel(model) : metrics[metric].label} ${format(model[metric] ?? null, metric)}, ${scoreLabels[scoreMetric]} ${format(model.score, 'intelligence')}`}
                aria-pressed={interactions.pinned?.id === model.id}
                className="cursor-pointer focus-visible:[&>circle:last-child]:stroke-accent focus-visible:[&>circle:last-child]:stroke-[3] mobile:focus-visible:[outline:none]"
                opacity={settings.frontier && !onFrontier && !active && !activeFamily ? 0.15 : 1}
                data-point={model.id}
                // Hover, click and focus all resolve to the nearest point, so the preview, the pin and Enter agree.
                onMouseMove={(event) => {
                  const nearest = pointAt(event, model);
                  if (nearest.id !== activeModel?.id) interactions.hover(nearest);
                }}
                onMouseLeave={() => interactions.hover(null)}
                onFocus={() => interactions.hover(model)}
                onBlur={() => interactions.hover(null)}
                {...pinHandlers(model, interactions.togglePin)}
                onClick={(event) => {
                  const nearest = pointAt(event, model);
                  interactions.togglePin(nearest);
                  if (nearest.id !== model.id)
                    event.currentTarget.ownerSVGElement?.querySelector<SVGGElement>(`[data-point="${CSS.escape(nearest.id)}"]`)?.focus({ preventScroll: true });
                }}
              >
                <circle
                  cx={x(model.value)}
                  cy={y(model.score)}
                  r={13}
                  fill="transparent"
                />
                {active && (
                  <circle
                    cx={x(model.value)}
                    cy={y(model.score)}
                    r={10}
                    fill="none"
                    stroke={modelColor(model)}
                    opacity={0.5}
                  />
                )}
                <circle
                  cx={x(model.value)}
                  cy={y(model.score)}
                  r={onFrontier && settings.frontier ? 6 : 4.5}
                  fill={modelColor(model)}
                  stroke={onFrontier && settings.frontier ? 'var(--accent)' : 'var(--panel)'}
                  strokeWidth={onFrontier && settings.frontier ? 1.5 : 1.8}
                />
              </g>
            );
          })}
        </g>
      ))}
      {scatterLabelGutter(width, settings.labels) > 0 &&
        labels.map((series) => {
          const dim = activeFamily
            ? activeFamily !== series.family
            : settings.frontier && !(series.end.codingAgent ? frontierIds.has(series.end.id) : frontierFamilies.has(series.family));
          const name = shortName(series.end);
          const apiSuffix = metric === 'cost' && series.end.taskPricing?.basis === 'api-fallback';
          // Fit the name, plus its "(API)" suffix, inside the gutter. A truncated name keeps a full-name tooltip.
          const compact = !series.end.codingAgent && labelSpacing < 18;
          const nameLimit = Math.max(6, Math.floor((width - right - 57 - (apiSuffix ? 32 : 0)) / (compact ? 6.6 : 7.6)));
          const labelName = name.length > nameLimit
            ? `${name.slice(0, nameLimit - 1).trimEnd()}…`
            : name;
          return (
            <g
              key={series.id}
              className="cursor-pointer focus-visible:opacity-100 focus-visible:[&>rect:nth-child(2)]:stroke-accent focus-visible:[&>rect:nth-child(2)]:stroke-[3]"
              opacity={dim ? 0.2 : 1}
              role="button"
              tabIndex={0}
              aria-label={`Select ${series.end.codingAgent?.configuration ?? series.end.name}`}
              onMouseEnter={() => interactions.highlight(series.family)}
              onMouseLeave={() => interactions.highlight(null)}
              aria-pressed={interactions.pinned?.id === series.end.id}
              {...pinHandlers(series.end, interactions.togglePin)}
            >
              <path
                d={`M${x(series.end.value) + 8},${y(series.end.score)} L${right + 20},${series.y}`}
                stroke={modelColor(series.end)}
                strokeWidth="0.8"
                style={{ opacity: 'var(--leader-opacity)' }}
                fill="none"
              />
              <rect
                x={right + 24}
                y={series.y - 12}
                width={width - right - 24}
                height={series.end.codingAgent ? 36 : 24}
                fill="transparent"
              />
              <SvgLogo model={series.end} x={right + 27} y={series.y - 8} size={18} />
              <text
                x={right + 53}
                y={series.y + 4}
                fontSize={series.end.codingAgent || compact ? 12 : 14}
                fontWeight="550"
                // Mix toward the text colour so light series still pass 4.5:1 as label text.
                style={{ fill: `color-mix(in srgb, ${modelColor(series.end)} 78%, var(--fg))` }}
              >
                {labelName !== name && <title>{name}</title>}
                {labelName}{apiSuffix && <tspan fontSize={11}> (API)</tspan>}
              </text>
              {series.end.codingAgent && (
                <text x={right + 53} y={series.y + 18} fontSize="10" fill="var(--fg-2)">
                  {series.end.codingAgent.name}, {series.end.effortLabel}
                </text>
              )}
            </g>
          );
        })}
      <text
        x={(left + right) / 2}
        y={height - 4}
        textAnchor="middle"
        fill="var(--fg-2)"
        fontSize="12"
      >
        {metrics[metric].label} ({metrics[metric].unit},{' '}
        {linear ? 'linear' : 'log'} scale)
      </text>
    </>
  );
}
