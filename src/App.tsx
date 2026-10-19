import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, Check, Download, Ellipsis, Moon, SlidersHorizontal, Sun } from 'lucide-react';
import { Chart } from './Charts';
import { Sidebar } from './Sidebar';
import { useMediaQuery } from './useMediaQuery';
import { fetchedAt, paretoFrontier, views, visibleModels, type ViewId } from './models';
import { chartDescending, readSettings, readView, writeSettings, type Settings } from './state';
import { useTheme } from './useTheme';
import { Brand } from './Brand';

const Changelog = lazy(() =>
  import('./Changelog').then(({ Changelog }) => ({ default: Changelog })),
);

function Selection({ checked }: { checked: boolean }) {
  return (
    <span
      className={`inline-flex size-3 shrink-0 items-center justify-center rounded-[3px] border text-on-accent [&_svg]:size-2.5 ${checked ? 'border-accent bg-accent' : 'border-line-2'}`}
      aria-hidden="true"
    >
      {checked && <Check size={11} strokeWidth={3} />}
    </span>
  );
}

export function App() {
  return typeof location !== 'undefined' &&
    new URLSearchParams(location.search).get('page') === 'changelog' ? (
    <Suspense
      fallback={
        <p className="p-7 text-[14px] text-fg-2" role="status">
          Loading changelog…
        </p>
      }
    >
      <Changelog />
    </Suspense>
  ) : (
    <Benchmarks />
  );
}

function Benchmarks() {
  const search = typeof location === 'undefined' ? '' : location.search;
  const [settings, setSettings] = useState(() => readSettings(search));
  const [active, setActive] = useState(() => readView(search));
  const [theme, setTheme] = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [exportError, setExportError] = useState('');
  const mobile = useMediaQuery('(max-width: 900px)');
  const phone = useMediaQuery('(max-width: 600px)');
  const feed = useRef<HTMLDivElement>(null);
  const chartNavigation = useRef<HTMLElement>(null);
  const navigationTarget = useRef<{ id: ViewId; until: number } | null>(null);
  const update = useCallback(
    (patch: Partial<Settings>) => setSettings((current) => ({ ...current, ...patch })),
    [],
  );
  const closeMobile = useCallback(() => setMobileOpen(false), []);
  useEffect(() => {
    if (!mobile) setMobileOpen(false);
  }, [mobile]);
  const rows = useMemo(
    () => visibleModels(settings.selected, settings.excluded),
    [settings.selected, settings.excluded],
  );
  const view = views.find((view) => view.id === active) ?? views[0];
  const frontier = useMemo(
    () => new Set(paretoFrontier(rows, view.metric).map((model) => model.family)),
    [rows, view.metric],
  );

  useEffect(() => {
    history.replaceState(null, '', writeSettings(settings, active));
  }, [settings, active]);
  useEffect(() => {
    const navigation = chartNavigation.current;
    const button = navigation?.querySelector<HTMLButtonElement>('[aria-current="page"]');
    if (!navigation || !button) return;
    const bounds = navigation.getBoundingClientRect();
    const rect = button.getBoundingClientRect();
    const offset = rect.left < bounds.left
      ? rect.left - bounds.left
      : Math.max(0, rect.right - bounds.right);
    // Scroll only this strip, preserving the page's vertical scroll position.
    if (offset) navigation.scrollBy({ left: offset, behavior: 'instant' });
  }, [active, mobile]);
  useEffect(() => {
    const pop = () => {
      setSettings(readSettings(location.search));
      navigate(readView(location.search));
    };
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, []);
  useEffect(() => {
    const id = readView(location.search);
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }));
  }, []);

  useEffect(() => {
    const container = feed.current;
    if (!container) return;
    const sections = [...container.querySelectorAll<HTMLElement>('.chart-section')];
    const observer = new IntersectionObserver(
      (entries) => {
        const bounds = entries[0]?.rootBounds;
        if (!bounds) return;
        // Notifications only include sections that crossed a threshold. Compare all
        // sections at their current positions so an outgoing chart cannot steal selection.
        const visible = sections
          .map((section) => {
            const rect = section.getBoundingClientRect();
            const width = Math.max(0, Math.min(rect.right, bounds.right) - Math.max(rect.left, bounds.left));
            const height = Math.max(0, Math.min(rect.bottom, bounds.bottom) - Math.max(rect.top, bounds.top));
            const area = rect.width * rect.height;
            return { id: section.id, ratio: area > 0 ? (width * height) / area : 0 };
          })
          .sort((a, b) => b.ratio - a.ratio)[0];
        if (!visible || visible.ratio < 0.4) return;
        const candidate = views.find((view) => view.id === visible.id)?.id;
        if (!candidate) return;
        if (
          navigationTarget.current &&
          Date.now() < navigationTarget.current.until &&
          navigationTarget.current.id !== candidate
        )
          return;
        setActive(candidate);
      },
      { root: mobile ? null : container, threshold: [0.4, 0.6, 0.9] },
    );
    sections.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [mobile]);

  function navigate(id: ViewId) {
    navigationTarget.current = { id, until: Date.now() + 500 };
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }
  async function exportPng() {
    setExportError('');
    try {
      const { downloadChart } = await import('./export');
      await downloadChart(active);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Could not export the chart.');
    }
  }

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
            href="?page=changelog"
            className="flex min-h-11 items-center text-[12px] text-fg-2 hover:text-accent"
          >
            Changelog
          </a>
        </nav>
        <div className="ml-auto flex items-center gap-3 phone:gap-0">
          <button
            className="flex size-10 items-center justify-center rounded-md text-fg-2 hover:bg-hover hover:text-accent"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? (
              <Sun size={16} aria-hidden="true" />
            ) : (
              <Moon size={16} aria-hidden="true" />
            )}
          </button>
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-[12px] text-fg-2 hover:bg-hover hover:text-accent phone:hidden!"
            aria-label="Download PNG"
            onClick={exportPng}
          >
            <Download size={15} aria-hidden="true" />
            <span className="phone:hidden">Export chart</span>
          </button>
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
            <nav
              ref={chartNavigation}
              className="flex min-w-0 gap-6 overflow-x-auto border-b border-line [scrollbar-width:thin] [scrollbar-color:var(--line-2)_transparent] compact:gap-5"
              aria-label="Chart views"
            >
              {views.map((view) => (
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
          </div>
          <div
            className="relative min-h-0 snap-y snap-proximity overflow-y-auto rounded-b-xl [scrollbar-width:thin] [scrollbar-color:var(--line-2)_var(--panel)] mobile:snap-none mobile:overflow-visible"
            ref={feed}
          >
            {views.map((view) => {
              const scatter = view.scatter || (view.id === 'tokens-task' && settings.scatter);
              const linear = settings.linear.includes(view.id);
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
                    />
                  </div>
                  <div
                    className={`flex min-h-[58px] shrink-0 short:min-h-12 short:py-1 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2 text-[12px] ${!scatter && view.id !== 'tokens-task' ? 'mobile:hidden' : ''}`}
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
                      {view.id === 'tokens-task' && (
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
                  <Chart
                    active={mobile || active === view.id}
                    phone={phone}
                    view={view}
                    rows={rows}
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
        <span title={`Local snapshot captured ${fetchedAt}`}>
          Snapshot captured{' '}
          <time dateTime={fetchedAt}>
            {new Date(fetchedAt).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              timeZone: 'UTC',
            })}
          </time>
        </span>
      </footer>
      {exportError && (
        <div
          className="fixed bottom-12 left-7 z-30 flex max-w-[calc(100vw-56px)] gap-[18px] rounded-lg border border-line-2 bg-panel px-4 py-3.5 text-[12px]"
          role="alert"
        >
          {exportError}
          <button className="text-accent hover:underline" onClick={() => setExportError('')}>
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

function ChartOptions({
  settings,
  update,
  descending,
}: {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  descending: boolean;
}) {
  return (
    <details className="group relative shrink-0">
      <summary
        className="flex size-10 cursor-pointer list-none items-center justify-center rounded-md text-fg-2 group-open:bg-surface group-open:text-accent hover:bg-surface hover:text-accent focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden"
        aria-label="Chart settings"
        title="Chart settings"
      >
        <Ellipsis size={19} aria-hidden="true" />
      </summary>
      <div
        className="absolute top-[calc(100%+6px)] right-0 z-20 flex w-[220px] max-w-[calc(100vw-48px)] flex-col items-start gap-1 rounded-lg border border-line bg-panel p-3 shadow-lg"
        aria-label="Chart settings"
      >
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
