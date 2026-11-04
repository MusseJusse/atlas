import { taskCostLabel } from './PricingDetails';
import { useMemo, useState } from 'react';
import { SvgLogo } from '../Logo';
import { modelColor, shortName } from '../model-presentation';
import { format, formatModelValue } from '../formatModel';
import { metrics, type Metric } from '../chart-definitions';
import type { Settings } from '../state';
import { pinHandlers, type Interactions } from './interactions';
import { barGeometry, type MeasuredRow } from './geometry';

export function Bars({
  rows,
  metric,
  settings,
  width,
  height,
  interactions,
}: {
  rows: MeasuredRow[];
  metric: Metric;
  settings: Settings;
  width: number;
  height: number;
  interactions: Interactions;
}) {
  const [hoveredFamily, setHoveredFamily] = useState<string | null>(null);

  function leaveHover() {
    setHoveredFamily(null);
    interactions.hover(null);
  }

  const { left, right, top, bottom, y, positioned } = useMemo(
    () => barGeometry(rows, metric, width, height, settings.grouped, settings.descending ?? false),
    [rows, metric, width, height, settings.grouped, settings.descending],
  );
  const { activeModel } = interactions;
  const visibleFamily = rows.some((row) => row.family === hoveredFamily) ? hoveredFamily : null;
  const activeFamily = activeModel?.family ?? visibleFamily ?? interactions.highlighted;
  const activeValue = activeModel?.[metric];
  const guideY = activeValue == null ? null : y(activeValue);

  return (
    <>
      <text x={left} y={17} fill="var(--fg-2)" fontSize={12}>
        {metrics[metric].unit}
      </text>
      {y.ticks(4).map((tick) => (
        <g key={tick} transform={`translate(0,${y(tick)})`}>
          <line x1={left} x2={right} stroke="var(--line)" strokeDasharray="2 6" />
          <text x={left - 10} y={4} textAnchor="end" fill="var(--fg-3)" fontSize={11}>
            {format(tick, metric, true)}
          </text>
        </g>
      ))}
      <line x1={left} x2={right} y1={y(0)} y2={y(0)} stroke="var(--line-2)" />
      {positioned.map((group) => {
        const model = group.rows[0]!;
        const name = shortName(model);
        const split = name.lastIndexOf(' ');
        return (
          <g
            key={group.id}
            opacity={activeFamily && activeFamily !== model.family ? 0.65 : 1}
            onMouseLeave={leaveHover}
          >
            {/* Keep the last column active through the gaps between reasoning levels and label. */}
            <rect
              x={group.center - group.groupWidth / 2}
              y={top}
              width={group.groupWidth}
              height={height - top}
              fill="transparent"
            />
            {group.bars.map(({ row, x: barX, labelX, labelY, text }) => {
              const barY = y(row.value);
              const effortMark =
                row.effort === 'max' ? 'Mx' : row.effortLabel.charAt(0).toUpperCase();
              const visibleLabel = group.barWidth > 8 ? `${effortMark}${text}, ` : '';
              return (
                <g
                  key={row.id}
                  opacity={
                    activeModel?.family === row.family && activeModel.id !== row.id ? 0.65 : 1
                  }
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer focus-visible:[&>rect:nth-child(2)]:stroke-accent focus-visible:[&>rect:nth-child(2)]:stroke-[3] mobile:focus-visible:[outline:none]"
                  aria-label={`${visibleLabel}${row.name}, ${row.effortLabel} reasoning, ${metric === 'cost' ? taskCostLabel(row) : metrics[metric].label} ${metric === 'time' && row.timeEstimate ? 'estimated ' : ''}${formatModelValue(row, metric)}`}
                  aria-pressed={interactions.pinned?.id === row.id}
                  onMouseEnter={() => interactions.hover(row)}
                  onFocus={() => interactions.hover(row)}
                  onBlur={() => interactions.hover(null)}
                  {...pinHandlers(row, interactions.togglePin)}
                >
                  <rect
                    x={barX}
                    y={top}
                    width={group.barWidth}
                    height={bottom - top}
                    fill="transparent"
                  />
                  <rect
                    x={barX}
                    y={Math.min(barY, y(0))}
                    width={group.barWidth}
                    height={Math.max(1, Math.abs(y(0) - barY))}
                    rx={4}
                    fill={modelColor(row)}
                    opacity={0.62 + (0.38 * row.effortOrder) / 60}
                  />
                  {group.barWidth > 8 && (
                    <text
                      x={barX + group.barWidth / 2}
                      y={bottom + 15}
                      textAnchor="middle"
                      fill="var(--fg-3)"
                      fontSize={11}
                    >
                      {effortMark}
                    </text>
                  )}
                  {group.barWidth > 8 && (
                    <text
                      x={labelX}
                      y={labelY}
                      textAnchor="middle"
                      fill="var(--fg-2)"
                      fontSize={11}
                    >
                      {text}
                    </text>
                  )}
                </g>
              );
            })}
            {group.groupWidth > 33 && (
              <g
                onMouseEnter={() => {
                  setHoveredFamily(model.family);
                  interactions.hover(null);
                }}
              >
                <SvgLogo model={model} x={group.center - 7} y={bottom + 28} size={14} />
                <text
                  x={group.center}
                  y={bottom + 57}
                  textAnchor="middle"
                  fill="var(--fg-2)"
                  fontSize={16}
                  fontWeight={500}
                >
                  <tspan x={group.center}>{split > 0 ? name.slice(0, split) : name}</tspan>
                  {split > 0 && (
                    <tspan x={group.center} dy={20}>
                      {name.slice(split + 1)}
                    </tspan>
                  )}
                  {metric === 'cost' && model.taskPricing?.basis === 'api-fallback' && (
                    <tspan x={group.center} dy={16} fontSize={10}>API</tspan>
                  )}
                </text>
              </g>
            )}
          </g>
        );
      })}
      {activeModel && guideY !== null && (
        <line
          x1={left}
          x2={right}
          y1={guideY}
          y2={guideY}
          stroke={modelColor(activeModel)}
          strokeWidth={1}
          strokeDasharray="6 4"
          pointerEvents="none"
          aria-hidden="true"
        />
      )}
    </>
  );
}
