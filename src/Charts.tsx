import {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import { barDomain, linearScale, logScale } from './scales';
import { scatterDomain, scatterRows } from './scatter-data';
import { resolveChartInteraction } from './chart-interactions';
import { useHydrated } from './useHydrated';
import { X } from 'lucide-react';
import {
  barGroups,
  format,
  formatModelValue,
  modelColor,
  paretoFrontier,
  shortName,
  type Model,
} from './models';
import { metrics, resolveView, type Metric, type View } from './chart-definitions';
import { chartDescending, type Settings } from './state';
import { Logo, SvgLogo } from './Logo';

function useSize(enabled: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 960, height: 640 });
  useLayoutEffect(() => {
    if (!enabled) return;
    const element = ref.current;
    if (!element) return;
    const resize = (width: number, height: number) => {
      width = Math.round(width);
      height = Math.round(height);
      setSize((previous) =>
        previous.width === width && previous.height === height ? previous : { width, height },
      );
    };
    resize(element.clientWidth, element.clientHeight);
    const observer = new ResizeObserver(([entry]) => {
      if (entry) resize(entry.contentRect.width, entry.contentRect.height);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [enabled]);
  return { ref, ...size };
}

type Interactions = {
  activeModel: Model | null;
  pinned: Model | null;
  highlighted: string | null;
  hover: (model: Model | null) => void;
  pin: (model: Model | null) => void;
  highlight: (family: string | null) => void;
};

function activate(event: KeyboardEvent<SVGGElement>, action: () => void) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    action();
  }
}

/** A fixed place to inspect a configuration without covering the chart. */
function ConfigurationDetails({
  model,
  metric,
  pinned,
  onClose,
}: {
  model: Model | null;
  metric: Metric;
  pinned: boolean;
  onClose: () => void;
}) {
  return (
    <div
      className="mt-3 min-h-[112px] short:min-h-24 shrink-0 rounded-lg bg-surface px-4 py-3 phone:px-3"
      aria-live={pinned ? 'polite' : 'off'}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
    >
      {model ? (
        <>
          <div className="flex min-h-6 flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[12px]">
              <strong className="inline-flex items-center gap-2 font-[550]">
                <Logo model={model} size={13} />
                {shortName(model)}
              </strong>
              <span className="text-[11px] text-fg-2">
                {model.effort === 'none' ? 'No reasoning' : `${model.effortLabel} reasoning`},{' '}
                {model.labName}
              </span>
              <span className="text-[10px] text-accent">{pinned ? 'Pinned' : 'Preview'}</span>
            </div>
            {pinned && (
              <a
                className="ml-auto shrink-0 text-[11px] text-accent underline underline-offset-4"
                href={
                  model.speedSource?.url ?? `https://artificialanalysis.ai/models/${model.family}`
                }
                target="_blank"
                rel="noreferrer"
                aria-label={`View ${model.name} on Artificial Analysis`}
              >
                View source
              </a>
            )}
            {pinned && (model.speedSource || model.timeEstimate) && (
              <details className="group relative shrink-0">
                <summary
                  className="flex min-h-8 cursor-pointer list-none items-center rounded-md px-2 text-[11px] text-accent hover:bg-hover focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden"
                  aria-label="Measurement notes"
                >
                  Notes
                </summary>
                <div className="absolute right-0 bottom-[calc(100%+10px)] z-10 w-[300px] max-w-[calc(100vw-80px)] rounded-lg border border-line bg-panel px-4 py-3 shadow-lg">
                  {model.speedSource && (
                    <p className="mt-2 mb-0 text-[11px] text-fg-2">
                      Speed snapshot: {model.speedSource.fetchedAt.slice(0, 10)}
                    </p>
                  )}
                  {model.timeEstimate && (
                    <p className="mt-2 mb-0 text-[11px] leading-5 text-fg-2">
                      Local time estimate. Uses standard Sol High task tokens at Max-measured
                      throughput.
                      <br />
                      {model.timeEstimate.baselineTokens.toFixed(1)} tokens ÷{' '}
                      {format(model.speed, 'speed')} tokens/s. Baseline:{' '}
                      {model.timeEstimate.baselineFetchedAt.slice(0, 10)}
                    </p>
                  )}
                </div>
              </details>
            )}
            {pinned && (
              <button
                className="-my-2 -mr-2 flex size-10 shrink-0 items-center justify-center rounded-md text-fg-2 hover:bg-hover hover:text-accent"
                onClick={onClose}
                aria-label="Close model details"
              >
                <X size={15} aria-hidden="true" />
              </button>
            )}
          </div>
          <dl className="mt-2 mb-0 grid grid-cols-5 gap-x-3 gap-y-3 phone:grid-cols-2">
            {(
              [
                metric === 'omniscience'
                  ? ['AA-Omniscience Index', format(model.omniscience, 'omniscience')]
                  : ['Intelligence index', format(model.intelligence, 'intelligence')],
                ['Cost per task', format(model.cost, 'cost')],
                ['Time per task', formatModelValue(model, 'time')],
                ['Tokens per task', format(model.tokens, 'tokens')],
                ['Output tokens / s', format(model.speed, 'speed')],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-[10px] text-fg-2">{label}</dt>
                <dd className="m-0 mt-0.5 text-[17px] font-medium tracking-[-0.4px] phone:text-[16px]">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </>
      ) : (
        <div className="flex min-h-[88px] short:min-h-[72px] flex-col justify-center gap-1">
          <strong className="text-[12px] font-medium">Configuration details</strong>
          <span className="text-[12px] text-fg-2 phone:hidden">
            Hover or focus a configuration to preview it. Click to pin its measurements.
          </span>
          <span className="hidden text-[12px] text-fg-2 phone:inline">
            Tap a point or model label to pin its measurements.
          </span>
        </div>
      )}
    </div>
  );
}

function Scatter({
  rows,
  metric,
  linear,
  settings,
  width,
  height,
  interactions,
}: {
  rows: Model[];
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
  } = useMemo(() => {
    const left = mobile ? 46 : 64;
    const right = width - (settings.labels && !mobile ? 235 : 24);
    const top = 30;
    const bottom = Math.max(130, height - 60);
    const domain = scatterDomain(rows, metric, linear);
    const x = linear
      ? linearScale(domain, [left, right], { nice: true })
      : logScale(domain, [left, right]);
    const scoreMin = Math.max(
      0,
      Math.floor((Math.min(...rows.map((row) => row.intelligence!), 30) - 4) / 10) * 10,
    );
    const scoreMax =
      Math.ceil((Math.max(...rows.map((row) => row.intelligence!), 50) + 2) / 5) * 5;
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
      .sort((a, b) => y(a.end.intelligence!) - y(b.end.intelligence!));
    const labelSpacing = Math.min(24, (bottom - top) / Math.max(1, labelPositions.length - 1));
    let lastY = top - labelSpacing;
    const labels = labelPositions.map((series) => {
      lastY = Math.max(y(series.end.intelligence!), lastY + labelSpacing);
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
    const path = (data: Model[]) =>
      data
        .map((model, index) => `${index ? 'L' : 'M'}${x(model[metric]!)},${y(model.intelligence!)}`)
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
  }, [rows, metric, width, height, settings.labels, linear]);
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
                className="cursor-pointer focus-visible:[&>circle:last-child]:stroke-accent focus-visible:[&>circle:last-child]:stroke-[3] focus-visible:[&>rect:nth-child(2)]:stroke-accent focus-visible:[&>rect:nth-child(2)]:stroke-[3] mobile:focus-visible:[outline:none]"
                opacity={settings.frontier && !onFrontier && !active && !activeFamily ? 0.15 : 1}
                onMouseEnter={() => interactions.hover(model)}
                onMouseLeave={() => interactions.hover(null)}
                onFocus={() => interactions.hover(model)}
                onBlur={() => interactions.hover(null)}
                onClick={() =>
                  interactions.pin(interactions.pinned?.id === model.id ? null : model)
                }
                onKeyDown={(event) => activate(event, () => interactions.pin(model))}
              >
                <circle
                  cx={x(model[metric]!)}
                  cy={y(model.intelligence!)}
                  r={13}
                  fill="transparent"
                />
                {active && (
                  <circle
                    cx={x(model[metric]!)}
                    cy={y(model.intelligence!)}
                    r={10}
                    fill="none"
                    stroke={modelColor(model)}
                    opacity={0.5}
                  />
                )}
                <circle
                  cx={x(model[metric]!)}
                  cy={y(model.intelligence!)}
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
              className="cursor-pointer"
              opacity={dim ? 0.2 : 1}
              role="button"
              tabIndex={0}
              aria-label={`Highlight ${series.end.name}`}
              onMouseEnter={() => interactions.highlight(series.family)}
              onMouseLeave={() => interactions.highlight(null)}
              onClick={() => interactions.pin(series.end)}
              onKeyDown={(event) => activate(event, () => interactions.pin(series.end))}
            >
              <path
                d={`M${x(series.end[metric]!) + 8},${y(series.end.intelligence!)} L${right + 20},${series.y}`}
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

function Bars({
  rows,
  metric,
  settings,
  width,
  height,
  interactions,
}: {
  rows: Model[];
  metric: Metric;
  settings: Settings;
  width: number;
  height: number;
  interactions: Interactions;
}) {
  const enterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // A delayed chart exit must not clear a newer highlight from the sidebar.
  const [hoveredFamily, setHoveredFamily] = useState<string | null>(null);

  function cancelEnter() {
    if (enterTimer.current !== null) {
      clearTimeout(enterTimer.current);
      enterTimer.current = null;
    }
  }

  function cancelExit() {
    if (exitTimer.current !== null) {
      clearTimeout(exitTimer.current);
      exitTimer.current = null;
    }
  }

  function cancelHover() {
    cancelEnter();
    cancelExit();
  }

  // Ignore brief passes over bars and labels, including when chart contents change.
  useEffect(() => cancelHover, [rows, metric, settings.grouped, settings.descending]);

  function enterHover(family: string, action: () => void) {
    cancelEnter();
    if (activeFamily === family) {
      cancelExit();
      action();
      return;
    }
    enterTimer.current = setTimeout(() => {
      enterTimer.current = null;
      action();
    }, 100);
  }

  function leaveHover() {
    cancelEnter();
    if (exitTimer.current !== null) return;
    exitTimer.current = setTimeout(() => {
      exitTimer.current = null;
      interactions.hover(null);
      setHoveredFamily(null);
    }, 50);
  }

  function hover(model: Model | null) {
    cancelHover();
    interactions.hover(model);
  }

  const { left, right, top, bottom, y, positioned } = useMemo(() => {
    const left = width < 600 ? 46 : 64;
    const right = width - 18;
    const top = metric === 'omniscience' ? 50 : 30;
    const bottom = height - 96;
    const groups = barGroups(rows, metric, settings.grouped, settings.descending ?? false);
    const values = rows.map((row) => row[metric]!);
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
        const negative = row[metric]! < 0;
        let labelY = y(row[metric]!) + (negative ? 16 : -8);
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
  }, [rows, metric, width, height, settings.grouped, settings.descending]);
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
            opacity={activeFamily && activeFamily !== model.family ? 0.2 : 1}
            onMouseEnter={() => {
              if (activeFamily === model.family) cancelExit();
            }}
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
              const barY = y(row[metric]!);
              const effortMark =
                row.effort === 'max' ? 'Mx' : row.effortLabel.charAt(0).toUpperCase();
              const visibleLabel = group.barWidth > 8 ? `${effortMark}${text}, ` : '';
              return (
                <g
                  key={row.id}
                  opacity={
                    activeModel?.family === row.family && activeModel.id !== row.id ? 0.2 : 1
                  }
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer focus-visible:[&>circle:last-child]:stroke-accent focus-visible:[&>circle:last-child]:stroke-[3] focus-visible:[&>rect:nth-child(2)]:stroke-accent focus-visible:[&>rect:nth-child(2)]:stroke-[3] mobile:focus-visible:[outline:none]"
                  aria-label={`${visibleLabel}${row.name}, ${row.effortLabel} reasoning, ${metrics[metric].label} ${metric === 'time' && row.timeEstimate ? 'estimated ' : ''}${formatModelValue(row, metric)}`}
                  aria-pressed={interactions.pinned?.id === row.id}
                  onMouseEnter={() => enterHover(row.family, () => interactions.hover(row))}
                  onMouseLeave={cancelEnter}
                  onFocus={() => hover(row)}
                  onBlur={() => hover(null)}
                  onClick={() => {
                    cancelHover();
                    interactions.pin(interactions.pinned?.id === row.id ? null : row);
                  }}
                  onKeyDown={(event) => activate(event, () => interactions.pin(row))}
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
                      fontSize={9}
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
                onMouseEnter={() =>
                  enterHover(model.family, () => {
                    setHoveredFamily(model.family);
                    interactions.hover(null);
                  })
                }
                onMouseLeave={cancelEnter}
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

const DotPlot = memo(function DotPlot({
  rows,
  metric,
  settings,
  expanded,
  onExpand,
}: {
  rows: Model[];
  metric: Metric;
  settings: Settings;
  expanded: string | null;
  onExpand: (id: string | null) => void;
}) {
  const groups = useMemo(
    () => {
      const descending = chartDescending(metric, true, settings.descending);
      // Rank ranges by the end the user asked to see first.
      return barGroups(rows, metric, true, descending, descending ? 'maximum' : 'minimum');
    },
    [rows, metric, settings.descending],
  );
  const [min, max] = barDomain(groups.flatMap((group) => group.rows.map((row) => row[metric]!)));
  const position = linearScale([min, max], [0, 100]);
  return (
    <div className="flex flex-col">
      <div className="relative flex justify-between border-b border-line pt-0.5 pb-1.5 text-[11px] text-fg-3 tabular-nums">
        <span>{format(min, metric, true)}</span>
        {min < 0 && max > 0 && position(0) > 10 && position(0) < 90 && (
          <span className="absolute -translate-x-1/2" style={{ left: `${position(0)}%` }}>
            0
          </span>
        )}
        <span>{format(max, metric, true)}</span>
      </div>
      {groups.map((group) => {
        const model = group.rows[0]!;
        const { minimum } = group;
        const open = group.id === expanded;
        return (
          <div className="border-b border-line" key={group.id}>
            <button
              className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 pt-[11px] pb-3 text-left"
              aria-expanded={open}
              aria-controls={`variants-${metric}-${group.id}`}
              onClick={() => onExpand(open ? null : group.id)}
            >
              <span className="flex min-w-0 items-center gap-[7px] text-[14px] font-[550]">
                <Logo model={model} />
                <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                  {shortName(model)}
                </span>
              </span>
              <span className="text-[13px] text-fg-2 tabular-nums">
                {metric === 'time' && model.timeEstimate && '~'}
                {format(minimum, metric)}
                {minimum !== group.maximum && ` to ${format(group.maximum, metric)}`}
              </span>
              <span
                className="relative col-span-full mx-[5px] h-3 [background:linear-gradient(var(--line-2),var(--line-2))_center/100%_1px_no-repeat]"
                aria-hidden="true"
              >
                <span
                  className="absolute top-[5px] h-0.5 opacity-45"
                  style={{
                    left: `${position(minimum)}%`,
                    width: `${position(group.maximum) - position(minimum)}%`,
                    background: modelColor(model),
                  }}
                />
                {min < 0 && (
                  <span
                    className="absolute top-0 h-3 border-l border-line-2"
                    style={{ left: `${position(0)}%` }}
                  />
                )}
                {group.rows.map((row) => (
                  <span
                    className="absolute top-px -ml-[5px] size-2.5 rounded-[50%] [box-shadow:0_0_0_1.5px_var(--panel)]"
                    key={row.id}
                    style={{
                      left: `${position(row[metric]!)}%`,
                      background: modelColor(row),
                      opacity: 0.62 + (0.38 * row.effortOrder) / 60,
                    }}
                  />
                ))}
              </span>
            </button>
            {open && (
              <div
                className="flex flex-col gap-1.5 pb-3.5 pl-[21px] text-[13px]"
                id={`variants-${metric}-${group.id}`}
              >
                {group.rows.map((row) => (
                  <div className="flex justify-between gap-3" key={row.id}>
                    <span className="text-fg-2">{row.effortLabel}</span>
                    <b className="text-right font-medium tabular-nums">
                      {formatModelValue(row, metric)}
                    </b>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});

export const Chart = memo(function Chart({
  active,
  phone,
  view,
  rows,
  settings,
  highlighted,
  onHighlight,
}: {
  active: boolean;
  phone: boolean;
  view: View;
  rows: Model[];
  settings: Settings;
  highlighted: string | null;
  onHighlight: (id: string | null) => void;
}) {
  const [visited, setVisited] = useState(active);
  const hydrated = useHydrated();
  const ready = hydrated && (active || visited);
  const { scatter, linear } = resolveView(view, settings);
  const { ref, width, height } = useSize(ready && (scatter || !phone));

  // Desktop sections have a fixed height, so charts can mount just before scrolling into view.
  // Keep visited charts mounted to preserve pinned details and avoid navigation fetches.
  useEffect(() => {
    if (visited) return;
    if (active) {
      setVisited(true);
      return;
    }
    const section = ref.current?.closest('section');
    if (!section) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisited(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [active, visited]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const validRows = useMemo(
    () =>
      scatter
        ? scatterRows(rows, view.metric, linear)
        : rows.filter((row) => row[view.metric] !== null),
    [rows, view.metric, scatter, linear],
  );
  const { pinned, activeModel } = resolveChartInteraction(validRows, pinnedId, hoveredId);
  const interactions: Interactions = {
    pinned,
    activeModel,
    highlighted: validRows.some((row) => row.family === highlighted) ? highlighted : null,
    hover: (model) => setHoveredId(model?.id ?? null),
    pin: (model) => setPinnedId(model?.id ?? null),
    highlight: onHighlight,
  };
  const legend = [...new Map(validRows.map((row) => [row.family, row])).values()];

  function closeOnBackground(event: MouseEvent<SVGSVGElement>) {
    if (
      event.target instanceof SVGRectElement &&
      event.target.classList.contains('chart-background')
    )
      setPinnedId(null);
  }

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
      <div
        className={`relative min-h-0 flex-1 mobile:aspect-[1/1.2] mobile:flex-none ${!scatter && (!ready || validRows.length > 0) ? 'phone:pointer-events-none phone:invisible phone:absolute phone:h-px phone:w-full phone:aspect-auto' : ''}`}
        ref={ref}
      >
        {ready &&
          (validRows.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2.5">
              <strong className="text-[17px] font-medium">No models to display</strong>
              <span className="m-0 text-[12px] text-fg-2">
                Select a model with measurements for this view.
              </span>
            </div>
          ) : (scatter || !phone) && (
            <svg
              id={`chart-${view.id}`}
              className="absolute inset-0 block size-full font-sans [&_g[role=button]:focus]:[outline:none]"
              viewBox={`0 0 ${width} ${height}`}
              role="group"
              aria-label={
                scatter
                  ? `${metrics[view.metric].label} versus Intelligence Index`
                  : `${view.label} by model`
              }
              onClick={closeOnBackground}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setPinnedId(null);
              }}
            >
              <rect
                className="chart-background"
                width={width}
                height={height}
                fill="var(--panel)"
              />
              {scatter ? (
                <Scatter
                  rows={validRows}
                  metric={view.metric}
                  linear={linear}
                  settings={settings}
                  width={width}
                  height={height}
                  interactions={interactions}
                />
              ) : (
                <Bars
                  rows={validRows}
                  metric={view.metric}
                  settings={settings}
                  width={width}
                  height={height}
                  interactions={interactions}
                />
              )}
            </svg>
          ))}
      </div>
      {ready && validRows.length > 0 && !scatter && phone && (
        <div className="hidden phone:block">
          <DotPlot
            rows={validRows}
            metric={view.metric}
            settings={settings}
            expanded={expanded}
            onExpand={setExpanded}
          />
        </div>
      )}
      {/* Reserve the mobile legend's height in the initial HTML before hydration. */}
      {scatter && settings.labels && (
        <div className="hidden plot-mobile:grid grid-cols-2 gap-x-3 gap-y-0.5 pt-2.5">
          {legend.map((model) => (
            <button
              className="flex min-h-8 items-center gap-[7px] overflow-hidden text-left text-[13px] font-[550] whitespace-nowrap"
              key={model.family}
              style={{ color: modelColor(model) }}
              onClick={() => setPinnedId(model.id)}
            >
              <Logo model={model} />
              {shortName(model)}
            </button>
          ))}
        </div>
      )}
      {(scatter || !phone) && (
        <ConfigurationDetails
          model={activeModel}
          metric={view.metric}
          pinned={Boolean(pinned)}
          onClose={() => {
            setPinnedId(null);
            setHoveredId(null);
          }}
        />
      )}
    </div>
  );
});
