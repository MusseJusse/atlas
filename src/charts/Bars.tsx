import { taskCostLabel } from './PricingDetails';
import { useId, useMemo } from 'react';
import { SvgLogo } from '../Logo';
import { barLabelColor, modelColor, shortName } from '../model-presentation';
import { format, formatModelValue } from '../formatModel';
import { metrics, type Metric } from '../chart-definitions';
import type { Settings } from '../state';
import { pinHandlers, type Interactions } from './interactions';
import { barGeometry, captionLines, diagonalCaption, fitDiagonalCaption, type MeasuredRow } from './geometry';

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
  const clipId = useId();
  const combined = settings.grouped && settings.combined;
  const { left, right, bottom, y, ticks, positioned, diagonal, diagonalMax } = useMemo(
    () => barGeometry(rows, metric, width, height, settings.grouped, settings.descending ?? false, settings.combined),
    [rows, metric, width, height, settings.grouped, settings.descending, settings.combined],
  );
  const { activeModel } = interactions;
  const activeFamily = activeModel?.family ?? interactions.highlighted;
  const activeValue = activeModel?.[metric];
  const guideY = activeValue == null ? null : y(activeValue);

  return (
    <>
      <text x={left} y={17} fill="var(--fg-2)" fontSize={12}>
        {metrics[metric].unit}
      </text>
      {ticks.map((tick) => (
        <g key={tick} transform={`translate(0,${y(tick)})`}>
          <line x1={left} x2={right} stroke="var(--grid)" strokeDasharray="2 6" />
          <text x={left - 10} y={4} textAnchor="end" fill="var(--fg-3)" fontSize={11}>
            {format(tick, metric, true)}
          </text>
        </g>
      ))}
      <line x1={left} x2={right} y1={y(0)} y2={y(0)} stroke="var(--line-2)" />
      {positioned.map((group, index) => {
        const model = group.rows[0]!;
        const nameLines = captionLines(shortName(model), group.groupWidth - 6);
        const columnClipId = `${clipId}-${index}`;
        const columnTop = y(Math.max(0, group.maximum));
        const columnBottom = y(Math.min(0, group.minimum));
        // Preserve the proportions of the original 4px corners on a 38px-wide bar.
        const columnRadius = group.barWidth * 4 / 38;
        return (
          <g
            key={group.id}
            opacity={activeFamily && activeFamily !== model.family ? 0.65 : 1}
            // Keyboard focus stays fully visible even while another model is pinned.
            className="[&:has(:focus-visible)]:opacity-100"
            pointerEvents="none"
          >
            {combined && (
              <defs>
                <clipPath id={columnClipId}>
                  <rect
                    x={group.bars[0]!.x}
                    y={columnTop}
                    width={group.barWidth}
                    height={Math.max(1, columnBottom - columnTop)}
                    rx={columnRadius}
                  />
                </clipPath>
              </defs>
            )}
            {group.bars.map(({ row, x: barX, baseline, labelX, labelY, text }) => {
              const barY = y(row.value);
              const baseY = y(baseline);
              const segmentHeight = Math.abs(baseY - barY);
              const segmentOpacity = settings.combined
                ? 0.95 - 0.5 * Math.min(1, row.effortOrder / 60)
                // The 0.74 floor keeps the faintest dark-mode bar, Luna at low effort, above 3:1 against the plot.
                : 0.74 + (0.26 * row.effortOrder) / 60;
              const effortMark =
                row.effort === 'max' ? 'Mx' : row.effortLabel.charAt(0).toUpperCase();
              const fullEffort = row.effortLabel;
              const abbreviatedEffort = fullEffort === 'medium' ? 'med' : effortMark;
              const effortLabel = fullEffort.length * 7 + 16 <= group.barWidth ? fullEffort : abbreviatedEffort;
              const showEffort = combined && segmentHeight >= 28 && effortLabel.length * 7 + 16 <= group.barWidth;
              const visibleLabel = !combined && group.barWidth > 8 ? `${effortMark}${text}, ` : '';
              return (
                <g
                  key={row.id}
                  opacity={
                    activeModel?.family === row.family && activeModel.id !== row.id ? 0.65 : 1
                  }
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer focus-visible:opacity-100 focus-visible:[&>rect[data-focus-target]]:stroke-accent focus-visible:[&>rect[data-focus-target]]:stroke-[3] mobile:focus-visible:[outline:none]"
                  aria-label={`${visibleLabel}${row.name}, ${row.effortLabel} reasoning, ${metric === 'cost' ? taskCostLabel(row) : metrics[metric].label} ${metric === 'time' && row.timeEstimate ? 'estimated ' : ''}${formatModelValue(row, metric)}`}
                  aria-pressed={interactions.pinned?.id === row.id}
                  onMouseEnter={() => interactions.hover(row)}
                  onMouseLeave={() => interactions.hover(null)}
                  onFocus={() => interactions.hover(row)}
                  onBlur={() => interactions.hover(null)}
                  {...pinHandlers(row, interactions.togglePin)}
                >
                  <rect
                    data-focus-target
                    data-bar-segment
                    pointerEvents="visiblePainted"
                    x={barX}
                    y={Math.min(barY, baseY)}
                    width={group.barWidth}
                    height={Math.max(1, segmentHeight)}
                    rx={combined ? 0 : 4}
                    clipPath={combined ? `url(#${columnClipId})` : undefined}
                    fill={modelColor(row)}
                    fillOpacity={segmentOpacity}
                    // Opacity encodes effort; a full-colour edge keeps every segment above 3:1 against the plot.
                    stroke={modelColor(row)}
                    strokeWidth={1}
                  />
                  {showEffort && (
                    <text
                      x={barX + group.barWidth / 2}
                      y={(barY + baseY) / 2}
                      dy="0.35em"
                      textAnchor="middle"
                      fill={barLabelColor(row, segmentOpacity)}
                      fontSize={12}
                      fontWeight={500}
                      pointerEvents="none"
                    >
                      {effortLabel}
                    </text>
                  )}
                  {!combined && group.barWidth > 8 && (
                    <text
                      x={barX + group.barWidth / 2}
                      y={bottom + 16}
                      textAnchor="middle"
                      fill="var(--fg-3)"
                      fontSize={11}
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
            {combined && [...new Set(group.rows.map((row) => row.value))]
              .filter((value) => y(value) > columnTop && y(value) < columnBottom)
              .map((value) => (
                <line
                  key={value}
                  x1={group.bars[0]!.x}
                  x2={group.bars[0]!.x + group.barWidth}
                  y1={y(value)}
                  y2={y(value)}
                  stroke="var(--panel)"
                  strokeWidth={1}
                  clipPath={`url(#${columnClipId})`}
                />
              ))}
            {diagonal ? (
              <g>
                <SvgLogo model={model} x={group.center - 7} y={bottom + 28} size={14} />
                {/* Dense plots set names on a diagonal from under the logo. Names past the cap keep a full-name tooltip. */}
                <text
                  x={group.center + 4}
                  y={bottom + 54}
                  transform={`rotate(-${diagonalCaption.angle} ${group.center + 4} ${bottom + 54})`}
                  textAnchor="end"
                  fill="var(--fg-2)"
                  fontSize={13}
                  fontWeight={500}
                  // The group ignores the pointer, so the caption opts back in for its tooltip.
                  pointerEvents="visiblePainted"
                >
                  <title>{shortName(model)}</title>
                  {fitDiagonalCaption(shortName(model), diagonalMax)}
                  {metric === 'cost' && model.taskPricing?.basis === 'api-fallback' && (
                    <tspan fontSize={11} fontWeight={400} fill="var(--fg-3)"> (API)</tspan>
                  )}
                </text>
              </g>
            ) : group.groupWidth > 33 && (
              <g>
                <SvgLogo model={model} x={group.center - 7} y={bottom + 28} size={14} />
                <text
                  x={group.center}
                  y={bottom + 58}
                  textAnchor="middle"
                  fill="var(--fg-2)"
                  fontSize={13}
                  fontWeight={500}
                >
                  {nameLines.map((line, lineIndex) => (
                    <tspan key={lineIndex} x={group.center} dy={lineIndex ? 16 : 0}>{line}</tspan>
                  ))}
                  {metric === 'cost' && model.taskPricing?.basis === 'api-fallback' && (
                    <tspan x={group.center} dy={15} fontSize={11} fontWeight={400} fill="var(--fg-3)">API</tspan>
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

/** Keep the value reference visible while dense columns scroll underneath. */
export function FixedBarAxis({ rows, metric, settings, plotWidth, width, height }: {
  rows: MeasuredRow[]; metric: Metric; settings: Settings; plotWidth: number; width: number; height: number;
}) {
  const { left, y, ticks } = useMemo(
    () => barGeometry(rows, metric, plotWidth, height, settings.grouped, settings.descending ?? false, settings.combined),
    [rows, metric, plotWidth, height, settings.grouped, settings.descending, settings.combined],
  );
  return <svg aria-hidden="true" className="pointer-events-none absolute inset-0 size-full font-sans" viewBox={`0 0 ${width} ${height}`} data-fixed-bar-axis>
    <rect width={left} height={height} fill="var(--panel)" />
    <rect width={left + metrics[metric].unit.length * 7} height={25} fill="var(--panel)" />
    <text x={left} y={17} fill="var(--fg-2)" fontSize={12}>{metrics[metric].unit}</text>
    {ticks.map((tick) => <text key={tick} x={left - 10} y={y(tick) + 4} textAnchor="end" fill="var(--fg-3)" fontSize={11}>{format(tick, metric, true)}</text>)}
  </svg>;
}
