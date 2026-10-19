import { useMemo } from 'react';
import { SvgLogo } from '../Logo';
import { format, modelColor, shortName } from '../models';
import { metrics, type Metric } from '../chart-definitions';
import type { Settings } from '../state';
import { pinHandlers, type Interactions } from './interactions';
import { scatterGeometry, type ScatterRow } from './geometry';

export function Scatter({
  rows,
  metric,
  linear,
  settings,
  width,
  height,
  interactions,
}: {
  rows: ScatterRow[];
  metric: Metric;
  linear: boolean;
  settings: Settings;
  width: number;
  height: number;
  interactions: Interactions;
}) {
  const mobile = width < 600;
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
        y: y(activeModel.intelligence!),
        color: modelColor(activeModel),
      }
    : null;

  return (
    <>
      <text x={left} y={18} fill="var(--fg-2)" fontSize="12">
        Intelligence index
      </text>
      {y.ticks(6).map((tick) => (
        <g key={tick} transform={`translate(0,${y(tick)})`}>
          <line x1={left} x2={right} stroke="var(--line)" strokeDasharray="2 6" />
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
        <g key={series.family} opacity={activeFamily && activeFamily !== series.family ? 0.15 : 1}>
          <path
            d={path(series.rows)}
            fill="none"
            stroke={modelColor(series.rows[0]!)}
            strokeWidth="2.25"
            opacity={settings.frontier ? (frontierFamilies.has(series.family) ? 0.25 : 0.08) : 0.45}
          />
          {series.rows.map((model) => {
            const onFrontier = frontierIds.has(model.id);
            const active = activeModel?.id === model.id;
            return (
              <g
                key={model.id}
                role="button"
                tabIndex={0}
                aria-label={`${model.name}, ${model.effortLabel}, ${metrics[metric].label} ${format(model[metric], metric)}, intelligence ${format(model.intelligence, 'intelligence')}`}
                aria-pressed={interactions.pinned?.id === model.id}
                className="cursor-pointer focus-visible:[&>circle:last-child]:stroke-accent focus-visible:[&>circle:last-child]:stroke-[3] mobile:focus-visible:[outline:none]"
                opacity={settings.frontier && !onFrontier && !active && !activeFamily ? 0.15 : 1}
                onMouseEnter={() => interactions.hover(model)}
                onMouseLeave={() => interactions.hover(null)}
                onFocus={() => interactions.hover(model)}
                onBlur={() => interactions.hover(null)}
                {...pinHandlers(model, interactions.togglePin)}
              >
                <circle
                  cx={x(model.value)}
                  cy={y(model.intelligence)}
                  r={13}
                  fill="transparent"
                />
                {active && (
                  <circle
                    cx={x(model.value)}
                    cy={y(model.intelligence)}
                    r={10}
                    fill="none"
                    stroke={modelColor(model)}
                    opacity={0.5}
                  />
                )}
                <circle
                  cx={x(model.value)}
                  cy={y(model.intelligence)}
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
      {settings.labels &&
        !mobile &&
        labels.map((series) => {
          const dim = activeFamily
            ? activeFamily !== series.family
            : settings.frontier && !frontierFamilies.has(series.family);
          return (
            <g
              key={series.family}
              className="cursor-pointer focus-visible:[&>rect:nth-child(2)]:stroke-accent focus-visible:[&>rect:nth-child(2)]:stroke-[3]"
              opacity={dim ? 0.2 : 1}
              role="button"
              tabIndex={0}
              aria-label={`Highlight ${series.end.name}`}
              onMouseEnter={() => interactions.highlight(series.family)}
              onMouseLeave={() => interactions.highlight(null)}
              aria-pressed={interactions.pinned?.id === series.end.id}
              {...pinHandlers(series.end, interactions.togglePin)}
            >
              <path
                d={`M${x(series.end.value) + 8},${y(series.end.intelligence)} L${right + 20},${series.y}`}
                stroke={modelColor(series.end)}
                strokeWidth="0.7"
                opacity="0.45"
                fill="none"
              />
              <rect
                x={right + 24}
                y={series.y - 12}
                width={width - right - 24}
                height={24}
                fill="transparent"
              />
              <SvgLogo model={series.end} x={right + 27} y={series.y - 8} size={18} />
              <text
                x={right + 53}
                y={series.y + 4}
                fontSize="14"
                fontWeight="550"
                fill={modelColor(series.end)}
              >
                {shortName(series.end)}
              </text>
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
