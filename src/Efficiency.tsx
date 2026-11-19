import { useEffect, useState, type CSSProperties } from 'react';
import snapshot from 'virtual:benchmarks';
import { ChevronDown } from 'lucide-react';
import { SiteHeader } from './SiteHeader';
import { costMultiplier, efficiencySeries, elapsedTimeSinceFirstRecord, type EfficiencyLine } from './efficiency-data';
import { formatUtcDate } from './formatDate';
import { format } from './formatModel';
import { shortName } from './model-presentation';

const source = 'https://artificialanalysis.ai/trends#efficiency';
const lines = efficiencySeries(snapshot.models);

// Every row shares one log cost axis, so a longer arrow is a bigger price drop.
const values = lines.flatMap((line) => line.points.map((point) => point.value));
const low = Math.log10(Math.min(...values) * 0.7);
const high = Math.log10(Math.max(...values) * 1.4);
const position = (value: number) => `${((Math.log10(value) - low) / (high - low)) * 100}%`;
const ticks = [0.01, 0.03, 0.1, 0.3, 1, 3, 10, 30, 100].filter((tick) => Math.log10(tick) > low && Math.log10(tick) < high);

const times = (multiplier: number) =>
  `${new Intl.NumberFormat('en', { maximumFractionDigits: multiplier < 10 ? 1 : 0 }).format(multiplier)}×`;
const day = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const month = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en', {
  month: 'long', timeZone: 'UTC', ...(date.slice(0, 4) === snapshot.fetchedAt.slice(0, 4) ? {} : { year: 'numeric' }),
});
const latest = (line: EfficiencyLine) => line.points.at(-1)!;

// The headline names the score whose price fell the most.
const biggest = lines
  .filter((line) => line.points.length > 1)
  .reduce<EfficiencyLine | null>((best, line) => !best || costMultiplier(line, latest(line)) > costMultiplier(best, latest(best)) ? line : best, null);

export function Efficiency() {
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => { document.title = 'Atlas · Efficiency'; }, []);

  return (
    <div className="grid h-dvh grid-rows-[var(--header-height)_minmax(0,1fr)_auto] phone:block phone:h-auto">
      <a href="#efficiency-workspace" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-40 focus:rounded-md focus:bg-panel focus:p-3">Skip to efficiency</a>
      <SiteHeader current="efficiency" />
      <main
        id="efficiency-workspace"
        tabIndex={-1}
        className="efficiency-workspace mx-7 mt-6 mb-2 min-h-0 min-w-0 overflow-y-auto rounded-[14px] bg-panel px-7 pt-6 pb-5 [outline:none] [scrollbar-width:thin] short:mt-4 compact:mx-5 mobile:mx-4 mobile:mt-4 mobile:mb-0 phone:overflow-visible phone:px-4 phone:pt-5"
      >
        <h1 className="display m-0 max-w-[26ch] text-[30px] leading-[1.1] text-balance phone:text-[24px]">
          {biggest
            ? `Reaching ${biggest.threshold} on the Intelligence index costs ${times(costMultiplier(biggest, latest(biggest)))} less than in ${month(biggest.points[0]!.date)}.`
            : 'The cheapest model at each Intelligence index score.'}
        </h1>
        <p className="mt-2 mb-0 max-w-[72ch] text-[13px] leading-5 text-pretty text-fg-2">
          Each arrow runs from the first model to reach a score to the cheapest one today, in API cost per Intelligence index task. Prices are today's, ordered by release date. Open a row for every record.
        </p>
        <p className="mt-3 mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-fg-2" aria-hidden="true">
          <span className="inline-flex items-center gap-1.5"><span className="ladder-dot ladder-first" />First record</span>
          <span className="inline-flex items-center gap-1.5"><span className="ladder-dot ladder-between" />Records in between</span>
          <span className="inline-flex items-center gap-1.5"><span className="ladder-dot ladder-now" />Cheapest today</span>
        </p>
        <div className="ladder">
          <div className="ladder-grid" aria-hidden="true">
            <span />
            <div className="ladder-axis">
              {ticks.map((tick) => <span key={tick} style={{ left: position(tick) }}>{format(tick, 'cost', true)}</span>)}
            </div>
          </div>
          {lines.map((line) => (
            <Rung key={line.threshold} line={line} open={open === line.threshold}
              toggle={() => setOpen((current) => current === line.threshold ? null : line.threshold)} />
          ))}
        </div>
      </main>
      <footer className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1 px-7 py-3 text-[12px] leading-5 text-fg-3 short:py-2 compact:px-5 mobile:px-4 phone:pt-5 phone:pb-[calc(20px+env(safe-area-inset-bottom))]">
        <span>
          Data from{' '}
          <a href={source} className="underline-offset-4 hover:text-accent hover:underline">Artificial Analysis</a>
        </span>
        <span>Snapshot captured <time dateTime={snapshot.fetchedAt}>{formatUtcDate(snapshot.fetchedAt, 'short')}</time></span>
      </footer>
    </div>
  );
}

/** One score's price history: an arrow from its first record to its cheapest model today. */
function Rung({ line, open, toggle }: { line: EfficiencyLine; open: boolean; toggle: () => void }) {
  const score = `Score ≥ ${line.threshold}`;
  if (!line.points.length)
    return (
      <div className="ladder-grid ladder-row">
        <span className="ladder-score">{score}</span>
        <span className="text-[12px] text-fg-2">No model reaches this score yet.</span>
      </div>
    );
  const first = line.points[0]!;
  const now = latest(line);
  const multiplier = costMultiplier(line, now);
  const change = line.points.length > 1
    ? <><b>{times(multiplier)}</b> cheaper <span className="text-fg-3">in {elapsedTimeSinceFirstRecord(line, now)}</span></>
    : <span className="text-fg-3">First record</span>;
  const id = `efficiency-records-${line.threshold}`;
  return (
    <div className={`ladder-row${open ? ' ladder-open' : ''}`}>
      <button
        className="ladder-grid ladder-toggle"
        aria-expanded={open}
        aria-controls={id}
        onClick={toggle}
        aria-label={line.points.length > 1
          ? `${score}: ${format(first.value, 'cost')} to ${format(now.value, 'cost')}, ${times(multiplier)} cheaper in ${elapsedTimeSinceFirstRecord(line, now)}`
          : `${score}: ${format(now.value, 'cost')}, first record`}
      >
        <span className="ladder-score">{score}</span>
        <span className="ladder-track" aria-hidden="true">
          {line.points.length > 1 && <span className="ladder-arrow" style={{ left: `calc(${position(now.value)} + 8px)`, right: `calc(100% - ${position(first.value)})` } as CSSProperties} />}
          {line.points.slice(1, -1).map((point) => <span key={point.model.id} className="ladder-dot ladder-between" style={{ left: position(point.value) }} />)}
          {line.points.length > 1 && <span className="ladder-dot ladder-first" style={{ left: position(first.value) }} />}
          <span className="ladder-dot ladder-now" style={{ left: position(now.value) }} />
          <span className="ladder-price ladder-price-now" style={{ left: position(now.value) }}>{format(now.value, 'cost')}</span>
          {line.points.length > 1 && <span className="ladder-price" style={{ left: position(first.value) }}>{format(first.value, 'cost')}</span>}
        </span>
        <span className="ladder-change">
          {change}
          <ChevronDown size={14} aria-hidden="true" className={`ml-1 shrink-0 text-fg-3 ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>
      {open && (
        <ol id={id} className="ladder-records" aria-label={`${score} records`}>
          {line.points.map((point) => (
            <li key={point.model.id}>
              <time dateTime={point.date}>{day(point.date)}</time>
              <span><b>{shortName(point.model)}</b> <span className="text-fg-3">{point.model.effortLabel}</span></span>
              <b className={point === now ? 'text-accent' : undefined}>{format(point.value, 'cost')}</b>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
