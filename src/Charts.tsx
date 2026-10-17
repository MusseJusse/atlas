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
import { scaleLinear, scaleLog } from 'd3-scale';
import { extent } from 'd3-array';
import { X } from 'lucide-react';
import {
  barGroups,
  format,
  metricLabels,
  metricUnits,
  modelColor,
  paretoFrontier,
  shortName,
  type Metric,
  type Model,
  type View,
} from './models';
import type { Settings } from './state';
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
  hovered: Model | null;
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

function Tooltip({ model, pinned, onClose }: { model: Model; pinned: boolean; onClose: () => void }) {
  return (
    <div
      className={`absolute right-2 bottom-[72px] z-[3] pointer-events-none w-[272px] max-w-[calc(100vw-48px)] rounded-lg border border-line-2 bg-surface px-4 py-3.5 mobile:sticky mobile:inset-x-auto mobile:bottom-[calc(10px+env(safe-area-inset-bottom))] mobile:z-[7] mobile:mt-3.5 mobile:grid mobile:w-auto mobile:max-w-none mobile:grid-cols-2 mobile:gap-x-5 mobile:px-3.5 mobile:py-3 ${pinned ? '[&_button]:pointer-events-auto [&_a]:pointer-events-auto' : ''}`}
      role="status"
    >
      <div className="flex items-center justify-between gap-3 text-[13px] mobile:col-span-full">
        <strong className="inline-flex items-center gap-2 font-[550]">
          <Logo model={model} />
          {shortName(model)}
        </strong>
        {pinned && (
          <button
            className="flex size-5 items-center justify-center text-[20px] text-fg-3 [&:hover]:text-fg"
            onClick={onClose}
            aria-label="Close model details"
          >
            <X size={14} />
          </button>
        )}
      </div>
      <p className="mt-1 mb-3 text-[11.5px] text-fg-2 mobile:col-span-full mobile:mb-1.5">
        {model.effortLabel} reasoning · {model.labName}
      </p>
      {(
        [
          ['Intelligence index', format(model.intelligence, 'intelligence')],
          ['Cost per task', format(model.cost, 'cost')],
          ['Time per task', format(model.time, 'time')],
          ['Tokens per task', format(model.tokens, 'tokens')],
          [
            'Output speed',
            model.speed === null ? 'Not measured' : `${format(model.speed, 'speed')} tokens/s`,
          ],
        ] as const
      ).map(([label, value]) => (
        <div className="flex justify-between gap-5 py-1 text-[12px]" key={label}>
          <span className="text-fg-2">{label}</span>
          <b className="font-medium tabular-nums">{value}</b>
        </div>
      ))}
      <a
        className="mt-2.5 inline-block text-[11.5px] text-accent underline underline-offset-[3px] [&:hover]:text-fg mobile:col-span-full mobile:mt-1.5"
        href={`https://artificialanalysis.ai/models/${model.family}`}
        target="_blank"
        rel="noreferrer"
      >
        View on Artificial Analysis
      </a>
    </div>
  );
}

function Scatter({
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
  const mobile = width < 600;
  const linear = settings.linear.includes(metric === 'tokens' ? 'tokens-task' : 'cost-intelligence');
  const {
    left,
    right,
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
    const points = rows.filter(
      (row) => row[metric] !== null && row[metric]! > 0 && row.intelligence !== null,
    );
    const [min = 0.01, max = 1] = extent(points, (model) => model[metric]!);
    const x = linear
      ? scaleLinear()
          .domain([0, max * 1.08])
          .nice()
          .range([left, right])
      : scaleLog()
          .domain([min * 0.7, max * 1.08])
          .range([left, right]);
    const scoreMin = Math.max(
      0,
      Math.floor((Math.min(...points.map((row) => row.intelligence!), 30) - 4) / 10) * 10,
    );
    const scoreMax = Math.ceil((Math.max(...points.map((row) => row.intelligence!), 50) + 2) / 5) * 5;
    const y = scaleLinear().domain([scoreMin, scoreMax]).range([bottom, top]);
    const frontier = paretoFrontier(points, metric);
    const frontierIds = new Set(frontier.map((row) => row.id));
    const frontierFamilies = new Set(frontier.map((row) => row.family));
    const series = [...new Set(points.map((row) => row.family))].map((family) => ({
      family,
      rows: points.filter((row) => row.family === family).toSorted((a, b) => a.effortOrder - b.effortOrder),
    }));
    const labelPositions = series
      .map((series) => ({ ...series, end: series.rows.at(-1)! }))
      .sort((a, b) => y(a.end.intelligence!) - y(b.end.intelligence!));
    let lastY = top - 24;
    const labels = labelPositions.map((series) => {
      lastY = Math.max(y(series.end.intelligence!), lastY + 24);
      return { ...series, y: Math.min(lastY, bottom - 10) };
    });
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
  const activeFamily =
    interactions.pinned?.family ?? interactions.hovered?.family ?? interactions.highlighted;

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
          stroke="var(--fg)"
          strokeWidth="2.5"
          strokeDasharray="6 5"
          opacity="0.95"
          pointerEvents="none"
        />
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
            const active = interactions.pinned?.id === model.id || interactions.hovered?.id === model.id;
            return (
              <g
                key={model.id}
                role="button"
                tabIndex={0}
                aria-label={`${model.name}, ${model.effortLabel}, ${metricLabels[metric]} ${format(model[metric], metric)}, intelligence ${format(model.intelligence, 'intelligence')}`}
                aria-pressed={interactions.pinned?.id === model.id}
                className="cursor-pointer focus-visible:[&>circle:last-child]:stroke-accent focus-visible:[&>circle:last-child]:stroke-[3] focus-visible:[&>rect:nth-child(2)]:stroke-accent focus-visible:[&>rect:nth-child(2)]:stroke-[3] mobile:focus-visible:[outline:none]"
                opacity={settings.frontier && !onFrontier && !active && !activeFamily ? 0.15 : 1}
                onMouseEnter={() => interactions.hover(model)}
                onMouseLeave={() => interactions.hover(null)}
                onFocus={() => interactions.hover(model)}
                onBlur={() => interactions.hover(null)}
                onClick={() => interactions.pin(interactions.pinned?.id === model.id ? null : model)}
                onKeyDown={(event) => activate(event, () => interactions.pin(model))}
              >
                <circle cx={x(model[metric]!)} cy={y(model.intelligence!)} r={13} fill="transparent" />
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
                  stroke={onFrontier && settings.frontier ? 'var(--fg)' : 'var(--bg)'}
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
                fontSize="13"
                fontWeight="650"
                fill={modelColor(series.end)}
              >
                {shortName(series.end)}
              </text>
            </g>
          );
        })}
      <text x={(left + right) / 2} y={height - 4} textAnchor="middle" fill="var(--fg-2)" fontSize="12">
        {metricLabels[metric]} ({metric === 'cost' ? 'USD' : metricUnits[metric]}, {linear ? 'linear' : 'log'}{' '}
        scale)
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
    const top = 30;
    const bottom = height - 96;
    const groups = barGroups(rows, metric, settings.grouped, settings.descending);
    const y = scaleLinear()
      .domain([0, Math.max(...groups.map((group) => group.maximum), 1) * 1.15])
      .range([bottom, top]);
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
        const text = barWidth > 8 ? format(row[metric], metric, true) : '';
        const textWidth = text.length * 6.4;
        const labelX = Math.max(left + textWidth / 2, Math.min(right - textWidth / 2, x + barWidth / 2));
        let labelY = y(row[metric]!) - 8;
        while (
          barWidth > 8 &&
          valueLabels.some(
            (label) =>
              Math.abs(label.x - labelX) < (label.width + textWidth) / 2 + 4 &&
              Math.abs(label.y - labelY) < 17,
          )
        )
          labelY -= 17;
        if (barWidth > 8) valueLabels.push({ x: labelX, y: labelY, width: textWidth });
        return { row, x, labelX, labelY, text };
      });
      return { ...group, center, groupWidth, barWidth, bars };
    });
    return { left, right, top, bottom, y, positioned };
  }, [rows, metric, width, height, settings.grouped, settings.descending]);
  const activeModel = interactions.pinned ?? interactions.hovered;
  const activeFamily = activeModel?.family ?? hoveredFamily ?? interactions.highlighted;

  return (
    <>
      <text x={left} y={17} fill="var(--fg-2)" fontSize={12}>
        {metricUnits[metric]}
      </text>
      {y.ticks(4).map((tick) => (
        <g key={tick} transform={`translate(0,${y(tick)})`}>
          <line x1={left} x2={right} stroke="var(--line)" strokeDasharray="2 6" />
          <text x={left - 10} y={4} textAnchor="end" fill="var(--fg-3)" fontSize={11}>
            {format(tick, metric, true)}
          </text>
        </g>
      ))}
      <line x1={left} x2={right} y1={bottom} y2={bottom} stroke="var(--line-2)" />
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
              return (
                <g
                  key={row.id}
                  opacity={activeModel?.family === row.family && activeModel.id !== row.id ? 0.2 : 1}
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer focus-visible:[&>circle:last-child]:stroke-accent focus-visible:[&>circle:last-child]:stroke-[3] focus-visible:[&>rect:nth-child(2)]:stroke-accent focus-visible:[&>rect:nth-child(2)]:stroke-[3] mobile:focus-visible:[outline:none]"
                  aria-label={`${row.name}, ${row.effortLabel}, ${format(row[metric], metric)}`}
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
                  <rect x={barX} y={top} width={group.barWidth} height={bottom - top} fill="transparent" />
                  <rect
                    x={barX}
                    y={barY}
                    width={group.barWidth}
                    height={Math.max(1, bottom - barY)}
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
                      {row.effort === 'max' ? 'Mx' : row.effortLabel[0]?.toUpperCase()}
                    </text>
                  )}
                  {group.barWidth > 8 && (
                    <text x={labelX} y={labelY} textAnchor="middle" fill="var(--fg-2)" fontSize={11}>
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
                  fontSize={11}
                  fontWeight={500}
                >
                  <tspan x={group.center}>{split > 0 ? name.slice(0, split) : name}</tspan>
                  {split > 0 && (
                    <tspan x={group.center} dy={14}>
                      {name.slice(split + 1)}
                    </tspan>
                  )}
                </text>
              </g>
            )}
          </g>
        );
      })}
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
    () => barGroups(rows, metric, true, settings.descending),
    [rows, metric, settings.descending],
  );
  const max = Math.max(...groups.map((group) => group.maximum), 1);
  return (
    <div className="flex flex-col">
      <div className="flex justify-between border-b border-line pt-0.5 pb-1.5 text-[11px] text-fg-3 tabular-nums">
        <span>0</span>
        <span>{format(max, metric, true)}</span>
      </div>
      {groups.map((group) => {
        const model = group.rows[0]!;
        const minimum = Math.min(...group.rows.map((row) => row[metric]!));
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
                <span className="overflow-hidden text-ellipsis whitespace-nowrap">{shortName(model)}</span>
              </span>
              <span className="text-[13px] text-fg-2 tabular-nums">
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
                    left: `${(minimum / max) * 100}%`,
                    width: `${((group.maximum - minimum) / max) * 100}%`,
                    background: modelColor(model),
                  }}
                />
                {group.rows.map((row) => (
                  <span
                    className="absolute top-px -ml-[5px] size-2.5 rounded-[50%] [box-shadow:0_0_0_1.5px_var(--bg)]"
                    key={row.id}
                    style={{
                      left: `${(row[metric]! / max) * 100}%`,
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
                    <b className="text-right font-medium tabular-nums">{format(row[metric], metric)}</b>
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
  const ready = active || visited;
  const scatter = view.scatter || (view.id === 'tokens-task' && settings.scatter);
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
  const [hovered, setHovered] = useState<Model | null>(null);
  const [pinned, setPinned] = useState<Model | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const interactions: Interactions = {
    hovered,
    pinned,
    highlighted,
    hover: setHovered,
    pin: setPinned,
    highlight: onHighlight,
  };
  const validRows = useMemo(
    () => rows.filter((row) => row[view.metric] !== null && (!scatter || row.intelligence !== null)),
    [rows, view.metric, scatter],
  );
  const tooltip = pinned ?? hovered;
  // Keep a pinned tooltip tied to a visible configuration after filters change.
  const visibleTooltip = tooltip && rows.some((row) => row.id === tooltip.id) ? tooltip : null;
  const mobile = width < 600;
  const legend = [...new Map(validRows.map((row) => [row.family, row])).values()];

  function closeOnBackground(event: MouseEvent<SVGSVGElement>) {
    if (event.target instanceof SVGRectElement && event.target.classList.contains('chart-background'))
      setPinned(null);
  }

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
      <div
        className={`relative min-h-0 flex-1 mobile:aspect-[1/1.2] mobile:flex-none ${!scatter ? 'phone:pointer-events-none phone:invisible phone:absolute phone:h-px phone:w-full phone:aspect-auto' : ''}`}
        ref={ref}
      >
        {ready &&
          (scatter || !phone) &&
          (validRows.length ? (
            <svg
              id={`chart-${view.id}`}
              className="absolute inset-0 block size-full font-sans [&_g[role=button]:focus]:[outline:none]"
              viewBox={`0 0 ${width} ${height}`}
              role="group"
              aria-label={
                scatter ? `${metricLabels[view.metric]} versus Intelligence Index` : `${view.label} by model`
              }
              onClick={closeOnBackground}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setPinned(null);
              }}
            >
              <rect className="chart-background" width={width} height={height} fill="var(--bg)" />
              {scatter ? (
                <Scatter
                  rows={validRows}
                  metric={view.metric}
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
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2.5">
              <strong className="text-[17px] font-medium">No models to display</strong>
              <span className="m-0 text-[12px] text-fg-2">
                Select a model with measurements for this view.
              </span>
            </div>
          ))}
      </div>
      {ready && !scatter && phone && (
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
      {ready && scatter && mobile && settings.labels && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 pt-2.5">
          {legend.map((model) => (
            <button
              className="flex min-h-8 items-center gap-[7px] overflow-hidden text-left text-[13px] font-[550] whitespace-nowrap"
              key={model.family}
              style={{ color: modelColor(model) }}
              onClick={() => setPinned(model)}
            >
              <Logo model={model} />
              {shortName(model)}
            </button>
          ))}
        </div>
      )}
      {visibleTooltip && (
        <Tooltip
          model={visibleTooltip}
          pinned={Boolean(pinned)}
          onClose={() => {
            setPinned(null);
            setHovered(null);
          }}
        />
      )}
    </div>
  );
});
