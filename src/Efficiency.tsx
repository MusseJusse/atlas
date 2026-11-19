import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import snapshot from 'virtual:benchmarks';
import { Check } from 'lucide-react';
import { SiteHeader } from './SiteHeader';
import { costMultiplier, efficiencySeries, elapsedTimeSinceFirstRecord } from './efficiency-data';
import { readEfficiencySettings, writeEfficiencySettings } from './efficiency-state';
import { EfficiencyChart, efficiencyColors, recordKey } from './EfficiencyChart';
import { ConfigurationDetails } from './charts/ConfigurationDetails';
import { resolveChartInteraction } from './chart-interactions';
import { formatUtcDate } from './formatDate';
import { Select } from './Select';

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
      <SiteHeader current="efficiency" />
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
            <legend className="mb-1 text-[18px] font-[650] tracking-[-0.3px]">Intelligence index</legend>
            <p className="mt-0 mb-3 text-[12px] leading-5 text-fg-2 mobile:hidden">Show the cheapest model at or above each score.</p>
            <div className="flex flex-col gap-0.5 mobile:grid mobile:grid-cols-6 mobile:gap-x-1 phone:grid-cols-3">
              {lines.map((line) => (
                <label key={line.threshold} className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-md px-1.5 text-[13px] hover:bg-hover has-[:checked]:font-[550] mobile:min-h-11">
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
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className="flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-control-border text-on-accent peer-checked:border-transparent peer-checked:bg-[var(--line-color)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent [&>svg]:invisible peer-checked:[&>svg]:visible"
                    style={{ '--line-color': efficiencyColors[line.threshold] } as CSSProperties}
                  >
                    <Check size={11} strokeWidth={3.25} />
                  </span>
                  <span className="tabular-nums">≥ {line.threshold}</span>
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
                  summary={activeLine && (
                    <p className="mt-3 mb-0 text-[15px] leading-5 font-[600] text-fg">
                      {activeLine.points[0] === active.point
                        ? 'First record at this threshold'
                        : `${new Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(costMultiplier(activeLine, active.point))}× cheaper after ${elapsedTimeSinceFirstRecord(activeLine, active.point)}`}
                    </p>
                  )}
                />
                <div role="group" aria-label="Record details" className="mt-3 flex flex-col gap-2 border-t border-line pt-3 text-[12px] text-fg-2">
                  {coincident.length > 1 ? (
                    <Select
                      aria-label="Threshold for overlapping records"
                      value={recordKey(active)}
                      onChange={(event) => { setPinned(event.currentTarget.value); setHovered(null); }}
                      className="w-full"
                    >
                      {coincident.map((record) => <option key={recordKey(record)} value={recordKey(record)}>Intelligence ≥ {record.threshold}</option>)}
                    </Select>
                  ) : <span>Intelligence ≥ {active.threshold}</span>}
                  <time dateTime={active.point.date}>{formatUtcDate(active.point.date, 'short')}</time>
                </div>
              </aside>
            )}
          </div>
        </aside>
        <section aria-labelledby="efficiency-title" className="flex min-h-0 min-w-0 flex-col overflow-y-auto rounded-[14px] bg-panel px-6 pt-5 pb-4 mobile:contents">
          <div className="efficiency-heading">
            <h1 id="efficiency-title" className="display m-0 text-[30px] leading-[1.1] phone:text-[24px]">
              Cost at each intelligence threshold
            </h1>
            <p className="mt-1 mb-0 max-w-[72ch] text-[13px] leading-5 text-pretty text-fg-2">
              Each step down is a new record: a model released that day reaches the threshold for less. Costs are per Intelligence Index task in USD, on a log scale, at today’s prices.
            </p>
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
            <footer className="mt-3 flex shrink-0 flex-wrap justify-between gap-x-4 text-[12px] leading-5 text-fg-3">
              <span>
                Data from{' '}
                <a href={source} className="underline-offset-4 hover:text-accent hover:underline">Artificial Analysis</a>
              </span>
              <span>Snapshot captured <time dateTime={snapshot.fetchedAt}>{formatUtcDate(snapshot.fetchedAt, 'short')}</time></span>
            </footer>
          </div>
        </section>
      </main>
    </div>
  );
}
