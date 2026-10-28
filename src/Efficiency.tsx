import { useEffect, useMemo, useRef, useState } from 'react';
import snapshot from 'virtual:benchmarks';
import { Brand } from './Brand';
import { ThemeToggle } from './ThemeToggle';
import { costMultiplier, efficiencySeries, elapsedTimeSinceFirstRecord } from './efficiency-data';
import { readEfficiencySettings, writeEfficiencySettings } from './efficiency-state';
import { EfficiencyChart, efficiencyColors, recordKey } from './EfficiencyChart';
import { ConfigurationDetails } from './charts/ConfigurationDetails';
import { resolveChartInteraction } from './chart-interactions';
import { formatUtcDate } from './formatDate';

const source = 'https://artificialanalysis.ai/trends#efficiency';
const lines = efficiencySeries(snapshot.models);

export function Efficiency() {
  const [settings, setSettings] = useState(() => readEfficiencySettings(typeof location === 'undefined' ? '' : location.search));
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const chart = useRef<HTMLDivElement>(null);
  const selected = useMemo(() => lines.filter((line) => settings.thresholds.includes(line.threshold)), [lines, settings.thresholds]);
  const records = useMemo(() => selected.flatMap((line) => line.points.map((point) => ({
    id: recordKey({ threshold: line.threshold, point }), threshold: line.threshold, point,
  }))), [selected]);
  const { pinned: pinnedRecord, activeModel: active } = resolveChartInteraction(records, pinned, hovered);
  const coincident = active ? records.filter(({ point }) =>
    point.date === active.point.date && point.value === active.point.value,
  ) : [];
  const activePinned = pinnedRecord !== null;
  const activeLine = active ? selected.find((line) => line.threshold === active.threshold) : undefined;

  useEffect(() => {
    document.title = 'Atlas · Efficiency';
    const pop = () => {
      setSettings(readEfficiencySettings(location.search));
      setHovered(null);
      setPinned(null);
    };
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, []);
  useEffect(() => {
    history.replaceState(null, '', writeEfficiencySettings(settings));
  }, [settings]);

  function clearSelection() {
    const point = chart.current?.querySelector<SVGGElement>('g[aria-pressed="true"]');
    point?.focus({ preventScroll: true });
    point?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    setPinned(null);
    setHovered(null);
  }

  return (
    <div className="grid h-dvh grid-rows-[var(--header-height)_minmax(0,1fr)] mobile:block mobile:h-auto">
      <a href="#efficiency-workspace" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-30 focus:rounded-md focus:bg-panel focus:p-3">Skip to efficiency</a>
      <header className="flex items-center gap-8 border-b border-line px-7 mobile:sticky mobile:top-0 mobile:z-[8] mobile:h-[var(--header-height)] mobile:gap-4 mobile:bg-bg mobile:px-4">
        <Brand />
        <nav aria-label="Sections" className="flex items-center gap-6 text-[12px] phone:gap-3 phone:text-[11px]">
          <a href="/" className="flex min-h-11 items-center text-fg-2 phone:hidden">Benchmarks</a>
          <a href="?page=efficiency" aria-current="page" className="flex min-h-11 items-center font-semibold text-fg">Efficiency</a>
          <a href="?page=changelog" className="flex min-h-11 items-center text-fg-2 hover:text-accent">Changelog</a>
        </nav>
        <ThemeToggle className="ml-auto flex size-10 shrink-0 items-center justify-center rounded-md text-fg-2 hover:bg-hover hover:text-accent" showTitle />
      </header>
      <main
        id="efficiency-workspace"
        tabIndex={-1}
        className="efficiency-workspace [outline:none] grid min-h-0 grid-cols-[var(--sidebar-width)_minmax(0,1fr)] gap-6 px-7 py-6 compact:gap-5 compact:px-5 mobile:flex mobile:flex-col mobile:gap-0 mobile:px-4 mobile:py-4"
        onKeyDown={(event) => {
          // Native selects consume Escape for their popup; other controls clear the pin.
          if (event.key === 'Escape' && !(event.target instanceof HTMLSelectElement)) clearSelection();
        }}
      >
        <aside aria-label="Efficiency controls" className="min-h-0 min-w-0 overflow-y-auto pt-2 mobile:contents">
          <fieldset className="efficiency-filters m-0 min-w-0 border-0 p-0">
            <legend className="mb-3 text-[13px] font-semibold">Intelligence Index</legend>
            <div className="flex flex-col gap-1 mobile:flex-row mobile:flex-wrap mobile:gap-x-5 mobile:gap-y-0">
              {lines.map((line) => (
                <label key={line.threshold} className="flex min-h-11 cursor-pointer items-center gap-3 text-[13px]">
                  <input
                    type="checkbox"
                    checked={settings.thresholds.includes(line.threshold)}
                    onChange={(event) => {
                      const checked = event.currentTarget.checked;
                      setSettings((current) => ({ ...current, thresholds: lines.flatMap(({ threshold }) =>
                        (threshold === line.threshold ? checked : current.thresholds.includes(threshold)) ? [threshold] : [],
                      ) }));
                    }}
                    aria-label={`Intelligence Index at least ${line.threshold}`}
                    className="m-0 size-3.5 shrink-0"
                    style={{ accentColor: efficiencyColors[line.threshold] }}
                  />
                  <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="size-2" style={{ background: efficiencyColors[line.threshold] }} />≥ {line.threshold}</span>
                  {!line.points.length && <span className="text-[11px] text-fg-2">No data</span>}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="efficiency-details-slot">
            {active && (
              <aside
                className={`configuration-details efficiency-details${activePinned ? '' : ' pointer-events-none'}`}
                data-placement="top-left"
                aria-label="Selected configuration"
              >
                <ConfigurationDetails
                  model={active.point.model}
                  metric="cost"
                  pinned={activePinned}
                  onClose={clearSelection}
                />
                <div role="group" aria-label="Record details" className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-2 text-[11px] text-fg-2">
                  {coincident.length > 1 ? (
                    <select
                      aria-label="Threshold for overlapping records"
                      value={recordKey(active)}
                      onChange={(event) => { setPinned(event.currentTarget.value); setHovered(null); }}
                      className="min-h-10 min-w-0 max-w-full rounded border border-line bg-panel px-2 font-sans text-[11px] text-fg focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                    >
                      {coincident.map((record) => <option key={recordKey(record)} value={recordKey(record)}>Intelligence ≥ {record.threshold}</option>)}
                    </select>
                  ) : <span>Intelligence ≥ {active.threshold}</span>}
                  <time dateTime={active.point.date}>{formatUtcDate(active.point.date, 'short')}</time>
                </div>
                {activeLine && (
                  <div className="mt-2 text-[11px] text-fg-2">
                    <div className="text-[18px] font-semibold text-fg">
                      {activeLine.points[0] === active.point ? 'First record' : `${new Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(costMultiplier(activeLine, active.point))}× cheaper`}
                    </div>
                    {activeLine.points[0] !== active.point && (
                      <div className="text-[18px] font-semibold text-fg">after {elapsedTimeSinceFirstRecord(activeLine, active.point)}</div>
                    )}
                  </div>
                )}
              </aside>
            )}
          </div>
        </aside>
        <section aria-labelledby="efficiency-title" className="flex min-h-0 min-w-0 flex-col overflow-y-auto rounded-xl bg-panel px-6 pt-5 pb-4 mobile:contents">
          <div className="efficiency-heading">
            <h1 id="efficiency-title" className="m-0 text-[25px] leading-tight font-[550] tracking-[-0.8px] phone:text-[22px]">
              Cost at each intelligence threshold
            </h1>
            <p className="mt-2 mb-0 text-[11px] text-fg-2">Cost per Intelligence Index task, USD · Log scale</p>
          </div>
          <div
            ref={chart}
            className="efficiency-plot relative flex min-h-0 flex-1 flex-col"
            onClick={(event) => {
              if (event.target instanceof SVGRectElement && event.target.classList.contains('chart-background')) setPinned(null);
            }}
          >
            <EfficiencyChart
              lines={lines} selected={selected} fetchedAt={snapshot.fetchedAt}
              active={active} highlightedThreshold={records.find((record) => record.id === hovered)?.threshold ?? active?.threshold ?? null}
              pinned={pinned} preview={setHovered}
              togglePin={(key) => setPinned((current) => current === key ? null : key)}
            />
          </div>
          <div className="efficiency-footer">
            <footer className="mt-1 flex shrink-0 flex-wrap justify-between gap-x-4 text-[11px] leading-5 text-fg-2">
              <a href={source} className="underline underline-offset-4">Source: Artificial Analysis</a>
              <span>Snapshot <time dateTime={snapshot.fetchedAt}>{formatUtcDate(snapshot.fetchedAt, 'short')}</time></span>
            </footer>
          </div>
        </section>
      </main>
    </div>
  );
}
