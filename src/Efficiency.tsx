import { useEffect, useMemo, useState } from 'react';
import snapshot from 'virtual:benchmarks';
import { Brand } from './Brand';
import { ThemeToggle } from './ThemeToggle';
import { efficiencySeries, type EfficiencyMetric } from './efficiency-data';
import { readEfficiencySettings, writeEfficiencySettings } from './efficiency-state';
import { EfficiencyChart, efficiencyColors, formatEfficiencyValue, recordKey } from './EfficiencyChart';
import { formatUtcDate } from './formatDate';

const source = 'https://artificialanalysis.ai/trends#efficiency';
const series = {
  cost: efficiencySeries(snapshot.models, 'cost'),
  speed: efficiencySeries(snapshot.models, 'speed'),
};

export function Efficiency() {
  const [settings, setSettings] = useState(() => readEfficiencySettings(typeof location === 'undefined' ? '' : location.search));
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const lines = series[settings.metric];
  const selected = useMemo(() => lines.filter((line) => settings.thresholds.includes(line.threshold)), [lines, settings.thresholds]);
  const records = useMemo(() => selected.flatMap((line) => line.points.map((point) => ({ threshold: line.threshold, point }))), [selected]);
  const latest = records.toSorted((a, b) => b.point.date.localeCompare(a.point.date) || b.threshold - a.threshold)[0];
  const active = records.find((record) => recordKey(record) === hovered) ??
    records.find((record) => recordKey(record) === pinned) ?? latest;
  const coincident = active ? records.filter(({ point }) =>
    point.date === active.point.date && point.value === active.point.value,
  ) : [];

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

  function changeMetric(metric: EfficiencyMetric) {
    setSettings((current) => ({ ...current, metric }));
    setHovered(null);
    setPinned(null);
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
      <div className="grid min-h-0 grid-cols-[var(--sidebar-width)_minmax(0,1fr)] gap-6 px-7 py-6 compact:gap-5 compact:px-5 mobile:block mobile:px-4 mobile:py-4">
        <aside aria-label="Efficiency filters" className="min-w-0 pt-2 mobile:mb-4 mobile:pt-0">
          <fieldset className="m-0 min-w-0 border-0 p-0">
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
        </aside>
        <main id="efficiency-workspace" tabIndex={-1} className="flex min-h-0 min-w-0 flex-col overflow-y-auto rounded-xl bg-panel px-6 pt-5 pb-4 [outline:none] mobile:overflow-visible mobile:px-4">
          <h1 className="m-0 text-[25px] leading-tight font-[550] tracking-[-0.8px] phone:text-[22px]">
            {settings.metric === 'cost' ? 'Cost at each intelligence threshold' : 'Speed at each intelligence threshold'}
          </h1>
          <div role="group" aria-label="Efficiency measurement" className="mt-2 mb-4 flex shrink-0 gap-6 border-b border-line">
            {(['cost', 'speed'] as const).map((metric) => (
              <button key={metric} aria-pressed={settings.metric === metric} onClick={() => changeMetric(metric)} className="min-h-11 border-b-2 border-transparent text-[12px] text-fg-2 aria-pressed:border-accent aria-pressed:font-semibold aria-pressed:text-accent">
                {metric === 'cost' ? 'Cost per task' : 'Output speed'}
              </button>
            ))}
          </div>
          <p className="m-0 text-[11px] text-fg-2">
            {settings.metric === 'cost' ? 'Cost per Intelligence Index task, USD · Log scale' : 'Output speed, tokens/s · Linear scale'}
          </p>
          <div className="flex min-h-0 flex-1 flex-col" onMouseLeave={() => setHovered(null)}>
            <EfficiencyChart
              lines={lines} selected={selected} metric={settings.metric} fetchedAt={snapshot.fetchedAt}
              active={active} pinned={pinned} preview={setHovered}
              togglePin={(key) => setPinned((current) => current === key ? null : key)}
              clear={() => { setPinned(null); setHovered(null); }}
            />
            <div role="group" aria-label="Record details" className="mt-3 flex min-h-14 shrink-0 flex-wrap items-center gap-x-5 gap-y-1 border-t border-line py-2 text-[12px]">
              {active && <>
                <strong className="inline-flex flex-wrap items-center gap-2 font-semibold">
                  {coincident.length > 1 ? (
                    <select
                      aria-label="Threshold for overlapping records"
                      value={recordKey(active)}
                      onFocus={() => { setPinned(recordKey(active)); setHovered(null); }}
                      onChange={(event) => { setPinned(event.currentTarget.value); setHovered(null); }}
                      className="min-h-10 rounded border border-line bg-panel px-2 font-sans text-[12px] text-fg focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                    >
                      {coincident.map((record) => <option key={recordKey(record)} value={recordKey(record)}>≥ {record.threshold}</option>)}
                    </select>
                  ) : <span>≥ {active.threshold}</span>}
                  <span>· {active.point.model.name}, {active.point.model.effortLabel}</span>
                </strong>
                <time dateTime={active.point.date}>{formatUtcDate(active.point.date, 'short')}</time>
                <span>{formatEfficiencyValue(active.point.value, settings.metric)}{settings.metric === 'cost' ? ' per task' : ''}</span>
              </>}
            </div>
          </div>
          <p className="m-0 shrink-0 text-[11px] leading-5 text-fg-2">Current measurements ordered by model release date. Each step marks a new {settings.metric === 'cost' ? 'lowest cost' : 'highest speed'}.</p>
          <footer className="mt-1 flex shrink-0 flex-wrap justify-between gap-x-4 text-[11px] leading-5 text-fg-2">
            <a href={source} className="underline underline-offset-4">Source: Artificial Analysis</a>
            <span>Snapshot <time dateTime={snapshot.fetchedAt}>{formatUtcDate(snapshot.fetchedAt, 'short')}</time></span>
          </footer>
        </main>
      </div>
    </div>
  );
}
