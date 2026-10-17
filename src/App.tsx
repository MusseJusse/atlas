import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, Check, Download, Ellipsis, Moon, SlidersHorizontal, Sun } from 'lucide-react';
import { Chart } from './Charts';
import { Sidebar } from './Sidebar';
import { useMediaQuery } from './useMediaQuery';
import { fetchedAt, paretoFrontier, views, visibleModels, type ViewId } from './models';
import { readSettings, readView, writeSettings, type Settings } from './state';
import { speedEndpoints } from './data/speed-endpoints';

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
  const [settings, setSettings] = useState(() => readSettings(location.search));
  const [active, setActive] = useState(() => readView(location.search));
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('benchmark-theme') === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [exportError, setExportError] = useState('');
  const mobile = useMediaQuery('(max-width: 900px)');
  const phone = useMediaQuery('(max-width: 600px)');
  const feed = useRef<HTMLDivElement>(null);
  const navigationTarget = useRef<{ id: ViewId; until: number } | null>(null);
  const update = useCallback(
    (patch: Partial<Settings>) => setSettings((current) => ({ ...current, ...patch })),
    [],
  );
  const closeMobile = useCallback(() => setMobileOpen(false), []);
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
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#000000' : '#ffffff');
    try {
      localStorage.setItem('benchmark-theme', theme);
    } catch {
      /* The theme still works when storage is unavailable. */
    }
  }, [theme]);

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
  }, []);
  useEffect(() => {
    const id = readView(location.search);
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }));
  }, []);

  useEffect(() => {
    const container = feed.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible || visible.intersectionRatio < 0.4) return;
        const candidate = views.find((view) => view.id === visible.target.id)?.id;
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
    container.querySelectorAll('.chart-section').forEach((element) => observer.observe(element));
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
    <div className="grid h-dvh grid-rows-[var(--header-height)_minmax(0,1fr)] mobile:block mobile:h-auto">
      <header className="flex items-center gap-6 border-b border-line px-7 compact:gap-4 compact:px-[18px] mobile:sticky mobile:top-0 mobile:z-[8] mobile:h-auto mobile:flex-wrap mobile:gap-0 mobile:bg-bg mobile:p-0">
        <a
          href="/"
          className="shrink-0 whitespace-nowrap mobile:flex mobile:h-[52px] mobile:items-center mobile:pl-4"
          aria-label="Slopalytics home"
        >
          <strong className="text-[24px] font-[450] tracking-[-1.2px] compact:text-[21px]">
            <span className="text-accent">slop</span>alytics
          </strong>
        </a>
        <nav
          className="flex shrink-0 items-center gap-3.5 border-r border-line-2 pr-[22px] compact:pr-4 mobile:ml-[22px] mobile:border-0 mobile:p-0"
          aria-label="Sections"
        >
          <button
            className="min-h-9 text-[12px] text-fg mobile:min-h-11"
            aria-current="page"
            onClick={() => navigate(views[0].id)}
          >
            Benchmarks
          </button>
        </nav>
        <nav
          className="flex min-w-0 items-stretch self-stretch gap-[22px] overflow-x-auto [scrollbar-width:none] wide:gap-[26px] compact:gap-4 mobile:order-3 mobile:h-[42px] mobile:w-full mobile:shrink-0 mobile:gap-5 mobile:border-t mobile:border-line mobile:px-4"
          aria-label="Chart views"
        >
          {views.map((view) => (
            <span className="flex shrink-0 items-stretch gap-[22px] compact:gap-4 mobile:gap-5" key={view.id}>
              {view.id === 'tokens-task' && (
                <span className="h-3.5 w-px shrink-0 self-center bg-line-2" aria-hidden="true" />
              )}
              <button
                className="relative flex items-center whitespace-nowrap text-[12.5px] text-fg-2 wide:text-[13px] compact:text-[12px] mobile:text-[13.5px] aria-[current=page]:text-fg aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-0 aria-[current=page]:after:bottom-0 aria-[current=page]:after:h-0.5 aria-[current=page]:after:rounded-[2px] aria-[current=page]:after:bg-accent aria-[current=page]:after:content-['']"
                aria-current={active === view.id ? 'page' : undefined}
                onClick={() => navigate(view.id)}
              >
                {view.label}
              </button>
            </span>
          ))}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-0.5 mobile:h-[52px] mobile:pr-2.5">
          <button
            className="flex size-8 items-center justify-center text-fg-2 [&:hover]:text-fg"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            className="flex size-8 items-center justify-center text-fg-2 [&:hover]:text-fg mobile:hidden!"
            aria-label="Download PNG"
            title="Download PNG"
            onClick={exportPng}
          >
            <Download size={15} />
          </button>
          <details className="group relative mobile:hidden!">
            <summary
              className="flex size-8 cursor-pointer list-none items-center justify-center text-fg-2 group-open:text-fg [&:hover]:text-fg focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-accent focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden"
              aria-label="Chart settings"
              title="Chart settings"
            >
              <Ellipsis size={17} />
            </summary>
            <div
              className="absolute top-[calc(100%+10px)] right-0 z-20 flex w-[220px] max-w-[calc(100vw-32px)] flex-col items-start gap-3.5 rounded-lg border border-line-2 bg-surface p-4"
              aria-label="Chart settings"
            >
              <span className="-mb-2 text-[11px] text-fg-3">2D charts</span>
              <button
                className="inline-flex items-center gap-2 whitespace-nowrap text-[12px] text-fg-2 [&:hover]:text-fg"
                aria-pressed={settings.labels}
                onClick={() => update({ labels: !settings.labels })}
              >
                <Selection checked={settings.labels} />
                Labels
              </button>
              <span className="-mb-2 text-[11px] text-fg-3">Bar charts</span>
              <button
                className="inline-flex items-center gap-2 whitespace-nowrap text-[12px] text-fg-2 [&:hover]:text-fg"
                aria-pressed={settings.grouped}
                onClick={() => update({ grouped: !settings.grouped })}
              >
                <Selection checked={settings.grouped} />
                Group by model
              </button>
              <button
                className="inline-flex items-center gap-2 whitespace-nowrap text-[12px] text-fg-2 [&:hover]:text-fg"
                onClick={() => update({ descending: !settings.descending })}
              >
                <ArrowDown
                  size={13}
                  style={{ transform: settings.descending ? 'rotate(180deg)' : undefined }}
                />
                {settings.descending ? 'Highest first' : 'Highest last'}
              </button>
            </div>
          </details>
          <button
            className="hidden! mobile:inline-flex! mobile:items-center mobile:gap-1.5 mobile:h-10 mobile:px-1.5 mobile:text-[14px] mobile:text-fg"
            onClick={() => setMobileOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={mobileOpen}
          >
            <SlidersHorizontal size={14} />
            <span className="mobile:text-[12px] mobile:text-fg-3">Models</span>
            <span className="mobile:text-[12px] mobile:text-fg-3">{settings.selected.length}</span>
          </button>
        </div>
      </header>
      <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_var(--sidebar-width)] mobile:block">
        <main className="grid min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_auto] mobile:block">
          <h1 className="sr-only">Model benchmarks</h1>
          <div
            className="relative min-h-0 snap-y snap-proximity overflow-y-auto [scrollbar-width:thin] [scrollbar-color:var(--line-2)_var(--bg)] mobile:snap-none mobile:overflow-visible"
            ref={feed}
          >
            {views.map((view) => {
              const scatter = view.scatter || (view.id === 'tokens-task' && settings.scatter);
              const linear = settings.linear.includes(view.id);
              return (
                <section
                  className="chart-section flex h-full snap-start flex-col px-7 pt-[18px] pb-2.5 [&+section]:border-t [&+section]:border-line compact:px-[18px] mobile:h-auto mobile:scroll-mt-[95px] mobile:px-4 mobile:pt-5 mobile:pb-6"
                  id={view.id}
                  key={view.id}
                  aria-label={view.label}
                >
                  <div className="mb-1.5 flex shrink-0 items-center justify-between gap-4 mobile:flex-wrap mobile:gap-x-4 mobile:gap-y-1">
                    <h2 className="m-0 shrink text-[16px] font-medium mobile:flex mobile:flex-1 mobile:items-baseline mobile:justify-between mobile:gap-3 mobile:text-[18px]">
                      {view.label}
                    </h2>
                    <div className="flex shrink-0 items-center gap-6 mobile:flex-[1_0_100%] mobile:justify-between">
                      {view.metric === 'speed' && (
                        <span className="text-[12px] text-fg-2">Higher is faster</span>
                      )}
                      {scatter && (
                        <button
                          className="inline-flex min-h-8 items-center gap-2 whitespace-nowrap text-[12px] text-fg aria-pressed:text-accent [&:hover]:text-accent mobile:min-h-11"
                          aria-pressed={settings.frontier}
                          title="Show configurations with no better and cheaper or faster alternative."
                          onClick={() => update({ frontier: !settings.frontier })}
                        >
                          <Selection checked={settings.frontier} />
                          Pareto line
                        </button>
                      )}
                      {view.id === 'tokens-task' && (
                        <div
                          className="flex shrink-0 gap-3 mobile:gap-2.5"
                          role="group"
                          aria-label="Tokens per task chart type"
                        >
                          <button
                            className="min-h-8 border-b border-b-transparent px-0.5 py-1 text-[12px] text-fg-3 aria-pressed:border-accent aria-pressed:text-accent [&:hover]:text-fg mobile:min-h-11"
                            aria-pressed={!settings.scatter}
                            onClick={() => update({ scatter: false })}
                          >
                            Bars
                          </button>
                          <button
                            className="min-h-8 border-b border-b-transparent px-0.5 py-1 text-[12px] text-fg-3 aria-pressed:border-accent aria-pressed:text-accent [&:hover]:text-fg mobile:min-h-11"
                            aria-pressed={settings.scatter}
                            onClick={() => update({ scatter: true })}
                          >
                            Scatter
                          </button>
                        </div>
                      )}
                      {scatter && (
                        <div
                          className="flex shrink-0 gap-3 mobile:gap-2.5"
                          role="group"
                          aria-label={`${view.label} axis scale`}
                        >
                          <button
                            className="min-h-8 border-b border-b-transparent px-0.5 py-1 text-[12px] text-fg-3 aria-pressed:border-accent aria-pressed:text-accent [&:hover]:text-fg mobile:min-h-11"
                            aria-pressed={linear}
                            onClick={() => update({ linear: [...new Set([...settings.linear, view.id])] })}
                          >
                            Linear
                          </button>
                          <button
                            className="min-h-8 border-b border-b-transparent px-0.5 py-1 text-[12px] text-fg-3 aria-pressed:border-accent aria-pressed:text-accent [&:hover]:text-fg mobile:min-h-11"
                            aria-pressed={!linear}
                            onClick={() => update({ linear: settings.linear.filter((id) => id !== view.id) })}
                          >
                            Log
                          </button>
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
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-7 py-[9px] text-[11px] text-fg-3 compact:px-[18px] mobile:px-4 mobile:pt-[18px] mobile:pb-[calc(28px+env(safe-area-inset-bottom))]">
            <span title={`Local snapshot captured ${new Date(fetchedAt).toLocaleString()}`}>
              Data from{' '}
              <a
                className="text-fg-2 [&:hover]:text-fg"
                href="https://artificialanalysis.ai/"
                target="_blank"
                rel="noreferrer"
              >
                Artificial Analysis
              </a>
            </span>
            {active === 'output-speed' && (
              <span className="text-fg-2">
                Standard snapshot: {fetchedAt.slice(0, 10)}
                {speedEndpoints.map((endpoint) => (
                  <a
                    key={endpoint.id}
                    className="ml-3 underline underline-offset-[3px]"
                    href={endpoint.speedSource.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Ultrafast: {endpoint.speedSource.fetchedAt.slice(0, 10)}
                  </a>
                ))}
              </span>
            )}
            <div className="flex gap-5 whitespace-nowrap">
              <a className="text-accent" href="https://t3.codes/" target="_blank" rel="noreferrer">
                Try T3 Code
              </a>
            </div>
          </footer>
        </main>
        <Sidebar
          settings={settings}
          update={update}
          open={mobileOpen}
          close={closeMobile}
          frontier={frontier}
          onHighlight={setHighlighted}
        />
      </div>
      {exportError && (
        <div
          className="fixed bottom-12 left-7 z-30 flex max-w-[calc(100vw-56px)] gap-[18px] rounded-lg border border-line-2 bg-surface px-4 py-3.5 text-[12px]"
          role="alert"
        >
          {exportError}
          <button className="text-accent [&:hover]:text-fg" onClick={() => setExportError('')}>
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
