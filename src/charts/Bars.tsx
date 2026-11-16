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
            {group.bars.map(({ row, x: barX, baseline, labelX, labelY, text, shadeOrder }, index) => {
              const barY = y(row.value);
              const baseY = y(baseline);
              const segmentHeight = Math.abs(baseY - barY);
              const markerWidth = group.barWidth / group.rows.length;
              const markerX = barX + index * markerWidth;
              const segmentOpacity = settings.grouped ? 0.95 - 0.5 * (shadeOrder / Math.max(1, group.bars.length - 1)) : 0.62 + (0.38 * row.effortOrder) / 60;
              const showEffort = settings.grouped && segmentHeight >= 22 && group.barWidth >= 24;
              const effortMark =
                row.effort === 'max' ? 'Mx' : row.effortLabel.charAt(0).toUpperCase();
              const visibleLabel = !settings.grouped && group.barWidth > 8 ? `${effortMark}${text}, ` : '';
              return (
                <g
                  key={row.id}
                  opacity={
                    activeModel?.family === row.family && activeModel.id !== row.id ? 0.65 : 1
                  }
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer focus-visible:[&>rect[data-focus-target]]:stroke-accent focus-visible:[&>rect[data-focus-target]]:stroke-[3] mobile:focus-visible:[outline:none]"
                  aria-label={`${visibleLabel}${row.name}, ${row.effortLabel} reasoning, ${metric === 'cost' ? taskCostLabel(row) : metrics[metric].label} ${metric === 'time' && row.timeEstimate ? 'estimated ' : ''}${formatModelValue(row, metric)}`}
                  aria-pressed={interactions.pinned?.id === row.id}
                  onMouseEnter={() => interactions.hover(row)}
                  onFocus={() => interactions.hover(row)}
                  onBlur={() => interactions.hover(null)}
                  {...pinHandlers(row, interactions.togglePin)}
                >
                  <rect
                    x={barX}
                    y={settings.grouped ? Math.min(barY, baseY) : top}
                    width={group.barWidth}
                    height={settings.grouped ? Math.max(1, segmentHeight) : bottom - top}
                    fill="transparent"
                  />
                  <rect
                    data-focus-target
                    x={barX}
                    y={Math.min(barY, baseY)}
                    width={group.barWidth}
                    height={Math.max(1, segmentHeight)}
                    rx={settings.grouped ? 0 : 4}
                    fill={modelColor(row)}
                    opacity={segmentOpacity}
                    stroke={settings.grouped ? 'var(--panel)' : undefined}
                    strokeWidth={settings.grouped ? 1 : undefined}
                  />
                  {showEffort && <text x={barX + group.barWidth / 2} y={(barY + baseY) / 2} dy="0.35em" textAnchor="middle" fill="var(--fg)" fontSize={11} pointerEvents="none" stroke="var(--panel)" strokeWidth={3} paintOrder="stroke" strokeLinejoin="round">{row.effortLabel.length * 6 + 12 <= group.barWidth ? row.effortLabel : effortMark}</text>}
                  {/* Separate reasoning targets keep tied and very small segments selectable. */}
                  {settings.grouped && <>
                    <rect data-focus-target x={markerX} y={bottom + 2} width={markerWidth} height={22} fill="var(--panel)" stroke="var(--line-2)" />
                    <rect x={markerX + Math.min(1, markerWidth / 2)} y={bottom + 3} width={Math.max(0, markerWidth - 2)} height={3} fill={modelColor(row)} opacity={segmentOpacity} pointerEvents="none" />
                  </>}
                  {(settings.grouped ? markerWidth > 8 : group.barWidth > 8) && (
                    <text
                      x={settings.grouped ? markerX + markerWidth / 2 : barX + group.barWidth / 2}
                      y={bottom + 19}
                      textAnchor="middle"
                      fill="var(--fg-3)"
                      fontSize={9}
                    >
                      {effortMark}
                    </text>
                  )}
                  {text && (
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
