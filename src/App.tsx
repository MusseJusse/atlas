import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Settings2 } from 'lucide-react';
import { PricingControls } from './PricingControls';
import { pricingDisclosure, subscriptionRows, usesSubscriptionPricing } from './data/subscriptions';
import { Chart } from './Charts';
import { ChartNavigation } from './ChartNavigation';
import { visibleChartRows } from './chart-rows';
import { Sidebar } from './Sidebar';
import { Selection } from './Selection';
import { useMediaQuery } from './useMediaQuery';
import { useChartNavigation } from './useChartNavigation';
import { fetchedAt, paretoFrontier, visibleModels } from './models';
import { resolveView, viewDescriptions, views } from './chart-definitions';
import { chartDescending, readSettings, readView, writeSettings, type Settings } from './state';
import { formatUtcDate } from './formatDate';
import { SiteHeader } from './SiteHeader';

const segments = 'flex gap-0.5 rounded-lg bg-track p-0.5';
const segment =
  'min-h-8 flex-1 rounded-md px-2.5 text-[12px] font-[500] whitespace-nowrap text-fg-2 hover:text-fg aria-pressed:bg-thumb aria-pressed:text-accent aria-pressed:shadow-[var(--shadow-raised)]';
const menuItem = 'inline-flex min-h-10 w-full items-center gap-2.5 rounded-md px-2 text-[13px] text-fg hover:bg-hover';
const menuLabel = 'px-2 pb-1 text-[13px] font-[600] text-fg';

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
  const stickyBar = useRef<HTMLDivElement>(null);
  // Phone sections scroll to just below the sticky bar, whose height changes with the open category.
  // The section's top rule tucks under the bar's own border so the two never double up.
  useEffect(() => {
    const bar = stickyBar.current;
    if (!mobile || !bar) return;
    const root = document.documentElement;
    const measure = () => root.style.setProperty('--sticky-offset', `calc(var(--header-height) + ${Math.ceil(bar.offsetHeight) - 1}px)`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    return () => {
      observer.disconnect();
      root.style.removeProperty('--sticky-offset');
    };
  }, [mobile]);
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
  const view = views.find((view) => view.id === active) ?? views[0]!;
  const { score } = resolveView(view, settings);
  const pricedRows = useMemo(() => subscriptionRows(rows, settings),
    [rows, settings.pricingMode, settings.subscriptionPlans, settings.countResets]);
  const subscriptionActive = usesSubscriptionPricing(view.id, settings);
  const rowsByView = useMemo(() => new Map(views.map((view) => {
    const source = usesSubscriptionPricing(view.id, settings) ? pricedRows : rows;
    return [view.id, visibleChartRows(source, view, settings)];
  })), [views, rows, pricedRows, settings]);
  const activeRows = rowsByView.get(view.id)!;
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
      <SiteHeader current="benchmarks" onCurrent={() => navigate(views[0].id)} />
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
          className="grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] rounded-[14px] bg-panel [outline:none] mobile:block mobile:overflow-clip"
        >
          <h1 className="sr-only">Model benchmarks</h1>
          <div ref={stickyBar} className="min-w-0 px-6 mobile:sticky mobile:top-[var(--header-height)] mobile:z-[6] mobile:bg-panel mobile:px-4">
            <button
              className="hidden min-h-12 w-full items-center gap-2 pt-1 text-left text-[13px] text-fg-2 mobile:flex!"
              onClick={() => setMobileOpen(true)}
              aria-haspopup="dialog"
              aria-controls="model-filters"
              aria-expanded={mobileOpen}
            >
              <span className="font-[600] text-fg">Models</span>
              <span className="tabular-nums">{settings.selected.length} selected</span>
              <span className="ml-auto rounded-md bg-accent-soft px-2.5 py-1 text-[12px] font-[550] text-accent">Edit selection</span>
            </button>
            <div ref={chartNavigation}><nav

              className="flex mobile:hidden min-w-0 gap-6 overflow-x-auto border-b border-line [scrollbar-width:thin] [scrollbar-color:var(--line-2)_transparent] compact:gap-5"
              aria-label="Chart views"
            >
              {views.map((view) => (
                <button
                  key={view.id}
                  className="-mb-px min-h-[52px] shrink-0 border-b-2 border-transparent text-[13px] font-[500] text-fg-2 short:min-h-11 hover:text-fg aria-[current=page]:border-accent aria-[current=page]:text-accent"
                  aria-current={active === view.id ? 'page' : undefined}
                  onClick={() => navigate(view.id)}
                >
                  {view.label}
                </button>
              ))}
            </nav>
            <div className="hidden mobile:block"><ChartNavigation active={active} navigate={navigate} /></div></div>
          </div>
          <div
            className="relative min-h-0 snap-y snap-proximity overflow-y-auto rounded-b-xl [scrollbar-width:thin] [scrollbar-color:var(--line-2)_var(--panel)] mobile:snap-none mobile:overflow-visible"
            ref={feed}
          >
            {views.map((view) => {
              const { scatter, linear } = resolveView(view, settings);
              const subscription = usesSubscriptionPricing(view.id, settings);
              const chartRows = rowsByView.get(view.id)!;
              const hasFallback = !(scatter && settings.frontier) && chartRows.some((row) => row.cost !== null && row.taskPricing?.basis === 'api-fallback');
              return (
                <section
                  className="chart-section flex h-full snap-start flex-col px-6 pt-5 pb-4 short:pt-4 short:pb-3 mobile:h-auto mobile:scroll-mt-[var(--sticky-offset,190px)] mobile:px-4 mobile:pb-6"
                  id={view.id}
                  key={view.id}
                  aria-label={view.label}
                >
                  <div className="flex shrink-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="display m-0 text-[30px] leading-[1.1] short:text-[24px] phone:text-[24px]">
                        {view.label}
                      </h2>
                      <p className="mt-1 mb-0 max-w-[80ch] text-[13px] leading-5 text-pretty text-fg-2 short:mt-0.5 short:text-[12px] short:leading-[18px]">
                        {view.id === 'tokens-task' && scatter
                          ? 'Each point is a reasoning level. Up and to the left uses fewer tokens for more intelligence.'
                          : viewDescriptions[view.id]}
                        {!subscription && view.metric === 'cost' && ' Costs use API prices.'}
                      </p>
                    </div>
                    <ChartOptions
                      settings={settings}
                      update={update}
                      descending={chartDescending(view.metric, phone, settings.descending)}
                      pricing={view.id === 'cost-intelligence' || view.id === 'cost-task'}
                      scatter={scatter}
                      ranking={phone && !scatter}
                    />
                  </div>
                  {scatter || view.mode === 'optional-scatter' ? (
                  <div className="flex min-h-[56px] shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2 text-[12px] short:min-h-12 short:py-1">
                    {scatter && (
                      <button
                        className="-ml-1 inline-flex min-h-9 items-center gap-2 rounded-md px-1 text-[13px] text-fg hover:text-accent aria-pressed:text-accent"
                        aria-pressed={settings.frontier}
                        title="Highlight configurations that no other beats on both axes."
                        onClick={() => update({ frontier: !settings.frontier })}
                      >
                        <Selection checked={settings.frontier} />
                        Pareto frontier
                      </button>
                    )}
                    <div className="ml-auto flex items-center gap-5 phone:gap-3">
                      {view.mode === 'optional-scatter' && (
                        <div
                          className={segments}
                          role="group"
                          aria-label="Tokens per task chart type"
                        >
                          <button
                            className={segment}
                            aria-pressed={!settings.scatter}
                            onClick={() => update({ scatter: false })}
                          >
                            Bars
                          </button>
                          <button
                            className={segment}
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
                          <span className="text-[12px] text-fg-3 phone:hidden">Scale</span>
                          <div className={segments}>
                            <button
                              className={segment}
                              aria-pressed={linear}
                              onClick={() =>
                                update({ linear: [...new Set([...settings.linear, view.id])] })
                              }
                            >
                              Linear
                            </button>
                            <button
                              className={segment}
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
                  ) : <div className="h-4 shrink-0 mobile:h-2" />}
                  {subscription && (
                    <p className="mt-0 mb-2 max-w-[80ch] shrink-0 text-[12px] leading-5 text-fg-2">
                      <strong className="font-[600] text-fg">Estimated subscription pricing.</strong>{' '}
                      Assumes one model uses the full allowance.{' '}
                      {settings.countResets ? 'Counts confirmed bonus resets.' : 'Excludes bonus resets.'}
                      {hasFallback && ' Models without a subscription estimate use API prices.'}
                      {scatter && settings.frontier && ' The frontier compares subscription estimates only.'}
                      {scatter && !linear && chartRows.some((row) => row.cost === 0) && ' Log scale hides $0 configurations.'}
                    </p>
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
      <footer className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1 px-7 py-3 short:py-2 text-[12px] leading-5 text-fg-3 compact:px-5 mobile:px-4 mobile:pt-5 mobile:pb-[calc(20px+env(safe-area-inset-bottom))]">
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
        <span title={`Snapshot captured ${fetchedAt}`}>
          Snapshot captured{' '}
          <time dateTime={fetchedAt}>
            {formatUtcDate(fetchedAt, 'short')}
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
  scatter,
  ranking,
}: {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  descending: boolean;
  pricing: boolean;
  /** Only the options for the visible chart type are shown. */
  scatter: boolean;
  /** Phones show bar charts as rankings, which cannot combine reasoning bars. */
  ranking: boolean;
}) {
  const menu = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<'below' | 'above'>('below');
  function fitMenu() {
    const element = menu.current;
    if (!element) return;
    // Open toward whichever side of the trigger has more of the visible chart area.
    const feed = element.closest('section')?.parentElement?.getBoundingClientRect();
    const trigger = element.getBoundingClientRect();
    const below = Math.min(window.innerHeight, feed?.bottom ?? window.innerHeight) - trigger.bottom - 18;
    const above = trigger.top - Math.max(0, feed?.top ?? 0) - 18;
    const next = below >= 240 || below >= above ? 'below' : 'above';
    setSide(next);
    // Cap the height to the chosen side, so every control stays reachable by scrolling the menu.
    element.style.setProperty('--chart-menu-height', `${Math.max(0, next === 'below' ? below : above)}px`);
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
        className="flex size-10 cursor-pointer list-none items-center justify-center rounded-lg border border-line text-fg-2 group-open:border-accent group-open:text-accent hover:border-line-2 hover:bg-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden"
        aria-label="Chart settings"
        title="Chart settings"
      >
        <Settings2 size={17} aria-hidden="true" />
      </summary>
      <div
        className={`absolute ${side === 'below' ? 'top-[calc(100%+6px)]' : 'bottom-[calc(100%+6px)]'} right-0 z-20 flex ${pricing ? 'w-[344px]' : 'w-[240px]'} max-w-[calc(100vw-64px)] scroll-fade flex-col items-start gap-0.5 overflow-y-auto overscroll-contain rounded-xl p-2 shadow-[var(--shadow-pop)]`}
        style={{ maxHeight: 'var(--chart-menu-height, 60dvh)' }}
        aria-label="Chart settings"
      >
        {pricing && <PricingControls settings={settings} update={update} />}
        {scatter ? (
          <>
            <span className={`${menuLabel} ${pricing ? 'pt-3' : 'pt-2'}`}>Scatter chart</span>
            <button
              className={menuItem}
              aria-pressed={settings.labels}
              onClick={() => update({ labels: !settings.labels })}
            >
              <Selection checked={settings.labels} />
              Model labels
            </button>
          </>
        ) : (
          <>
            <span className={`${menuLabel} ${pricing ? 'pt-3' : 'pt-2'}`}>{ranking ? 'Ranking' : 'Bar chart'}</span>
            <button
              className={menuItem}
              aria-pressed={settings.grouped}
              onClick={() => update({ grouped: !settings.grouped })}
            >
              <Selection checked={settings.grouped} />
              Group by model
            </button>
            {!ranking && <button
              className={`${menuItem} disabled:opacity-50 disabled:hover:bg-transparent`}
              aria-pressed={settings.combined}
              disabled={!settings.grouped}
              title={settings.grouped ? 'Combine reasoning configurations into one bar per model.' : 'Group by model to combine reasoning bars.'}
              onClick={() => update({ combined: !settings.combined })}
            >
              <Selection checked={settings.combined} />
              Combine reasoning bars
            </button>}
            <div className={`${segments} mx-2 mt-2 mb-1 w-[calc(100%-16px)]`} role="group" aria-label={ranking ? 'Ranking order' : 'Bar order'}>
              {/* Re-selecting the current order must not pin it, or lower-is-better charts lose their default. */}
              <button className={segment} aria-pressed={descending} onClick={() => { if (!descending) update({ descending: true }); }}>
                Highest first
              </button>
              <button className={segment} aria-pressed={!descending} onClick={() => { if (descending) update({ descending: false }); }}>
                Lowest first
              </button>
            </div>
          </>
        )}
      </div>
    </details>
  );
}
