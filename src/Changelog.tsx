import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import bundledHistory from 'virtual:changelog';
import { fieldLabels, type ChangeHistory, type ChangeKind, type FieldChange } from './data/changelog';
import { formatUtcDate, formatUtcDateTime } from './formatDate';
import { SiteHeader } from './SiteHeader';
import { usePage } from './usePage';
import { shortName } from './model-presentation';
import { format } from './formatModel';
import { segment, segments } from './segments';

const filters = [
  { id: 'all', label: 'All changes' },
  { id: 'added', label: 'Added' },
  { id: 'updated', label: 'Updated' },
  { id: 'removed', label: 'Removed' },
] as const;
const kindLabels: Record<ChangeKind, string> = { added: 'Added', updated: 'Updated', removed: 'Removed' };
const kindStyles: Record<ChangeKind, string> = {
  added: 'text-positive',
  updated: 'text-accent',
  removed: 'text-negative',
};

const dollarFields = new Set<FieldChange['field']>(['cost', 'costTotal', 'codingCost', 'codingCostTotal', 'inputPrice', 'outputPrice']);
const secondFields = new Set<FieldChange['field']>(['time', 'codingTime']);
// Rows for one model read from no reasoning up to max, not in source ID order.
const effortRank = ['non-reasoning', 'none', 'minimal', 'low', 'medium', 'default', 'high', 'xhigh', 'max'];

/**
 * `extra` adds digits beyond the default rounding; omit it for the exact value.
 * By default times read as durations like the charts ("24m 13s"), speeds keep one decimal,
 * and other numbers keep four significant figures, or whole numbers from 1,000 up.
 */
function formatValue(value: FieldChange['before'], field: FieldChange['field'], extra?: number) {
  if (value === null) return 'Not available';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value !== 'number') return value;
  if (extra === 0 && secondFields.has(field)) return format(value, 'time');
  // Whole counts stay exact: rounding them saves no width and hides real differences.
  const number = extra === undefined || Number.isInteger(value)
    ? String(value)
    : secondFields.has(field) || field === 'speed'
      ? value.toFixed(extra + (field === 'speed' ? 1 : 0))
      : String(Math.abs(value) >= 1000 && extra === 0 ? Math.round(value) : Number(value.toPrecision(4 + extra)));
  if (dollarFields.has(field)) return `$${number}`;
  if (field === 'speed') return `${number} tok/s`;
  if (secondFields.has(field)) return `${number}s`;
  return number;
}

/** Rounded values fit every column. When rounding hides the change, add digits until it shows, up to four more. */
function formatChange({ field, before, after }: FieldChange) {
  const exact = [formatValue(before, field), formatValue(after, field)] as const;
  for (let extra = 0; extra <= 4; extra++) {
    const rounded = [formatValue(before, field, extra), formatValue(after, field, extra)] as const;
    if (rounded[0] !== rounded[1] || exact[0] === exact[1]) return { rounded, exact };
  }
  return { rounded: exact, exact };
}

/** Group each model's rows together, in first-seen order, then sort them by reasoning effort. */
function orderChanges<Change extends { name: string; effortLabel: string }>(changes: Change[]) {
  const firstSeen = new Map<string, number>();
  changes.forEach((change, index) => { if (!firstSeen.has(change.name)) firstSeen.set(change.name, index); });
  const rank = (change: Change) => effortRank.indexOf(change.effortLabel.toLowerCase());
  return changes.toSorted((a, b) => firstSeen.get(a.name)! - firstSeen.get(b.name)! || rank(a) - rank(b));
}

/** Values show rounded. When that rounds anything, the field name opens a full-width row with the exact pair. */
function FieldRow({ fieldChange }: { fieldChange: FieldChange }) {
  const [open, setOpen] = useState(false);
  const exactRow = useId();
  const { rounded, exact } = formatChange(fieldChange);
  const expandable = rounded[0] !== exact[0] || rounded[1] !== exact[1];
  const label = fieldLabels[fieldChange.field];
  // Numbers keep their unit on one line on phones; text values such as IDs wrap anywhere instead.
  const wrap = [fieldChange.before, fieldChange.after].some((value) => typeof value === 'string')
    ? '[overflow-wrap:anywhere]' : '[overflow-wrap:break-word] phone:whitespace-nowrap';
  // A dotted underline marks rounded values that open to their exact form.
  const value = (text: string) => expandable ? <span className="underline decoration-line-2 decoration-dotted underline-offset-4">{text}</span> : text;
  return (
    <>
      {/* The whole row is a click target; the field button gives keyboard and screen reader access. */}
      <tr className={`border-t border-line align-top${expandable ? ' cursor-pointer hover:bg-hover' : ''}`} onClick={expandable ? () => setOpen(!open) : undefined}>
        <th scope="row" className="px-3 py-1.5 font-normal text-fg-2 [overflow-wrap:anywhere] max-[360px]:px-2">
          {expandable ? (
            <button
              aria-expanded={open}
              aria-controls={exactRow}
              onClick={(event) => { event.stopPropagation(); setOpen(!open); }}
              className="text-left hover:text-fg"
            >
              {/* The chevron rides on the last word, so it never takes width from the value columns.
                  A one-word name may still break inside itself when the column is too narrow. */}
              {label.slice(0, label.lastIndexOf(' ') + 1)}
              <span className={label.includes(' ') ? 'whitespace-nowrap' : undefined}>
                {label.slice(label.lastIndexOf(' ') + 1)}
                <ChevronDown size={12} aria-hidden="true" className={`ml-0.5 inline align-[-1px]${open ? ' rotate-180' : ''}`} />
              </span>
            </button>
          ) : label}
        </th>
        <td className={`py-1.5 pr-3 text-right text-fg-2 tabular-nums ${wrap} max-[360px]:pr-2`}>{value(rounded[0])}</td>
        <td className={`py-1.5 pr-3 text-right font-[550] tabular-nums ${wrap} max-[360px]:pr-2`}>
          {value(rounded[1])}
        </td>
      </tr>
      {expandable && (
        <tr id={exactRow} hidden={!open}>
          <td colSpan={3} className="px-3 pb-2 max-[360px]:px-2">
            {/* Each exact value keeps its unit on its own line, with the same before and after labels as the header. */}
            <dl className="m-0 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 tabular-nums">
              <dt className="text-fg-2">Before</dt>
              <dd className="m-0 text-fg-2 [overflow-wrap:anywhere]">{exact[0]}</dd>
              <dt className="text-fg-2">After</dt>
              <dd className="m-0 font-[550] [overflow-wrap:anywhere]">{exact[1]}</dd>
            </dl>
          </td>
        </tr>
      )}
    </>
  );
}

export function Changelog({ history = bundledHistory }: { history?: ChangeHistory }) {
  // Each snapshot updates hundreds of speed readings, so new models would sink below them under All changes.
  const [filter, setFilter] = useState<(typeof filters)[number]['id']>('added');
  usePage('Atlas · Changelog');
  const updates = history.updates
    .map((batch) => ({
      ...batch,
      changes: orderChanges(batch.changes.filter((change) => filter === 'all' || change.kind === filter)),
    }))
    .filter((batch) => batch.changes.length > 0);
  const latest = history.updates[0];
  const changeCount = updates.reduce((total, batch) => total + batch.changes.length, 0);

  return (
    <div className="min-h-dvh select-text">
      <a
        href="#changelog-workspace"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-40 focus:rounded-md focus:bg-panel focus:p-3"
      >
        Skip to changelog
      </a>
      <SiteHeader current="changelog" />
      <main
        id="changelog-workspace"
        tabIndex={-1}
        className="mx-4 mt-6 max-w-[1000px] rounded-[14px] bg-panel px-8 pt-8 pb-10 [outline:none] min-[1032px]:mx-auto phone:px-4 phone:pt-6"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-2">
          <h1 className="display m-0 text-[30px] leading-[1.1] phone:text-[24px]">Model changes</h1>
          <span className="text-[12px] text-fg-2">
            {latest
              ? `Data checked ${formatUtcDateTime(latest.checkedAt, 'short')}`
              : `Baseline snapshot ${formatUtcDate(history.baselineFetchedAt)}`}
          </span>
        </div>
        <div
          role="group"
          aria-label="Filter model changes"
          className={`${segments} mt-5 w-fit phone:w-auto max-[360px]:grid! max-[360px]:grid-cols-2`}
        >
          {filters.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              aria-pressed={filter === id}
              className={segment}
            >
              {label}
            </button>
          ))}
        </div>
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {changeCount} {changeCount === 1 ? 'change' : 'changes'} shown
        </div>
        {!updates.length && (
          <p className="my-10 max-w-[65ch] text-[14px] leading-7 text-fg-2">
            {history.updates.length
              ? 'No changes match this filter. Choose another filter or All changes.'
              : `No changes recorded yet. History starts with the ${formatUtcDate(history.baselineFetchedAt)} snapshot. Entries appear after the next data update.`}
          </p>
        )}
        {updates.map((batch) => (
          <section
            key={batch.checkedAt}
            className="mt-9"
            aria-label={`Changes checked ${formatUtcDateTime(batch.checkedAt)}`}
          >
            <h2 className="mb-3 flex flex-wrap items-baseline gap-x-3 text-[15px] font-[600] tracking-[-0.2px]">
              <time dateTime={batch.checkedAt}>{formatUtcDateTime(batch.checkedAt, 'short')}</time>{' '}
              <span className="text-[13px] font-normal tracking-normal text-fg-2">
                {(['added', 'updated', 'removed'] as const)
                  .flatMap((kind) => {
                    const count = batch.changes.filter((change) => change.kind === kind).length;
                    return count ? [`${count} ${kind}`] : [];
                  })
                  .join(', ')}
              </span>
            </h2>
            {batch.changes.map((change) => (
              <article
                key={change.id}
                className={`grid gap-5 border-t border-line py-3.5 phone:gap-0 phone:py-2.5 ${filter === 'all' ? 'grid-cols-[80px_minmax(0,1fr)] phone:grid-cols-1' : 'grid-cols-1'}`}
              >
                {/* The filter already names the kind, so only "All changes" repeats it visually. */}
                <span className={filter === 'all' ? `text-[12px] leading-6 font-[600] phone:leading-5 ${kindStyles[change.kind]}` : 'sr-only'}>
                  {kindLabels[change.kind]}
                </span>
                <div className="min-w-0">
                  <h3 className="text-[14px] font-[550] leading-6">
                    {shortName(change)}{' '}
                    <span className="ml-1 text-[12px] font-normal text-fg-2">{change.effortLabel.toLowerCase()}</span>
                  </h3>
                  {change.kind === 'removed' && (
                    <p className="mt-0.5 mb-0 text-[12px] text-fg-2">No longer listed on Artificial Analysis</p>
                  )}
                  {change.fields.length > 0 && (
                    <table className="mt-3 w-full table-fixed border-collapse overflow-hidden rounded-md bg-surface text-left text-[12px] leading-5 max-[360px]:text-[11px]">
                      <caption className="sr-only">
                        Changed values for {shortName(change)}, {change.effortLabel}
                      </caption>
                      <thead className="text-fg-2">
                        <tr>
                          <th scope="col" className="w-[30%] px-3 pt-2 pb-1.5 font-normal phone:w-[38%] narrow:w-[28%]">
                            Field
                          </th>
                          <th scope="col" className="w-[35%] pt-2 pr-3 pb-1.5 text-right font-normal phone:w-[31%] narrow:w-[37%] max-[360px]:pr-2">
                            Before
                          </th>
                          <th scope="col" className="pt-2 pr-3 pb-1.5 text-right font-normal max-[360px]:pr-2">
                            After
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {change.fields.map((fieldChange) => <FieldRow key={fieldChange.field} fieldChange={fieldChange} />)}
                      </tbody>
                    </table>
                  )}
                </div>
              </article>
            ))}
            {formatUtcDateTime(batch.fetchedAt) !== formatUtcDateTime(batch.checkedAt) && (
              <p className="mt-2 mb-0 text-[12px] leading-5 text-fg-3">
                Source snapshot {formatUtcDateTime(batch.fetchedAt, 'short')}
              </p>
            )}
          </section>
        ))}
      </main>
      <footer className="mx-4 max-w-[1000px] py-3 text-[12px] leading-5 text-fg-3 min-[1032px]:mx-auto phone:pt-5 phone:pb-[calc(20px+env(safe-area-inset-bottom))]">
        Data from{' '}
        <a href={history.source} target="_blank" rel="noreferrer" className="underline-offset-4 hover:text-accent hover:underline">
          Artificial Analysis
        </a>
        . Lists changes between published snapshots.
      </footer>
    </div>
  );
}
