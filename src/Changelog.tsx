import { useEffect, useState } from 'react';
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

function formatValue(value: FieldChange['before'], field: FieldChange['field']) {
  if (value === null) return 'Not available';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value !== 'number') return value;
  // Keep the original precision so small measurement changes remain distinguishable.
  const number = String(value);
  if (['cost', 'costTotal', 'inputPrice', 'outputPrice'].includes(field)) return `$${number}`;
  if (field === 'speed') return `${number} tok/s`;
  if (field === 'time') return `${number}s`;
  return number;
}

export function Changelog({ history = bundledHistory }: { history?: ChangeHistory }) {
  const [filter, setFilter] = useState<(typeof filters)[number]['id']>('added');
  useEffect(() => {
    document.title = 'Atlas · Changelog';
  }, []);
  const updates = history.updates
    .map((batch) => ({
      ...batch,
      changes: batch.changes.filter((change) => filter === 'all' || change.kind === filter),
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
              ? `Data checked ${formatUtcDateTime(latest.checkedAt)}`
              : `Baseline snapshot ${formatUtcDate(history.baselineFetchedAt)}`}
          </span>
        </div>
        <div
          role="group"
          aria-label="Filter model changes"
          className="mt-5 inline-flex flex-wrap gap-0.5 rounded-lg bg-surface p-0.5"
        >
          {filters.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              aria-pressed={filter === id}
              className="min-h-9 rounded-md px-3.5 text-[13px] text-fg-2 aria-pressed:bg-panel aria-pressed:font-[550] aria-pressed:text-accent aria-pressed:shadow-[var(--shadow-raised)] [&:hover]:text-fg phone:px-2.5"
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
              ? 'No changes match this filter.'
              : `No changes recorded yet. History starts with the ${formatUtcDate(history.baselineFetchedAt)} snapshot. New entries appear when a data update is published.`}
          </p>
        )}
        {updates.map((batch) => (
          <section
            key={batch.checkedAt}
            className="mt-9"
            aria-label={`Changes checked ${formatUtcDateTime(batch.checkedAt)}`}
          >
            <h2 className="mb-3 flex flex-wrap items-baseline gap-x-3 text-[15px] font-[600] tracking-[-0.2px]">
              <time dateTime={batch.checkedAt}>{formatUtcDateTime(batch.checkedAt)}</time>{' '}
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
                className="grid grid-cols-[80px_minmax(0,1fr)] gap-5 border-t border-line py-4 phone:grid-cols-[72px_minmax(0,1fr)] phone:gap-3"
              >
                <span className="mt-0.5">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-[600] ${kindStyles[change.kind]}`}>
                    {kindLabels[change.kind]}
                  </span>
                </span>
                <div className="min-w-0">
                  <h3 className="text-[14px] font-[550] leading-6">
                    {change.name}
                    <span className="ml-2 text-[12px] font-normal text-fg-2">{change.effortLabel}</span>
                  </h3>
                  {change.kind !== 'updated' && (
                    <p className="mt-0.5 mb-0 text-[12px] text-fg-2">
                      {change.kind === 'added' ? 'New benchmark entry' : 'No longer present in the source'}
                    </p>
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
                        {change.fields.map(({ field, before, after }) => (
                          <tr key={field} className="border-t border-line align-top">
                            <th
                              scope="row"
                              className="px-3 py-1.5 font-normal text-fg-2 [overflow-wrap:anywhere]"
                            >
                              {fieldLabels[field]}
                            </th>
                            <td className="py-1.5 pr-3 text-fg-2 [overflow-wrap:anywhere]">
                              {formatValue(before, field)}
                            </td>
                            <td className="py-1.5 pr-3 font-[550] [overflow-wrap:anywhere]">{formatValue(after, field)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </article>
            ))}
            <p className="mt-2 mb-0 text-[11px] leading-5 text-fg-3">
              Source snapshot {formatUtcDateTime(batch.fetchedAt)}
            </p>
          </section>
        ))}
        <footer className="mt-10 border-t border-line pt-4 text-[12px] leading-6 text-fg-2">
          Data from{' '}
          <a href={history.source} target="_blank" rel="noreferrer" className="underline underline-offset-4">
            Artificial Analysis
          </a>
          . This page shows published data updates.
        </footer>
      </main>
    </div>
  );
}
