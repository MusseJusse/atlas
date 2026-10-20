import {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from 'react';
import { resolveChartInteraction } from './chart-interactions';
import { useHydrated } from './useHydrated';
import { shortName, type Model } from './models';
import { metrics, resolveView, type View } from './chart-definitions';
import type { Settings } from './state';
import { Logo } from './Logo';
import { ConfigurationDetails } from './charts/ConfigurationDetails';
import { Scatter } from './charts/Scatter';
import { Bars } from './charts/Bars';
import { DotPlot } from './charts/DotPlot';
import { measureRows, measureScatterRows } from './charts/geometry';
import type { Interactions } from './charts/interactions';

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
  const prepared = useMemo(
    () =>
      scatter
        ? { scatter: true, rows: measureScatterRows(rows, view.metric, linear) } as const
        : { scatter: false, rows: measureRows(rows, view.metric) } as const,
    [rows, view.metric, scatter, linear],
  );
  const validRows = prepared.rows;
  const { pinned, activeModel } = resolveChartInteraction(validRows, pinnedId, hoveredId);
  const interactions: Interactions = {
    pinned,
    activeModel,
    highlighted: validRows.some((row) => row.family === highlighted) ? highlighted : null,
    hover: (model) => setHoveredId(model?.id ?? null),
    togglePin: (model) => setPinnedId((previous) => previous === model.id ? null : model.id),
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
              {prepared.scatter ? (
                <Scatter
                  rows={prepared.rows}
                  metric={view.metric}
                  linear={linear}
                  settings={settings}
                  width={width}
                  height={height}
                  interactions={interactions}
                />
              ) : (
                <Bars
                  rows={prepared.rows}
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
              className="flex min-h-8 items-center gap-[7px] overflow-hidden text-left text-[13px] font-[550] whitespace-nowrap text-fg"
              key={model.family}
              onClick={() => interactions.togglePin(model)}
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
