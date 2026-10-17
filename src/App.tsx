import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, Check, Download, Ellipsis, Moon, SlidersHorizontal, Sun } from 'lucide-react';
import { Chart } from './Charts';
import { Sidebar } from './Sidebar';
import { downloadChart } from './export';
import { fetchedAt, paretoFrontier, views, visibleModels, type ViewId } from './models';
import { readSettings, readView, writeSettings, type Settings } from './state';

function Selection({ checked }: { checked: boolean }) {
  return (
    <span className={`selection ${checked ? 'checked' : ''}`} aria-hidden="true">
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
  const [mobile, setMobile] = useState(() => matchMedia('(max-width: 900px)').matches);
  const feed = useRef<HTMLDivElement>(null);
  const navigationTarget = useRef<{ id: ViewId; until: number } | null>(null);
  const update = useCallback(
    (patch: Partial<Settings>) => setSettings((current) => ({ ...current, ...patch })),
    [],
  );
  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const rows = visibleModels(settings.selected, settings.excluded);
  const view = views.find((view) => view.id === active) ?? views[0];
  const frontier = new Set(paretoFrontier(rows, view.metric).map((model) => model.family));

  useEffect(() => {
    const media = matchMedia('(max-width: 900px)');
    const change = () => setMobile(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);

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
      await downloadChart(active);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Could not export the chart.');
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <a href="/" className="brand" aria-label="Slopalytics home">
          <strong>
            <span>slop</span>alytics
          </strong>
        </a>
        <nav className="section-tabs" aria-label="Sections">
          <button className="active" aria-current="page" onClick={() => navigate(views[0].id)}>
            Benchmarks
          </button>
        </nav>
        <nav className="view-tabs" aria-label="Chart views">
          {views.map((view) => (
            <span className="tab-item" key={view.id}>
              {view.id === 'tokens-task' && <span className="tab-divider" aria-hidden="true" />}
              <button
                className={active === view.id ? 'active' : ''}
                aria-current={active === view.id ? 'page' : undefined}
                onClick={() => navigate(view.id)}
              >
                {view.label}
              </button>
            </span>
          ))}
        </nav>
        <div className="header-actions">
          <button
            className="icon-button"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            className="icon-button desktop-only"
            aria-label="Download PNG"
            title="Download PNG"
            onClick={exportPng}
          >
            <Download size={15} />
          </button>
          <details className="chart-settings desktop-only">
            <summary aria-label="Chart settings" title="Chart settings">
              <Ellipsis size={17} />
            </summary>
            <div className="settings-popover" aria-label="Chart settings">
              <span className="control-label">2D charts</span>
              <button
                className="check-button"
                aria-pressed={settings.labels}
                onClick={() => update({ labels: !settings.labels })}
              >
                <Selection checked={settings.labels} />
                Labels
              </button>
              <span className="control-label">Bar charts</span>
              <button
                className="check-button"
                aria-pressed={settings.grouped}
                onClick={() => update({ grouped: !settings.grouped })}
              >
                <Selection checked={settings.grouped} />
                Group by model
              </button>
              <button className="check-button" onClick={() => update({ descending: !settings.descending })}>
                <ArrowDown
                  size={13}
                  style={{ transform: settings.descending ? 'rotate(180deg)' : undefined }}
                />
                {settings.descending ? 'Highest first' : 'Highest last'}
              </button>
            </div>
          </details>
          <button
            className="mobile-only mobile-filter-toggle"
            onClick={() => setMobileOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={mobileOpen}
          >
            <SlidersHorizontal size={14} />
            <span className="filter-label">Models</span>
            <span>{settings.selected.length}</span>
          </button>
        </div>
      </header>
      <div className="body-layout">
        <main>
          <h1 className="sr-only">Model benchmarks</h1>
          <div className="chart-feed" ref={feed}>
            {views.map((view) => {
              const scatter = view.scatter || (view.id === 'tokens-task' && settings.scatter);
              const linear = settings.linear.includes(view.id);
              return (
                <section className="chart-section" id={view.id} key={view.id} aria-label={view.label}>
                  <div className="chart-heading">
                    <h2>{view.label}</h2>
                    <div className="chart-controls">
                      {scatter && (
                        <button
                          className="pareto-toggle"
                          aria-pressed={settings.frontier}
                          title="Show configurations with no better and cheaper or faster alternative."
                          onClick={() => update({ frontier: !settings.frontier })}
                        >
                          <Selection checked={settings.frontier} />
                          Pareto line
                        </button>
                      )}
                      {view.id === 'tokens-task' && (
                        <div className="chart-scale" role="group" aria-label="Tokens per task chart type">
                          <button aria-pressed={!settings.scatter} onClick={() => update({ scatter: false })}>
                            Bars
                          </button>
                          <button aria-pressed={settings.scatter} onClick={() => update({ scatter: true })}>
                            Scatter
                          </button>
                        </div>
                      )}
                      {scatter && (
                        <div className="chart-scale" role="group" aria-label={`${view.label} axis scale`}>
                          <button
                            aria-pressed={linear}
                            onClick={() => update({ linear: [...new Set([...settings.linear, view.id])] })}
                          >
                            Linear
                          </button>
                          <button
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
                    view={view}
                    rows={rows}
                    settings={settings}
                    highlighted={highlighted}
                    onHighlight={setHighlighted}
                  />
                </section>
              );
            })}
          </div>
          <footer>
            <span title={`Local snapshot captured ${new Date(fetchedAt).toLocaleString()}`}>
              Data from{' '}
              <a href="https://artificialanalysis.ai/" target="_blank" rel="noreferrer">
                Artificial Analysis
              </a>
            </span>
            <div className="footer-links">
              <a href="https://t3.codes/" target="_blank" rel="noreferrer">
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
        <div className="export-error" role="alert">
          {exportError}
          <button onClick={() => setExportError('')}>Dismiss</button>
        </div>
      )}
    </div>
  );
}
