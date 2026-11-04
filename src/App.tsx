import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, Ellipsis, SlidersHorizontal } from 'lucide-react';
import { PricingControls } from './PricingControls';
import { pricingDisclosure, subscriptionRows, usesSubscriptionPricing } from './data/subscriptions';
import { Chart } from './Charts';
import { ChartNavigation } from './ChartNavigation';
import { visibleChartRows } from './chart-rows';
import { codingOnlyRows } from './data/coding-only';
import { Sidebar } from './Sidebar';
import { Selection } from './Selection';
import { useMediaQuery } from './useMediaQuery';
import { useChartNavigation } from './useChartNavigation';
import { codingFetchedAt, fetchedAt, paretoFrontier, visibleModels } from './models';
import { chartViews, rankingPresentation, resolveView } from './chart-definitions';
import { readSettings, readView, writeSettings, type Settings } from './state';
import { SiteHeader } from './SiteHeader';
import { formatUtcDate } from './formatDate';

const loadChangelog = () => import('./Changelog');
const loadEfficiency = () => import('./Efficiency');
const Changelog = lazy(() => loadChangelog().then(({ Changelog }) => ({ default: Changelog })));
const Efficiency = lazy(() => loadEfficiency().then(({ Efficiency }) => ({ default: Efficiency })));

function currentPage() {
  return typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('page');
}

export function App() {
  const [page, setPage] = useState(currentPage);

  useEffect(() => {
    const pop = () => setPage(currentPage());
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target.closest('a') : null;
      if (!target || target.target || target.hasAttribute('download')) return;
      const href = target.getAttribute('href');
      if (href !== '/' && href !== '?page=efficiency' && href !== '?page=changelog') return;
      event.preventDefault();
      if (target.href === location.href) return;
      const previousPage = currentPage();
      history.pushState(null, '', target.href);
      const nextPage = currentPage();
      if (previousPage === nextPage) window.dispatchEvent(new PopStateEvent('popstate'));
      else setPage(nextPage);
      window.scrollTo(0, 0);
    };
    const preload = (event: Event) => {
      const link = event.target instanceof Element ? event.target.closest('a') : null;
      if (link?.getAttribute('href') === '?page=changelog') void loadChangelog().catch(() => {});
      if (link?.getAttribute('href') === '?page=efficiency') void loadEfficiency().catch(() => {});
    };
    window.addEventListener('popstate', pop);
    document.addEventListener('click', click);
    document.addEventListener('pointerover', preload);
    document.addEventListener('focusin', preload);
    document.addEventListener('touchstart', preload, { passive: true });
    // Load other sections after the initial render without blocking it.
    const timer = window.setTimeout(() => {
      void loadEfficiency().catch(() => {});
    }, 1000);
    return () => {
      window.removeEventListener('popstate', pop);
      document.removeEventListener('click', click);
      document.removeEventListener('pointerover', preload);
      document.removeEventListener('focusin', preload);
      document.removeEventListener('touchstart', preload);
      window.clearTimeout(timer);
    };
  }, []);
  const Page = page === 'changelog' ? Changelog : page === 'efficiency' ? Efficiency : null;
  return Page ? (
    <Suspense
      fallback={
        <p className="p-7 text-[14px] text-fg-2" role="status">
          Loading {page}…
        </p>
      }
    >
      <Page />
    </Suspense>
  ) : (
    <Benchmarks />
  );
}

function Benchmarks() {
  useEffect(() => { document.title = 'Atlas · AI model benchmarks'; }, []);
  const search = typeof location === 'undefined' ? '' : location.search;
  const [settings, setSettings] = useState(() => readSettings(search));
  const [mobileOpen, setMobileOpen] = useState(false);
  const chartFeed = useRef<HTMLDivElement>(null);
  const [moreBelow, setMoreBelow] = useState(false);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const mobile = useMediaQuery('(max-width: 900px)');
  const phone = useMediaQuery('(max-width: 600px)');
  const { active, navigate } = useChartNavigation();
  useEffect(() => { chartFeed.current?.scrollTo({ top: 0 }); }, [active]);
  useEffect(() => {
    const feed = chartFeed.current;
    const section = feed?.querySelector<HTMLElement>(`#${active}`);
    if (!feed || !section) return;
    const check = () => {
      const end = section.querySelector('.measurement-disclosure') ?? section.lastElementChild;
      setMoreBelow(end != null && end.getBoundingClientRect().bottom > feed.getBoundingClientRect().bottom + 2);
    };
    const observer = new ResizeObserver(check);
    observer.observe(feed);
    observer.observe(section);
    feed.addEventListener('scroll', check, { passive: true });
    check();
    return () => { observer.disconnect(); feed.removeEventListener('scroll', check); };
  }, [active, settings]);
  const update = useCallback(
    (patch: Partial<Settings>) => setSettings((current) => ({ ...current, ...patch })),
    [],
  );
  const closeMobile = useCallback(() => setMobileOpen(false), []);
  useEffect(() => {
    if (!mobile) setMobileOpen(false);
  }, [mobile]);
  const rows = useMemo(
    () => visibleModels(settings.selected, []),
    [settings.selected],
  );
  const codingRows = useMemo(() => codingOnlyRows(rows), [rows]);
  const datasetViews = useMemo(() => chartViews(settings.codingOnly), [settings.codingOnly]);
  const view = datasetViews.find((view) => view.id === active) ?? datasetViews[0]!;
  const { score } = resolveView(view, settings);
  const pricedRows = useMemo(() => subscriptionRows(rows, settings),
    [rows, settings.pricingMode, settings.subscriptionPlans, settings.countResets]);
  const subscriptionActive = usesSubscriptionPricing(view.id, settings);
  const rowsByView = useMemo(() => new Map(datasetViews.map((view) => {
    const source = settings.codingOnly ? codingRows : usesSubscriptionPricing(view.id, settings) ? pricedRows : rows;
    return [view.id, visibleChartRows(source, view, settings)];
  })), [datasetViews, rows, codingRows, pricedRows, settings]);
  const activeRows = rowsByView.get(view.id)!;
  const activeFetchedAt = settings.codingOnly ? codingFetchedAt : fetchedAt;
  const frontier = useMemo(
    () => new Set(paretoFrontier(subscriptionActive ? activeRows.filter((row) => row.taskPricing?.basis === 'subscription') : activeRows, view.metric, (model) => model[score]).map((model) => model.family)),
    [activeRows, view.metric, score, subscriptionActive],
  );

  useEffect(() => {
    history.replaceState(null, '', writeSettings(settings, active));
  }, [settings, active]);
  useEffect(() => {
    const pop = () => {
      setSettings(readSettings(location.search));
      navigate(readView(location.search));
    };
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, [navigate]);

  return (
    <div className="grid h-dvh grid-rows-[var(--header-height)_minmax(0,1fr)_auto] mobile:block mobile:h-auto">
      <a
        href="#benchmark-workspace"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-30 focus:rounded-md focus:bg-panel focus:p-3"
      >
        Skip to benchmarks
      </a>
      <SiteHeader page="benchmarks" />
      <div className="grid min-h-0 grid-cols-[var(--sidebar-width)_minmax(0,1fr)] gap-6 px-7 pt-6 pb-2 short:pt-4 compact:gap-5 compact:px-5 mobile:block mobile:px-4 mobile:pt-4 mobile:pb-0">
        <Sidebar
          settings={settings}
          update={update}
          open={mobileOpen}
          close={closeMobile}
          frontier={frontier}
          onHighlight={setHighlighted}
        />
        <main
          id="benchmark-workspace"
          tabIndex={-1}
          className="grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] rounded-xl bg-panel [outline:none] mobile:block"
        >
          <h1 className="sr-only">Model benchmarks</h1>
          <div className="min-w-0 px-6 mobile:sticky mobile:top-[var(--header-height)] mobile:z-[6] mobile:rounded-t-xl mobile:bg-panel mobile:px-4">
            <button
              className="hidden w-full items-center gap-2 border-b border-line py-3 text-left text-[12px] text-fg-2 mobile:flex!"
              onClick={() => setMobileOpen(true)}
              aria-haspopup="dialog"
              aria-controls="model-filters"
              aria-expanded={mobileOpen}
            >
              <SlidersHorizontal size={15} aria-hidden="true" />
              <span className="font-medium text-fg">Models</span>
              <span>{settings.selected.length} selected</span>
              <span className="ml-auto text-accent">Edit selection</span>
            </button>
            <ChartNavigation views={datasetViews} active={active} navigate={navigate} />
          </div>
          <div className="relative min-h-0">
          <div ref={chartFeed}
            className="benchmark-feed h-full relative min-h-0 overflow-y-auto rounded-b-xl [scrollbar-width:thin] [scrollbar-color:var(--line-2)_var(--panel)] mobile:overflow-visible"
          >
            {datasetViews.map((view) => {
              const { scatter, linear } = resolveView(view, settings);
              const bars = !scatter && !mobile && settings.bars;
              const rankingLogAvailable = view.metric === 'cost' && rowsByView.get(view.id)!.every((row) => row.cost === null || row.cost > 0);
              const displayLinear = scatter ? linear : linear || !rankingLogAvailable;
              const subscription = usesSubscriptionPricing(view.id, settings);
              const chartRows = rowsByView.get(view.id)!;
              const ranking = rankingPresentation(view, settings);
              const hasFallback = !(scatter && settings.frontier) && chartRows.some((row) => row.cost !== null && row.taskPricing?.basis === 'api-fallback');
              return (
                <section
                  hidden={active !== view.id}
                  className="chart-section flex h-full flex-col px-6 pt-5 pb-4 short:pt-4 short:pb-3 mobile:h-auto mobile:px-4 mobile:pb-6"
                  id={view.id}
                  key={view.id}
                  aria-label={view.label}
                >
                  <div className="flex shrink-0 items-start justify-between gap-3">
                    <h2 className="m-0 text-[25px] leading-tight font-[550] tracking-[-0.8px] phone:text-[22px]">
                      {view.label}
                    </h2>
                    <div className="flex shrink-0 items-center gap-2">
                    {!mobile && !scatter && view.mode !== 'optional-scatter' && <div className="flex gap-1 rounded-md bg-surface p-1" role="group" aria-label={`${view.label} presentation`}>
                      <button className="min-h-8 rounded-sm px-3 text-[12px] text-fg-2 aria-pressed:bg-panel aria-pressed:text-accent" aria-pressed={!bars} onClick={() => update({ bars: false })}>Ranking</button>
                      <button className="min-h-8 rounded-sm px-3 text-[12px] text-fg-2 aria-pressed:bg-panel aria-pressed:text-accent" aria-pressed={bars} onClick={() => update({ bars: true })}>Bars</button>
                    </div>}
                    <ChartOptions
                      settings={settings}
                      update={update}
                      descending={ranking.descending}
                      groupedTable={settings.grouped}
                      scatter={scatter}
                      phone={phone}
                      pricing={!settings.codingOnly && (view.id === 'cost-intelligence' || view.id === 'cost-task')}
                    />
                    </div>
                  </div>
                  {scatter && <p className="chart-guidance">Higher and further left is better.{linear || phone ? '' : ' Log scale shows equal cost ratios.'}{view.metric === 'cost' && !subscription && ' API pricing.'}</p>}
                  {view.metric === 'omniscience' && <p className="chart-guidance">Correct answers raise the score. Incorrect answers lower it.</p>}
                  <div
                    className={`flex min-h-[58px] shrink-0 short:min-h-12 short:py-1 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2 text-[12px] ${!scatter && view.mode !== 'optional-scatter' && (view.metric !== 'cost' || bars) ? 'hidden' : !scatter ? 'ranking-toolbar' : ''}`}
                  >
                    {scatter ? (
                      <button
                        className="inline-flex min-h-10 items-center gap-2 text-fg aria-pressed:text-accent hover:text-accent"
                        aria-pressed={settings.frontier}
                        title="Pareto Frontier connects configurations with no better and cheaper alternative."
                        onClick={() => update({ frontier: !settings.frontier })}
                      >
                        <Selection checked={settings.frontier} />
                        Pareto Frontier
                      </button>
                    ) : view.metric === 'cost' && !subscription ? <span className="text-fg-2">API pricing</span> : null}
                    <div className="ml-auto flex items-center gap-5 phone:gap-3">
                      {view.mode === 'optional-scatter' && (
                        <div
                          className="flex gap-1 rounded-md bg-surface p-1"
                          role="group"
                          aria-label="Tokens per task view type"
                        >
                          <button
                            className="min-h-8 rounded-sm px-2.5 text-[12px] text-fg-2 aria-pressed:bg-panel aria-pressed:font-medium aria-pressed:text-accent"
                            aria-pressed={!settings.scatter && !bars}
                            onClick={() => update({ scatter: false, bars: false })}
                          >
                            Rankings
                          </button>
                          {!mobile && <button className="min-h-8 rounded-sm px-2.5 text-[12px] text-fg-2 aria-pressed:bg-panel aria-pressed:font-medium aria-pressed:text-accent" aria-pressed={bars} onClick={() => update({ scatter: false, bars: true })}>Bars</button>}
                          <button
                            className="min-h-8 rounded-sm px-2.5 text-[12px] text-fg-2 aria-pressed:bg-panel aria-pressed:font-medium aria-pressed:text-accent"
                            aria-pressed={settings.scatter}
                            onClick={() => update({ scatter: true })}
                          >
                            Scatter
                          </button>
                        </div>
                      )}
                      {(scatter || (view.metric === 'cost' && !bars)) && (
                        <div
                          className="flex items-center gap-2"
                          role="group"
                          aria-label={`${view.label} axis scale`}
                        >
                          <span className="text-[11px] text-fg-2 phone:hidden">Scale</span>
                          <div className="flex gap-1 rounded-md bg-surface p-1">
                            <button
                              className="min-h-8 rounded-sm px-2.5 text-[12px] text-fg-2 aria-pressed:bg-panel aria-pressed:font-medium aria-pressed:text-accent"
                              aria-pressed={displayLinear}
                              onClick={() =>
                                update({ linear: [...new Set([...settings.linear, view.id])] })
                              }
                            >
                              Linear
                            </button>
                            <button
                              className="min-h-8 rounded-sm px-2.5 text-[12px] text-fg-2 aria-pressed:bg-panel aria-pressed:font-medium aria-pressed:text-accent"
                              aria-pressed={!displayLinear}
                              disabled={!scatter && !rankingLogAvailable}
                              title={!scatter && !rankingLogAvailable ? 'Zero costs require a linear scale' : undefined}
                              onClick={() =>
                                update({ linear: settings.linear.filter((id) => id !== view.id) })
                              }
                            >
                              Log
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {bars && view.metric === 'cost' && !subscription && <p className="mt-1 mb-2 text-[12px] text-fg-2">API pricing</p>}
                  {subscription && (
                    <p className="mt-0 mb-2 shrink-0 text-[11px] leading-5 text-fg-2">
                      Estimated subscription · One model uses full allowance · {settings.countResets ? 'Bonus resets on where supported' : 'Bonus resets off'}
                      {hasFallback && ' · Includes API fallback'}
                      {scatter && settings.frontier && ' · Pareto Frontier compares subscription estimates only'}
                      {scatter && !linear && chartRows.some((row) => row.cost === 0) && ' · Zero costs omitted on log scale'}
                    </p>
                  )}
                  <Chart
                    presentation={ranking}
                    active={active === view.id}
                    view={view}
                    rows={subscription && scatter && settings.frontier ? chartRows.filter((row) => row.taskPricing?.basis === 'subscription') : chartRows}
                    pricingContext={subscription ? pricingDisclosure(scatter && settings.frontier ? chartRows.filter((row) => row.taskPricing?.basis === 'subscription') : chartRows, settings.countResets) : undefined}
                    settings={settings}
                    highlighted={active === view.id ? highlighted : null}
                    onHighlight={setHighlighted}
                  />
                </section>
              );
            })}
          </div>
          {moreBelow && <div className="chart-scroll-cue" aria-hidden="true">Scroll for more <ArrowDown size={13} /></div>}
          </div>
        </main>
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1 px-7 py-3 short:py-2 text-[11px] leading-5 text-fg-2 compact:px-5 mobile:px-4 mobile:pt-5 mobile:pb-[calc(20px+env(safe-area-inset-bottom))]">
        <span>
          Data from{' '}
          <a
            className="underline-offset-4 hover:text-accent hover:underline"
            href="https://artificialanalysis.ai/"
            target="_blank"
            rel="noreferrer"
          >
            Artificial Analysis
          </a>
        </span>
        <span title={`Local snapshot captured ${activeFetchedAt}`}>
          Snapshot captured{' '}
          <time dateTime={activeFetchedAt}>
            {formatUtcDate(activeFetchedAt, 'short')}
          </time>
        </span>
      </footer>
    </div>
  );
}

function ChartOptions({
  settings,
  update,
  descending,
  pricing,
  groupedTable,
  scatter,
  phone,
}: {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  descending: boolean;
  pricing: boolean;
  groupedTable: boolean;
  scatter: boolean;
  phone: boolean;
}) {
  const menu = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);
  function fitMenu() {
    const element = menu.current;
    if (!element) return;
    const feedBottom = element.closest('section')?.parentElement?.getBoundingClientRect().bottom ?? window.innerHeight;
    const available = Math.min(window.innerHeight, feedBottom) - element.getBoundingClientRect().bottom - 18;
    element.style.setProperty('--chart-menu-height', `${Math.max(0, available)}px`);
  }
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && menu.current && !menu.current.contains(event.target))
        menu.current.open = false;
    };
    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', fitMenu);
    return () => {
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('resize', fitMenu);
    };
  }, [open]);
  if (scatter && phone && !pricing) return null;
  return (
    <details ref={menu} className={`group relative shrink-0 ${scatter && !pricing ? 'label-options-only' : ''}`} onToggle={(event) => {
      setOpen(event.currentTarget.open);
      if (event.currentTarget.open) fitMenu();
    }} onKeyDown={(event) => {
      if (event.key === 'Escape' && menu.current?.open) {
        menu.current.open = false;
        menu.current.querySelector('summary')?.focus();
        event.stopPropagation();
      }
    }}>
      <summary
        className="flex size-10 cursor-pointer list-none items-center justify-center rounded-md text-fg-2 group-open:bg-surface group-open:text-accent hover:bg-surface hover:text-accent focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden"
        aria-label="Chart settings"
        title="Chart settings"
      >
        <Ellipsis size={19} aria-hidden="true" />
      </summary>
      <div
        className={`absolute top-[calc(100%+6px)] right-0 z-20 flex ${pricing ? 'w-[310px]' : 'w-[220px]'} max-w-[calc(100vw-48px)] flex-col items-start gap-1 overflow-y-auto overscroll-contain rounded-lg border border-line bg-panel p-3 shadow-lg`}
        style={{ maxHeight: 'var(--chart-menu-height, 60dvh)' }}
        aria-label="Chart settings"
      >
        {pricing && <PricingControls settings={settings} update={update} />}
        {scatter && !phone && <>
        <button
          className="direct-label-option inline-flex min-h-10 items-center gap-2 px-1 text-[12px] text-fg hover:text-accent"
          aria-pressed={settings.labels}
          onClick={() => update({ labels: !settings.labels })}
        >
          <Selection checked={settings.labels} />
          Model labels
        </button>
        </>}
        {!scatter && <>
        {!phone && <>
        <button
          className="inline-flex min-h-10 items-center gap-2 px-1 text-[12px] text-fg hover:text-accent"
          aria-pressed={settings.grouped}
          onClick={() => update({ grouped: !settings.grouped })}
        >
          <Selection checked={settings.grouped} />
          Group by model
        </button>
        </>}
        <button
          className="inline-flex min-h-10 items-center gap-2 px-1 text-[12px] text-fg hover:text-accent"
          onClick={() => update({ descending: !descending })}
        >
          <ArrowDown
            size={14}
            style={{ transform: descending ? 'rotate(180deg)' : undefined }}
            aria-hidden="true"
          />
          {descending ? 'Highest first' : 'Lowest first'}{groupedTable ? ' per model' : ''}
        </button>
        </>}
      </div>
    </details>
  );
}
