import { useEffect, useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useMediaQuery } from './useMediaQuery';
import bundledHistory from 'virtual:changelog';
import { fieldLabels, type ChangeHistory, type ChangeKind, type FieldChange } from './data/changelog';
import { formatUtcDate, formatUtcDateTime } from './formatDate';
import { SiteHeader } from './SiteHeader';

const filters = [
  { id: 'all', label: 'All changes' },
  { id: 'added', label: 'Added' },
  { id: 'updated', label: 'Updated' },
  { id: 'removed', label: 'Removed' },
] as const;
const kindLabels: Record<ChangeKind, string> = { added: 'Added', updated: 'Updated', removed: 'Removed' };
const kindStyles: Record<ChangeKind, string> = {
  added: 'bg-positive-soft text-positive',
  updated: 'bg-accent-soft text-accent',
  removed: 'bg-negative-soft text-negative',
};

const dollarFields = new Set<FieldChange['field']>(['cost', 'costTotal', 'codingCost', 'codingCostTotal', 'inputPrice', 'outputPrice']);
const secondFields = new Set<FieldChange['field']>(['time', 'codingTime']);
// Rows for one model read from no reasoning up to max, not in source ID order.
const effortRank = ['non-reasoning', 'none', 'minimal', 'low', 'medium', 'default', 'high', 'xhigh', 'max'];

function formatValue(value: FieldChange['before'], field: FieldChange['field'], exact = true) {
  if (value === null) return 'Not available';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value !== 'number') return value;
  // Whole counts stay exact: rounding them saves no width and hides real differences.
  const number = String(exact || Number.isInteger(value) ? value : Number(value.toPrecision(6)));
  if (dollarFields.has(field)) return `$${number}`;
  if (field === 'speed') return `${number} tok/s`;
  if (secondFields.has(field)) return `${number}s`;
  return number;
}

/** Six significant figures fit phone columns; fall back to full precision when rounding would hide the change. */
function formatChange({ field, before, after }: FieldChange) {
  const rounded = [formatValue(before, field, false), formatValue(after, field, false)] as const;
  const exact = [formatValue(before, field), formatValue(after, field)] as const;
  return rounded[0] === rounded[1] && exact[0] !== exact[1] ? { rounded: exact, exact } : { rounded, exact };
}

/** Group each model's rows together, in first-seen order, then sort them by reasoning effort. */
function orderChanges<Change extends { name: string; effortLabel: string }>(changes: Change[]) {
  const firstSeen = new Map<string, number>();
  changes.forEach((change, index) => { if (!firstSeen.has(change.name)) firstSeen.set(change.name, index); });
  const rank = (change: Change) => effortRank.indexOf(change.effortLabel.toLowerCase());
  return changes.toSorted((a, b) => firstSeen.get(a.name)! - firstSeen.get(b.name)! || rank(a) - rank(b));
}

/** Wide screens show exact values. On phones the field name opens a full-width row with the exact pair. */
function FieldRow({ fieldChange, compact }: { fieldChange: FieldChange; compact: boolean }) {
  const [open, setOpen] = useState(false);
  const exactRow = useId();
  const { rounded, exact } = formatChange(fieldChange);
  const expandable = compact && (rounded[0] !== exact[0] || rounded[1] !== exact[1]);
  const shown = compact ? rounded : exact;
  const label = fieldLabels[fieldChange.field];
  // A dotted underline marks rounded values that open to their exact form.
  const value = (text: string) => expandable ? <span className="underline decoration-line-2 decoration-dotted underline-offset-4">{text}</span> : text;
  return (
    <>
      {/* The whole row is a tap target on phones; the field button gives keyboard and screen reader access. */}
      <tr className={`border-t border-line align-top${expandable ? ' cursor-pointer' : ''}`} onClick={expandable ? () => setOpen(!open) : undefined}>
        <th scope="row" className="px-3 py-1.5 font-normal text-fg-2 [overflow-wrap:anywhere]">
          {expandable ? (
            <button
              aria-expanded={open}
              aria-controls={exactRow}
              onClick={(event) => { event.stopPropagation(); setOpen(!open); }}
              className="inline-flex items-start gap-1 text-left hover:text-fg"
            >
              {label}
              <ChevronDown size={12} aria-hidden="true" className={`mt-1 shrink-0${open ? ' rotate-180' : ''}`} />
            </button>
          ) : label}
        </th>
        <td className="py-1.5 pr-3 text-fg-2 [overflow-wrap:break-word]">{value(shown[0])}</td>
        <td className="py-1.5 pr-3 font-[550] [overflow-wrap:break-word]">{value(shown[1])}</td>
      </tr>
      {expandable && (
        <tr id={exactRow} hidden={!open}>
          <td colSpan={3} className="px-3 pb-2 text-fg-2 [overflow-wrap:anywhere]">
            Exact {exact[0]} <span aria-hidden="true">→</span><span className="sr-only">to</span> <span className="font-[550] text-fg">{exact[1]}</span>
          </td>
        </tr>
      )}
    </>
  );
}

export function Changelog({ history = bundledHistory }: { history?: ChangeHistory }) {
  // Each snapshot updates hundreds of speed readings, so new models would sink below them under All changes.
  const [filter, setFilter] = useState<(typeof filters)[number]['id']>('added');
  const compact = useMediaQuery('(width <= 600px)');
  useEffect(() => {
    document.title = 'Atlas · Changelog';
  }, []);
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
      <SiteHeader current="changelog" />
      <main className="mx-4 my-6 max-w-[1000px] rounded-[14px] bg-panel px-8 pt-8 pb-10 min-[1032px]:mx-auto phone:px-4 phone:pt-6">
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
          className="mt-5 inline-flex gap-0.5 rounded-lg bg-track p-0.5 phone:flex max-[360px]:grid! max-[360px]:grid-cols-2"
        >
          {filters.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              aria-pressed={filter === id}
              className="min-h-9 rounded-md px-3.5 text-[13px] font-[500] whitespace-nowrap text-fg-2 aria-pressed:bg-thumb aria-pressed:text-accent aria-pressed:shadow-[var(--shadow-raised)] [&:hover]:text-fg phone:min-h-10 phone:flex-auto phone:px-2"
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
                <span className={filter === 'all' ? 'mt-0.5 phone:mt-0 phone:mb-1' : 'sr-only'}>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-[600] ${kindStyles[change.kind]}`}>
                    {kindLabels[change.kind]}
                  </span>
                </span>
                <div className="min-w-0">
                  <h3 className="text-[14px] font-[550] leading-6">
                    {change.name}
                    <span className="ml-2 text-[12px] font-normal text-fg-2">{change.effortLabel.toLowerCase()}</span>
                  </h3>
                  {change.kind === 'removed' && (
                    <p className="mt-0.5 mb-0 text-[12px] text-fg-2">No longer listed on Artificial Analysis</p>
                  )}
                  {change.fields.length > 0 && (
                    <table className="mt-3 w-full table-fixed border-collapse overflow-hidden rounded-md bg-surface text-left text-[12px] leading-5">
                      <caption className="sr-only">
                        Changed values for {change.name}, {change.effortLabel}
                      </caption>
                      <thead className="text-fg-2">
                        <tr>
                          <th scope="col" className="w-[30%] px-3 pt-2 pb-1.5 font-normal">
                            Field
                          </th>
                          <th scope="col" className="w-[35%] pt-2 pr-3 pb-1.5 font-normal">
                            Before
                          </th>
                          <th scope="col" className="pt-2 pr-3 pb-1.5 font-normal">
                            After
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {change.fields.map((fieldChange) => <FieldRow key={fieldChange.field} fieldChange={fieldChange} compact={compact} />)}
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
        <footer className="mt-10 border-t border-line pt-4 text-[12px] leading-6 text-fg-2">
          Data from{' '}
          <a href={history.source} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-accent">
            Artificial Analysis
          </a>
          . Lists changes between published snapshots.
        </footer>
      </main>
    </div>
  );
}
