import {
  memo,
  useEffect,
  useLayoutEffect,
  type CSSProperties,
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
import { useScrollEdges } from './useScrollEdges';
import { useMediaQuery } from './useMediaQuery';
import { barLayout, scatterLabelGutter, combinedBarWidth, measureRows, measureScatterRows, separateBarWidth } from './charts/geometry';
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
  const [overflow, updateOverflow, overflowRef] = useScrollEdges();
  const scroller = useRef<HTMLDivElement | null>(null);
  const scrollable = plotWidth > width;
  // A scrolling plot opens at its best end: the highest scores sort last on desktop, the lowest costs first.
  const bestAtEnd = metrics[view.metric].higherIsBetter !== chartDescending(view.metric, false, settings.descending);
  useLayoutEffect(() => {
    const element = scroller.current;
    if (scrollable && element) element.scrollLeft = bestAtEnd ? element.scrollWidth : 0;
  }, [scrollable, bestAtEnd, plotWidth]);
  const container = useRef<HTMLDivElement>(null);
  const mobile = useMediaQuery('(width <= 900px)');
  // Mobile sections grow with their content, so a pinned card can sit below a narrow scatter plot.
  // Fixed-height desktop sections keep the overlay, which would otherwise squeeze the plot.
  const detailsBelow = scatter && ready && mobile && width < 600;
  const belowCard = useRef<HTMLElement>(null);
  const overlay = useRef<HTMLElement>(null);
  const gutter = scatterLabelGutter(width, settings.labels) || 24;
  // Scatter cards sit in whichever plot corner covers fewest points, and never over the selected one.
  // Each placement caps the card to the height it actually has, and narrow plots use the compact card.
  const compactCard = width < 760 ? { width: 200, padding: 12 } : {};
  const corners = {
    'bottom-right': { right: gutter, bottom: 74, maxHeight: 'calc(100% - 82px)', ...compactCard },
    'top-left': { left: 64, top: 34, maxHeight: 'calc(100% - 42px)', ...compactCard },
    'top-right': { right: gutter, top: 34, maxHeight: 'calc(100% - 42px)', ...compactCard },
    'bottom-left': { left: 64, bottom: 74, maxHeight: 'calc(100% - 82px)', ...compactCard },
  } satisfies Record<string, CSSProperties>;
  const [placement, setPlacement] = useState<CSSProperties>(corners['bottom-right']);
  useEffect(() => {
    // Reveal a card that opened below the fold, without moving the plot when it's already in view.
    // Focus follows into the card, so it never stays on a point the scroll moved behind the sticky bar;
    // Escape or the close button returns it to the point.
    if (!detailsBelow || !pinned || !belowCard.current) return;
    belowCard.current.scrollIntoView({ block: 'nearest' });
    if (ref.current?.contains(document.activeElement)) belowCard.current.focus({ preventScroll: true });
  }, [detailsBelow, pinned?.id]);
  useLayoutEffect(() => {
    const card = overlay.current;
    const plot = ref.current;
    if (!scatter || !card || !plot) return;
    const bounds = plot.getBoundingClientRect();
    const points = [...plot.querySelectorAll<SVGGElement>('[data-point]')].map((point) => {
      const box = point.querySelector('circle:last-child')!.getBoundingClientRect();
      return { x: box.x + box.width / 2 - bounds.x, y: box.y + box.height / 2 - bounds.y, selected: point.dataset.point === activeModel?.id };
    });
    const size = { width: card.offsetWidth, height: card.offsetHeight };
    const cost = (place: CSSProperties) => {
      const x = typeof place.left === 'number' ? place.left : bounds.width - Number(place.right) - size.width;
      const y = typeof place.top === 'number' ? place.top : bounds.height - Number(place.bottom) - size.height;
      return points.reduce((total, point) => {
        // The selected point needs a wider 12px berth than its neighbours.
        const margin = point.selected ? 12 : 6;
        return total + (point.x >= x - margin && point.x <= x + size.width + margin && point.y >= y - margin && point.y <= y + size.height + margin ? point.selected ? 1000 : 1 : 0);
      }, 0);
    };
    const best = Object.values(corners).reduce<CSSProperties>((current, next) => cost(next) < cost(current) ? next : current, corners['bottom-right']);
    const selected = points.find((point) => point.selected);
    // A card bigger than every free corner goes beside the selected point instead, on its roomier side.
    const besideTop = selected && Math.max(8, Math.min(bounds.height - size.height - 8, selected.y - size.height / 2));
    const beside = selected && besideTop !== undefined && cost(best) >= 1000 && {
      left: selected.x > bounds.width / 2 ? Math.max(0, selected.x - 16 - size.width) : selected.x + 16,
      top: besideTop,
      maxHeight: `calc(100% - ${besideTop + 8}px)`,
      ...compactCard,
    };
    const next = beside || best;
    setPlacement((current) => JSON.stringify(current) === JSON.stringify(next) ? current : next);
  }, [scatter, activeModel?.id, width, height, settings.labels]);
  const legend = [...new Map(validRows.map((row) => [row.codingAgent ? row.id : row.family, row])).values()];

  function closeOnBackground(event: MouseEvent<SVGSVGElement>) {
    if (
      event.target instanceof SVGRectElement &&
      event.target.classList.contains('chart-background')
    )
      setPinnedId(null);
  }

  function clearSelection() {
    // Keep keyboard users in the chart when removing the inspector's focused control:
    // the pinned plot point, or the pressed configuration in a phone ranking.
    const trigger = container.current?.querySelector<HTMLElement | SVGGElement>('g[aria-pressed="true"], .ranking-configurations button[aria-pressed="true"]');
    trigger?.focus({ preventScroll: true });
    // A card below the plot may have scrolled the point away, so bring it back clear of the sticky bar.
    if (detailsBelow) trigger?.scrollIntoView({ block: 'center' });
    setPinnedId(null);
    setHoveredId(null);
  }

  return (
    <div
      ref={container}
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
            <div
              className="absolute inset-0 overflow-x-auto overflow-y-hidden [scrollbar-width:thin] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
              onScroll={(event) => updateOverflow(event.currentTarget)}
              ref={(element) => {
                scroller.current = element;
                return overflowRef(element);
              }}
              // Wide plots scroll; the region is a tab stop so arrow keys can pan it.
              style={{ scrollPaddingInline: `${barLayout.left + 8}px 8px` }}
              {...(plotWidth > width ? { tabIndex: 0, role: 'region', 'aria-label': `${view.label}, scrolls sideways to show all ${legend.length} models` } : {})}
            >
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
            {/* Edge shadows mark more columns beyond the visible plot, past the fixed axis on the left. */}
            {plotWidth > width && overflow.start && <div aria-hidden="true" className="pointer-events-none absolute top-[25px] bottom-0 z-[1] w-3 bg-linear-to-r from-[var(--scroll-shadow)] to-transparent" style={{ left: barLayout.left }} />}
            {plotWidth > width && overflow.end && <div aria-hidden="true" className="pointer-events-none absolute top-[25px] right-0 bottom-0 z-[1] w-3 bg-linear-to-l from-[var(--scroll-shadow)] to-transparent" />}
            {!prepared.scatter && plotWidth > width && <FixedBarAxis rows={prepared.rows} metric={view.metric} settings={settings} plotWidth={plotWidth} width={width} height={height} />}
            </>
          ))}
        {(scatter || !phone) && activeModel && !(detailsBelow && pinned) && (
          <aside
            ref={overlay}
            className={`configuration-details scroll-fade${pinned ? '' : ' pointer-events-none'}`}
            data-placement={scatter ? undefined : settings.descending ? 'top-right' : 'top-left'}
            style={scatter ? placement : undefined}
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
      {/* Narrow scatter plots have no free corner, so a pinned card sits below the plot instead of covering points. */}
      {detailsBelow && pinned && activeModel && (
        <aside ref={belowCard} className="configuration-details scroll-mt-[calc(var(--header-height)+12px)]" data-placement="below" aria-label="Selected configuration" tabIndex={0}>
          <ConfigurationDetails model={activeModel} metric={view.metric} pinned onClose={clearSelection} />
        </aside>
      )}
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
        <div className={`${ready ? (scatterLabelGutter(width, true) ? 'hidden' : 'grid') : 'hidden plot-mobile:grid'} grid-cols-2 gap-x-3 gap-y-0.5 pt-2.5`}>
          {legend.map((model) => (
            <button
              className="flex min-h-8 min-w-0 items-center gap-[7px] text-left text-[13px] leading-tight font-[550] text-fg"
              key={model.codingAgent ? model.id : model.family}
              aria-label={model.codingAgent?.configuration}
              aria-pressed={model.codingAgent ? interactions.pinned?.id === model.id : interactions.pinned?.family === model.family}
              onClick={() => interactions.togglePin(model)}
            >
              <Logo model={model} />
              {/* Labs share logos, so the swatch is what matches a row to its line. */}
              <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ background: modelColor(model) }} />
              {model.codingAgent ? (
                <span className="min-w-0">
                  <span className="block truncate">{shortName(model)}</span>
                  <span className="block truncate text-[10px] font-normal text-fg-2">
                    {model.codingAgent.name}, {model.effortLabel}
                  </span>
                </span>
              ) : <span className="min-w-0">{shortName(model)}{view.metric === 'cost' && model.taskPricing?.basis === 'api-fallback' && <span className="text-[11px] font-normal text-fg-2"> (API)</span>}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
