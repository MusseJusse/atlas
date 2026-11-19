import {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from 'react';
import { flushSync } from 'react-dom';
import { resolveChartInteraction } from './chart-interactions';
import { useHydrated } from './useHydrated';
import type { Model } from './models';
import { modelColor, shortName } from './model-presentation';
import { scoreLabels, metrics, resolveView, type View } from './chart-definitions';
import { chartDescending, type Settings } from './state';
import { Logo } from './Logo';
import { ConfigurationDetails } from './charts/ConfigurationDetails';
import { Scatter } from './charts/Scatter';
import { Bars, FixedBarAxis } from './charts/Bars';
import { Ranking } from './charts/Ranking';
import { combinedBarWidth, measureRows, measureScatterRows, separateBarWidth } from './charts/geometry';
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
    const measure = () => resize(element.clientWidth, element.clientHeight);
    measure();
    // Fonts can finish after React starts. Recheck chart dimensions without delaying controls.
    document.fonts.addEventListener('loadingdone', measure);
    const observer = new ResizeObserver(([entry]) => {
      if (entry) resize(entry.contentRect.width, entry.contentRect.height);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      document.fonts.removeEventListener('loadingdone', measure);
    };
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
  pricingContext,
  onHighlight,
}: {
  active: boolean;
  phone: boolean;
  view: View;
  rows: Model[];
  settings: Settings;
  highlighted: string | null;
  pricingContext?: string[];
  onHighlight: (id: string | null) => void;
}) {
  const [visited, setVisited] = useState(active);
  const hydrated = useHydrated();
  const ready = hydrated && (active || visited);
  const { scatter, linear, score } = resolveView(view, settings);
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
  const prepared = useMemo(
    () =>
      scatter
        ? { scatter: true, rows: measureScatterRows(rows, view.metric, linear, score) } as const
        : { scatter: false, rows: measureRows(rows, view.metric) } as const,
    [rows, view.metric, scatter, linear, score],
  );
  const validRows = prepared.rows;
  const plotWidth = scatter || phone ? width
    : settings.grouped && settings.combined ? combinedBarWidth(validRows, width) : separateBarWidth(validRows, width, settings.grouped);
  const { pinned, activeModel } = resolveChartInteraction(validRows, pinnedId, hoveredId);
  const interactions: Interactions = {
    pinned,
    activeModel,
    highlighted: validRows.some((row) => row.family === highlighted) ? highlighted : null,
    hover: (model) => flushSync(() => setHoveredId(model?.id ?? null)),
    togglePin: (model) => setPinnedId((previous) => previous === model.id ? null : model.id),
    highlight: (id) => flushSync(() => onHighlight(id)),
  };
  const legend = [...new Map(validRows.map((row) => [row.codingAgent ? row.id : row.family, row])).values()];

  function closeOnBackground(event: MouseEvent<SVGSVGElement>) {
    if (
      event.target instanceof SVGRectElement &&
      event.target.classList.contains('chart-background')
    )
      setPinnedId(null);
  }

  function clearSelection() {
    // Keep keyboard users in the chart when removing the inspector's focused control.
    ref.current?.querySelector<SVGGElement>('g[aria-pressed="true"]')?.focus({ preventScroll: true });
    setPinnedId(null);
    setHoveredId(null);
  }

  return (
    <div
      className="relative flex min-h-0 min-w-0 flex-1 flex-col"
      onKeyDown={(event) => {
        if (event.key === 'Escape') clearSelection();
      }}
    >
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
            <>
            <div className="absolute inset-0 overflow-x-auto overflow-y-hidden [scrollbar-width:thin]">
            <svg
              className="absolute inset-0 block size-full font-sans [&_g[role=button]:focus]:[outline:none]"
              style={{ width: plotWidth }}
              viewBox={`0 0 ${plotWidth} ${height}`}
              role="group"
              aria-label={
                scatter
                  ? `${metrics[view.metric].label} versus ${scoreLabels[score]}`
                  : `${view.label} by model`
              }
              onClick={closeOnBackground}
            >
              <title>{view.label}{pricingContext ? ', estimated subscription pricing' : ', Artificial Analysis benchmarks'}</title>
              <desc>{pricingContext?.join(' ') ?? 'Artificial Analysis benchmark data.'}</desc>
              {pricingContext && <metadata>{JSON.stringify({ pricing: pricingContext })}</metadata>}
              <rect
                className="chart-background"
                width={plotWidth}
                height={height}
                fill="var(--panel)"
              />
              {prepared.scatter ? (
                <Scatter
                  rows={prepared.rows}
                  metric={view.metric}
                  scoreMetric={score}
                  linear={linear}
                  settings={settings}
                  width={plotWidth}
                  height={height}
                  interactions={interactions}
                />
              ) : (
                <Bars
                  rows={prepared.rows}
                  metric={view.metric}
                  settings={settings}
                  width={plotWidth}
                  height={height}
                  interactions={interactions}
                />
              )}
            </svg>
            </div>
            {!prepared.scatter && plotWidth > width && <FixedBarAxis rows={prepared.rows} metric={view.metric} settings={settings} plotWidth={plotWidth} width={width} height={height} />}
            </>
          ))}
        {(scatter || !phone) && activeModel && (
          <aside
            className={`configuration-details${pinned ? '' : ' pointer-events-none'}`}
            data-placement={scatter ? 'bottom-right' : settings.descending ? 'top-right' : 'top-left'}
            style={scatter ? { right: settings.labels && width >= 600 ? 235 : 24 } : undefined}
            aria-label="Selected configuration"
            tabIndex={pinned ? 0 : undefined}
          >
            <ConfigurationDetails
              model={activeModel}
              metric={view.metric}
              pinned={Boolean(pinned)}
              onClose={clearSelection}
            />
          </aside>
        )}
      </div>
      {ready && validRows.length > 0 && !scatter && phone && (
        <div className="hidden phone:block">
          {!prepared.scatter && <Ranking rows={prepared.rows} metric={view.metric} grouped={settings.grouped}
            descending={chartDescending(view.metric, true, settings.descending)} interactions={interactions}
            logarithmic={false} />}
        </div>
      )}
      {/* Narrow plots drop direct labels, so the legend follows the measured plot width.
          Before measuring, the viewport breakpoint reserves its height in the initial HTML. */}
      {scatter && settings.labels && (
        <div className={`${ready ? (width < 600 ? 'grid' : 'hidden') : 'hidden plot-mobile:grid'} grid-cols-2 gap-x-3 gap-y-0.5 pt-2.5`}>
          {legend.map((model) => (
            <button
              className="flex min-h-8 items-center gap-[7px] overflow-hidden text-left text-[13px] font-[550] whitespace-nowrap text-fg"
              key={model.codingAgent ? model.id : model.family}
              aria-label={model.codingAgent?.configuration}
              onClick={() => interactions.togglePin(model)}
            >
              <Logo model={model} />
              <span aria-hidden="true" className="hidden phone:block size-2 shrink-0 rounded-full" style={{ background: modelColor(model) }} />
              {model.codingAgent ? (
                <span className="min-w-0">
                  <span className="block truncate">{shortName(model)}</span>
                  <span className="block truncate text-[10px] font-normal text-fg-2">
                    {model.codingAgent.name}, {model.effortLabel}
                  </span>
                </span>
              ) : <span>{shortName(model)}{view.metric === 'cost' && model.taskPricing?.basis === 'api-fallback' && <span className="text-[11px] font-normal text-fg-2"> (API)</span>}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
