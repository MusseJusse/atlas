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
import { selectionFamily, type Model } from './models';
import { modelColor, shortName } from './model-presentation';
import { scoreLabels, metrics, resolveView, type View } from './chart-definitions';
import type { Settings } from './state';
import { Logo } from './Logo';
import { MeasurementTable } from './charts/MeasurementTable';
import { ConfigurationDetails } from './charts/ConfigurationDetails';
import { Scatter } from './charts/Scatter';
import { Bars } from './charts/Bars';
import { useMediaQuery } from './useMediaQuery';
import { Ranking } from './charts/Ranking';
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
      // Hidden, previously visited sections have no layout until selected again.
      if (width <= 0 || height <= 0) return;
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
  presentation,
  view,
  rows,
  settings,
  highlighted,
  pricingContext,
  onHighlight,
}: {
  active: boolean;
  presentation: { descending: boolean };
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
  const desktop = useMediaQuery('(min-width: 901px)');
  const bars = !scatter && desktop && settings.bars;
  const { ref, width, height } = useSize(ready && (scatter || bars));

  // Keep visited charts mounted to preserve selected details across navigation.
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
  const { descending } = presentation;
  const table = <MeasurementTable rows={validRows} metric={view.metric} score={scatter ? score : undefined} settings={settings} descending={descending} />;
  const { pinned, activeModel } = resolveChartInteraction(validRows, pinnedId, hoveredId);
  const interactions: Interactions = {
    pinned,
    activeModel,
    highlighted: validRows.some((row) => row.family === highlighted) ? highlighted : null,
    hover: (model) => flushSync(() => setHoveredId(model?.id ?? null)),
    togglePin: (model) => setPinnedId((previous) => previous === model.id ? null : model.id),
    highlight: (id) => flushSync(() => onHighlight(id)),
  };
  const modelCount = new Set(validRows.map(selectionFamily)).size;
  const seriesCount = new Set(validRows.map((row) => row.family)).size;
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
    ref.current?.querySelector<SVGGElement | HTMLButtonElement>('g[aria-pressed="true"], .ranking-configurations button[aria-pressed="true"]')?.focus({ preventScroll: true });
    setPinnedId(null);
    setHoveredId(null);
  }

  const details = activeModel && <ConfigurationDetails model={activeModel} metric={view.metric}
    score={settings.codingOnly || scatter ? score : undefined} pinned={Boolean(pinned)} onClose={clearSelection} />;

  return (
    <div
      className="relative flex min-h-0 min-w-0 flex-1 flex-col"
      onKeyDown={(event) => {
        if (event.key === 'Escape') clearSelection();
      }}
    >
      <div className={bars ? 'bar-scroll min-h-0 flex-1 overflow-x-auto' : 'contents'}>
      <div
        style={bars ? { minWidth: Math.max(1, new Set(validRows.map((row) => settings.grouped ? row.family : row.id)).size) * 120 } : undefined}
        className={`relative min-h-0 ${bars ? 'bar-plot h-full w-full' : scatter ? "scatter-plot flex-1 mobile:aspect-[1/1.2] mobile:flex-none" : "contents"}`}
        ref={ref}
      >
        {ready &&
          (validRows.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2.5">
              <strong className="text-[17px] font-medium">No models to display</strong>
              <span className="m-0 max-w-[45ch] text-center text-[13px] leading-6 text-fg-2">
                Choose models in the model filters or enable more reasoning levels. Some models have no measurements for this view.
              </span>
            </div>
          ) : prepared.scatter || bars ? (
            <svg
              className="absolute inset-0 block size-full font-sans [&_g[role=button]:focus]:[outline:none]"
              viewBox={`0 0 ${width} ${height}`}
              role="group"
              aria-label={
                scatter
                  ? `${metrics[view.metric].label} versus ${scoreLabels[score]}`
                  : `${view.label} by model`
              }
              onClick={closeOnBackground}
            >
              <title>{view.label}{pricingContext ? ' · Estimated subscription pricing' : ' · API benchmark measurements'}</title>
              <desc>{pricingContext?.join(' ') ?? 'Measured Artificial Analysis benchmark data.'}</desc>
              {pricingContext && <metadata>{JSON.stringify({ pricing: pricingContext })}</metadata>}
              <rect
                className="chart-background"
                width={width}
                height={height}
                fill="var(--panel)"
              />
              {prepared.scatter ? <Scatter rows={prepared.rows} metric={view.metric} scoreMetric={score} linear={linear} settings={settings} width={width} height={height} interactions={interactions} />
                : <Bars rows={prepared.rows} metric={view.metric} settings={{ ...settings, descending }} width={width} height={height} interactions={interactions} />}
            </svg>
          ) : <Ranking rows={prepared.rows} metric={view.metric} grouped={settings.grouped} descending={descending} highestLast={settings.highestLast} interactions={interactions} score={settings.codingOnly ? score : undefined} logarithmic={view.metric === 'cost' && !linear && validRows.every((row) => row.value > 0)} />)}
        {scatter && activeModel && (
          <aside
            className={`configuration-details${pinned ? '' : ' pointer-events-none'}`}
            data-placement={scatter ? 'bottom-right' : settings.descending ? 'top-right' : 'top-left'}
            style={scatter ? { right: settings.labels && width >= 600 ? 235 : 24 } : undefined}
            aria-label="Selected configuration"
            tabIndex={pinned ? 0 : undefined}
          >
            {details}
          </aside>
        )}
      </div>
      </div>
      {bars && activeModel && <aside className={`configuration-details${pinned ? '' : ' pointer-events-none'}`} data-placement="top-right" aria-label="Selected configuration" tabIndex={pinned ? 0 : undefined}>{details}</aside>}
      {bars && validRows.length > 0 && width > (ref.current?.parentElement?.clientWidth ?? width) + 2 && <p className="mt-2 mb-0 text-[12px] text-fg-2">Scroll horizontally for more models.</p>}
      {/* Reserve the mobile legend's height in the initial HTML before hydration. */}
      {scatter && (
        <div className={`${width < 600 || !settings.labels ? 'grid' : 'hidden plot-mobile:grid'} scatter-legend ${width >= 480 ? 'grid-cols-3 phone:grid-cols-2' : 'grid-cols-2'} gap-x-3 gap-y-0.5 pt-2.5`}>
          {legend.map((model) => (
            <button
              className="flex min-h-11 items-center gap-[7px] overflow-hidden text-left text-[13px] font-[550] whitespace-nowrap text-fg"
              key={model.codingAgent ? model.id : model.family}
              aria-label={model.codingAgent?.configuration}
              onClick={() => interactions.togglePin(model)}
            >
              <span className="size-2 shrink-0 rounded-full" style={{ background: modelColor(model) }} aria-hidden="true" />
              <Logo model={model} />
              {model.codingAgent ? (
                <span className="min-w-0">
                  <span className="block truncate">{shortName(model)}</span>
                  <span className="block truncate text-[10px] font-normal text-fg-2">
                    {model.codingAgent.name}, {model.effortLabel}
                  </span>
                </span>
              ) : <span>{shortName(model)}{view.metric === 'cost' && model.taskPricing?.basis === 'api-fallback' && <span className="text-[10px] font-normal text-fg-2"> · API</span>}</span>}
            </button>
          ))}
        </div>
      )}
      {ready && validRows.length > 0 && <details className="measurement-disclosure">
        <summary>View data · {modelCount} {modelCount === 1 ? 'model' : 'models'} with data{seriesCount > modelCount && ` · ${seriesCount} series`} · {validRows.length} {validRows.length === 1 ? 'configuration' : 'configurations'}</summary>
        {table}
      </details>}
    </div>
  );
});
