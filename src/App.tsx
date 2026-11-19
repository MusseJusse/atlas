import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, Settings2 } from 'lucide-react';
import { PricingControls } from './PricingControls';
import { pricingDisclosure, subscriptionRows, usesSubscriptionPricing } from './data/subscriptions';
import { Chart } from './Charts';
import { visibleChartRows } from './chart-rows';
import { Sidebar } from './Sidebar';
import { Selection } from './Selection';
import { AxisMenu, type AxisOption } from './AxisMenu';
import { useMediaQuery } from './useMediaQuery';
import { fetchedAt, paretoFrontier, visibleModels } from './models';
import { metrics, resolveView, scoreLabels, viewDescriptions, views, type ViewId } from './chart-definitions';
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

const scatterViews = views.filter((view) => view.mode === 'scatter');
const barViews = views.filter((view) => view.mode === 'bars');
// Scatter plots always put Intelligence up, so the vertical menu lists what bars can rank,
// and the horizontal menu lists what Intelligence can be plotted against.
const verticalOptions = barViews.map((view) => ({ id: view.id, label: metrics[view.metric].label }));
const horizontalOptions = [
  ...scatterViews.map((view) => ({ id: view.id, label: metrics[view.metric].label })),
  { id: 'models', label: 'Models, ranked', divider: true },
] as const satisfies readonly AxisOption<ViewId | 'models'>[];

function Benchmarks() {
  useEffect(() => { document.title = 'Atlas · AI model benchmarks'; }, []);
  const search = typeof location === 'undefined' ? '' : location.search;
  const [settings, setSettings] = useState(() => readSettings(search));
  const [active, setActive] = useState(() => readView(search));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const phone = useMediaQuery('(max-width: 600px)');
  const update = useCallback(
    (patch: Partial<Settings>) => setSettings((current) => ({ ...current, ...patch })),
    [],
  );
  const rows = useMemo(
    () => visibleModels(settings.selected, []),
    [settings.selected],
  );
  const view = views.find((view) => view.id === active) ?? views[0]!;
  const { scatter, linear, score } = resolveView(view, settings);
  const subscription = usesSubscriptionPricing(view.id, settings);
  const pricedRows = useMemo(() => subscriptionRows(rows, settings),
    [rows, settings.pricingMode, settings.subscriptionPlans, settings.countResets]);
  const chartRows = useMemo(
    () => visibleChartRows(subscription ? pricedRows : rows, view, settings),
    [subscription, pricedRows, rows, view, settings],
  );
  // With the frontier on, subscription pricing compares subscription estimates only.
  const plotted = subscription && scatter && settings.frontier ? chartRows.filter((row) => row.taskPricing?.basis === 'subscription') : chartRows;
  const frontier = useMemo(
    () => new Set(paretoFrontier(subscription ? chartRows.filter((row) => row.taskPricing?.basis === 'subscription') : chartRows, view.metric, (model) => model[score]).map((model) => model.family)),
    [chartRows, view.metric, score, subscription],
  );
  const horizontalMenu = (side: 'above' | 'below', align: 'start' | 'end') => (
    <AxisMenu
      axis="Horizontal axis"
      label={scatter ? `${metrics[view.metric].label}, ${linear ? 'linear' : 'log'}` : 'Models, ranked'}
      options={horizontalOptions}
      current={scatter ? view.id : 'models'}
      choose={(id) => { if (id !== 'models') setActive(id); else if (scatter) setActive('intelligence'); }}
      side={side}
      align={align}
    />
  );
  const hasFallback = !(scatter && settings.frontier) && chartRows.some((row) => row.cost !== null && row.taskPricing?.basis === 'api-fallback');

  useEffect(() => {
    history.replaceState(null, '', writeSettings(settings, active));
  }, [settings, active]);
  useEffect(() => {
    const pop = () => {
      setSettings(readSettings(location.search));
      setActive(readView(location.search));
    };
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, []);

  return (
    <div className="grid h-dvh grid-rows-[var(--header-height)_minmax(0,1fr)_auto] phone:block phone:h-auto">
      <a
        href="#benchmark-workspace"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-40 focus:rounded-md focus:bg-panel focus:p-3"
      >
        Skip to benchmarks
      </a>
      <SiteHeader current="benchmarks" onCurrent={() => setActive(views[0].id)} />
      <Sidebar
        settings={settings}
        update={update}
        open={pickerOpen}
        setOpen={setPickerOpen}
        frontier={frontier}
        onHighlight={setHighlighted}
      />
      <main
        id="benchmark-workspace"
        tabIndex={-1}
        className="mx-7 mt-6 mb-2 min-h-0 min-w-0 rounded-[14px] bg-panel [outline:none] short:mt-4 compact:mx-5 mobile:mx-4 mobile:mt-4 mobile:mb-0"
      >
        <h1 className="sr-only">Model benchmarks</h1>
        <section
          className="chart-section flex h-full flex-col px-6 pt-4 pb-3 phone:h-auto mobile:px-4 mobile:pb-5"
          id={view.id}
          aria-label={view.label}
        >
          <h2 className="sr-only">{view.label}</h2>
          <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2">
            {/* Phones put both axis menus first, so switching charts never waits below a long ranking. */}
            <div className="flex flex-wrap gap-2 phone:w-full">
              <AxisMenu
                axis="Vertical axis"
                label={scatter ? scoreLabels[score] : metrics[view.metric].label}
                options={verticalOptions}
                current={scatter ? 'intelligence' : view.id}
                choose={(id) => { if (!(scatter && id === 'intelligence')) setActive(id); }}
                side="below"
                align="start"
              />
              <div className="hidden phone:block">{horizontalMenu('below', 'start')}</div>
            </div>
            {scatter && (
              <div className="ml-auto flex items-center gap-4 phone:ml-0 phone:gap-3">
                <button
                  className="inline-flex min-h-9 items-center gap-2 rounded-md px-1 text-[13px] text-fg hover:text-accent aria-pressed:text-accent"
                  aria-pressed={settings.frontier}
                  title="Highlight configurations that no other beats on both axes."
                  onClick={() => update({ frontier: !settings.frontier })}
                >
                  <Selection checked={settings.frontier} />
                  Frontier
                </button>
                <div className={segments} role="group" aria-label={`${view.label} axis scale`}>
                  <button
                    className={segment}
                    aria-pressed={linear}
                    onClick={() => update({ linear: [...new Set([...settings.linear, view.id])] })}
                  >
                    Linear
                  </button>
                  <button
                    className={segment}
                    aria-pressed={!linear}
                    onClick={() => update({ linear: settings.linear.filter((id) => id !== view.id) })}
                  >
                    Log
                  </button>
                </div>
              </div>
            )}
            <div className={`flex items-center gap-3 phone:ml-auto phone:gap-2 ${scatter ? '' : 'ml-auto'}`}>
              <button
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line pr-2 pl-3 text-[13px] text-fg-2 hover:border-line-2 hover:bg-hover hover:text-fg aria-expanded:border-accent aria-expanded:text-accent"
                onClick={() => setPickerOpen(true)}
                aria-haspopup="dialog"
                aria-controls="model-filters"
                aria-expanded={pickerOpen}
                aria-keyshortcuts="/"
              >
                <Search size={14} aria-hidden="true" />
                <span><span className="font-[600] text-fg tabular-nums">{settings.selected.length}</span><span className="phone:sr-only"> {settings.selected.length === 1 ? 'model' : 'models'}</span></span>
                <kbd aria-hidden="true" className="flex size-5 items-center justify-center rounded-[4px] border border-line font-sans text-[11px] text-fg-3 mobile:hidden">/</kbd>
              </button>
              <ChartOptions
                settings={settings}
                update={update}
                descending={chartDescending(view.metric, phone, settings.descending)}
                pricing={view.id === 'cost-intelligence' || view.id === 'cost-task'}
                scatter={scatter}
                ranking={phone && !scatter}
              />
            </div>
          </div>
          {subscription && (
            <p className="mt-2 mb-0 max-w-[80ch] shrink-0 text-[12px] leading-5 text-fg-2">
              <strong className="font-[600] text-fg">Estimated subscription pricing.</strong>{' '}
              Assumes one model uses the full allowance.{' '}
              {settings.countResets ? 'Counts confirmed bonus resets.' : 'Excludes bonus resets.'}
              {hasFallback && ' Models without a subscription estimate use API prices.'}
              {scatter && settings.frontier && ' The frontier compares subscription estimates only.'}
              {scatter && !linear && chartRows.some((row) => row.cost === 0) && ' Log scale hides $0 configurations.'}
            </p>
          )}
          <Chart
            key={view.id}
            phone={phone}
            view={view}
            rows={plotted}
            pricingContext={subscription ? pricingDisclosure(plotted, settings.countResets) : undefined}
            settings={settings}
            highlighted={highlighted}
            onHighlight={setHighlighted}
          />
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-2 pt-2 mobile:pt-3">
            <p className="m-0 min-w-0 flex-1 basis-[280px] text-[12px] leading-5 text-pretty text-fg-2">
              {viewDescriptions[view.id]}
              {!subscription && view.metric === 'cost' && ' Costs use API prices.'}
            </p>
            <div className="ml-auto phone:hidden">{horizontalMenu('above', 'end')}</div>
          </div>
        </section>
      </main>
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
    // On phones the sticky header covers the top of the page, so space above starts below it.
    const feed = element.closest('section')?.parentElement?.getBoundingClientRect();
    const stickyBottom = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
    const trigger = element.getBoundingClientRect();
    const below = Math.min(window.innerHeight, feed?.bottom ?? window.innerHeight) - trigger.bottom - 18;
    const above = trigger.top - Math.max(0, feed?.top ?? 0, stickyBottom) - 18;
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
    }} onClickCapture={(event) => {
      // Summary clicks run before the menu opens, so the first painted frame is already on the right side.
      if (!menu.current?.open && event.target instanceof Element && event.target.closest('summary')) fitMenu();
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
