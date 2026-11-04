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
import { chartViews, resolveView, views } from './chart-definitions';
import { chartDescending, readSettings, readView, writeSettings, type Settings } from './state';
import { ThemeToggle } from './ThemeToggle';
import { formatUtcDate } from './formatDate';
import { Brand } from './Brand';

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
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const mobile = useMediaQuery('(max-width: 900px)');
  const phone = useMediaQuery('(max-width: 600px)');
  const { active, navigate, feed, chartNavigation } = useChartNavigation(mobile);
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
      <header className="flex items-center gap-8 border-b border-line px-7 compact:gap-6 mobile:sticky mobile:top-0 mobile:z-[8] mobile:h-[var(--header-height)] mobile:gap-4 mobile:bg-bg mobile:px-4">
        <Brand />
        <nav className="flex items-center gap-6 phone:gap-3" aria-label="Sections">
          <button
            className="min-h-11 text-[12px] font-semibold text-fg phone:hidden"
            aria-current="page"
            onClick={() => navigate(views[0].id)}
          >
            Benchmarks
          </button>
          <a
            href="?page=efficiency"
            className="flex min-h-11 items-center text-[12px] text-fg-2 hover:text-accent"
          >
            Efficiency
          </a>
          <a
            href="?page=changelog"
            className="flex min-h-11 items-center text-[12px] text-fg-2 hover:text-accent"
          >
            Changelog
          </a>
        </nav>
        <div className="ml-auto flex items-center gap-3 phone:gap-0">
          <ThemeToggle
            className="flex size-10 items-center justify-center rounded-md text-fg-2 hover:bg-hover hover:text-accent"
            showTitle
          />
        </div>
      </header>
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
            <div ref={chartNavigation}><nav

              className="flex mobile:hidden min-w-0 gap-6 overflow-x-auto border-b border-line [scrollbar-width:thin] [scrollbar-color:var(--line-2)_transparent] compact:gap-5"
              aria-label="Chart views"
            >
              {datasetViews.map((view) => (
                <button
                  key={view.id}
                  className="min-h-[50px] shrink-0 short:min-h-11 border-b-2 border-transparent text-[12px] text-fg-2 aria-[current=page]:border-accent aria-[current=page]:font-semibold aria-[current=page]:text-accent hover:text-accent"
                  aria-current={active === view.id ? 'page' : undefined}
                  onClick={() => navigate(view.id)}
                >
                  {view.label}
                </button>
              ))}
            </nav>
            <div className="hidden mobile:block"><ChartNavigation views={datasetViews} active={active} navigate={navigate} /></div></div>
          </div>
          <div
            className="relative min-h-0 snap-y snap-proximity overflow-y-auto rounded-b-xl [scrollbar-width:thin] [scrollbar-color:var(--line-2)_var(--panel)] mobile:snap-none mobile:overflow-visible"
            ref={feed}
          >
            {datasetViews.map((view) => {
              const { scatter, linear } = resolveView(view, settings);
              const subscription = usesSubscriptionPricing(view.id, settings);
              const chartRows = rowsByView.get(view.id)!;
              const hasFallback = !(scatter && settings.frontier) && chartRows.some((row) => row.cost !== null && row.taskPricing?.basis === 'api-fallback');
              return (
                <section
                  className="chart-section flex h-full snap-start flex-col px-6 pt-5 pb-4 short:pt-4 short:pb-3 [&+section]:border-t [&+section]:border-line mobile:h-auto mobile:scroll-mt-[180px] mobile:px-4 mobile:pb-6"
                  id={view.id}
                  key={view.id}
                  aria-label={view.label}
                >
                  <div className="flex shrink-0 items-start justify-between gap-3">
                    <h2 className="m-0 text-[25px] leading-tight font-[550] tracking-[-0.8px] phone:text-[22px]">
                      {view.label}
                    </h2>
                    <ChartOptions
                      settings={settings}
                      update={update}
                      descending={chartDescending(view.metric, phone, settings.descending)}
                      pricing={!settings.codingOnly && (view.id === 'cost-intelligence' || view.id === 'cost-task')}
                    />
                  </div>
                  <div
                    className={`flex min-h-[58px] shrink-0 short:min-h-12 short:py-1 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2 text-[12px] ${!scatter && view.mode !== 'optional-scatter' ? 'mobile:hidden' : ''}`}
                  >
                    {scatter ? (
                      <button
                        className="inline-flex min-h-10 items-center gap-2 text-fg aria-pressed:text-accent hover:text-accent"
                        aria-pressed={settings.frontier}
                        title="Show configurations with no better and cheaper alternative."
                        onClick={() => update({ frontier: !settings.frontier })}
                      >
                        <Selection checked={settings.frontier} />
                        Pareto frontier
                      </button>
                    ) : (
                      <span className="text-fg-2 mobile:hidden">
                        {settings.grouped ? 'Grouped by model' : 'All configurations'}
                      </span>
                    )}
                    <div className="ml-auto flex items-center gap-5 phone:gap-3">
                      {view.mode === 'optional-scatter' && (
                        <div
                          className="flex gap-1 rounded-md bg-surface p-1"
                          role="group"
                          aria-label="Tokens per task chart type"
                        >
                          <button
                            className="min-h-8 rounded-sm px-2.5 text-[12px] text-fg-2 aria-pressed:bg-panel aria-pressed:font-medium aria-pressed:text-accent"
                            aria-pressed={!settings.scatter}
                            onClick={() => update({ scatter: false })}
                          >
                            Bars
                          </button>
                          <button
                            className="min-h-8 rounded-sm px-2.5 text-[12px] text-fg-2 aria-pressed:bg-panel aria-pressed:font-medium aria-pressed:text-accent"
                            aria-pressed={settings.scatter}
                            onClick={() => update({ scatter: true })}
                          >
                            Scatter
                          </button>
                        </div>
                      )}
                      {scatter && (
                        <div
                          className="flex items-center gap-2"
                          role="group"
                          aria-label={`${view.label} axis scale`}
                        >
                          <span className="text-[11px] text-fg-2 phone:hidden">Scale</span>
                          <div className="flex gap-1 rounded-md bg-surface p-1">
                            <button
                              className="min-h-8 rounded-sm px-2.5 text-[12px] text-fg-2 aria-pressed:bg-panel aria-pressed:font-medium aria-pressed:text-accent"
                              aria-pressed={linear}
                              onClick={() =>
                                update({ linear: [...new Set([...settings.linear, view.id])] })
                              }
                            >
                              Linear
                            </button>
                            <button
                              className="min-h-8 rounded-sm px-2.5 text-[12px] text-fg-2 aria-pressed:bg-panel aria-pressed:font-medium aria-pressed:text-accent"
                              aria-pressed={!linear}
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
                  {subscription && (
                    <p className="mt-0 mb-2 shrink-0 text-[11px] leading-5 text-fg-2">
                      Estimated subscription · One model uses full allowance · {settings.countResets ? 'Bonus resets on where supported' : 'Bonus resets off'}
                      {hasFallback && ' · Includes API fallback'}
                      {scatter && settings.frontier && ' · Frontier compares subscription estimates only'}
                      {scatter && !linear && chartRows.some((row) => row.cost === 0) && ' · Zero costs omitted on log scale'}
                    </p>
                  )}
                  {!subscription && view.metric === 'cost' && (
                    <p className="mt-0 mb-2 shrink-0 text-[11px] leading-5 text-fg-2">API pricing</p>
                  )}
                  <Chart
                    active={mobile || active === view.id}
                    phone={phone}
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
}: {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  descending: boolean;
  pricing: boolean;
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
  return (
    <details ref={menu} className="group relative shrink-0" onToggle={(event) => {
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
        <span className="px-1 pt-1 text-[11px] text-fg-2">Scatter charts</span>
        <button
          className="inline-flex min-h-10 items-center gap-2 px-1 text-[12px] text-fg hover:text-accent"
          aria-pressed={settings.labels}
          onClick={() => update({ labels: !settings.labels })}
        >
          <Selection checked={settings.labels} />
          Labels
        </button>
        <span className="mt-2 px-1 text-[11px] text-fg-2">Bar charts</span>
        <button
          className="inline-flex min-h-10 items-center gap-2 px-1 text-[12px] text-fg hover:text-accent"
          aria-pressed={settings.grouped}
          onClick={() => update({ grouped: !settings.grouped })}
        >
          <Selection checked={settings.grouped} />
          Group by model
        </button>
        <button
          className="inline-flex min-h-10 items-center gap-2 px-1 text-[12px] text-fg hover:text-accent"
          onClick={() => update({ descending: !descending })}
        >
          <ArrowDown
            size={14}
            style={{ transform: descending ? 'rotate(180deg)' : undefined }}
            aria-hidden="true"
          />
          {descending ? 'Highest first' : 'Highest last'}
        </button>
      </div>
    </details>
  );
}
