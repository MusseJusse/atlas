import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import historyData from './data/changelog.json';
import { fieldLabels, type ChangeHistory, type ChangeKind, type FieldChange } from './data/changelog';
import { useTheme } from './useTheme';

const filters = [
  { id: 'all', label: 'All changes' },
  { id: 'added', label: 'Added' },
  { id: 'updated', label: 'Updated' },
  { id: 'removed', label: 'Removed' },
] as const;
const kindLabels: Record<ChangeKind, string> = { added: 'Added', updated: 'Updated', removed: 'Removed' };
// The sync command validates this JSON before committing it.
const bundledHistory = historyData as ChangeHistory;
const date = (value: string) =>
  new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
const checkedTime = (value: string) => `${date(value)}, ${new Date(value).toISOString().slice(11, 16)} UTC`;

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
  const [filter, setFilter] = useState<(typeof filters)[number]['id']>('all');
  const [theme, setTheme] = useTheme();
  useEffect(() => {
    document.title = 'Slopalytics · Changelog';
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
      <header className="flex min-h-[60px] items-center gap-6 border-b border-line px-7 phone:gap-3 phone:px-4">
        <a href="/" aria-label="Slopalytics home" className="shrink-0">
          <strong className="text-[24px] font-[450] tracking-[-1.2px] phone:text-[20px]">
            <span className="text-accent">slop</span>alytics
          </strong>
        </a>
        <nav
          aria-label="Sections"
          className="flex items-center gap-5 text-[12px] phone:gap-3 phone:text-[11px]"
        >
          <a href="/" className="flex min-h-11 items-center text-fg-2">
            Benchmarks
          </a>
          <a
            href="?page=changelog"
            aria-current="page"
            className="flex min-h-11 items-center text-fg underline decoration-accent underline-offset-8"
          >
            Changelog
          </a>
        </nav>
        <button
          className="ml-auto flex size-11 shrink-0 items-center justify-center text-fg-2 [&:hover]:text-fg"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
        </button>
      </header>
      <main className="mx-auto max-w-[1000px] px-7 pt-10 pb-12 phone:px-4 phone:pt-7">
        <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-2">
          <h1 className="m-0 text-[25px] font-medium tracking-[-0.7px] phone:text-[23px]">Model changes</h1>
          <span className="text-[12px] text-fg-2">
            {latest
              ? `Data checked ${checkedTime(latest.checkedAt)}`
              : `Baseline snapshot ${date(history.baselineFetchedAt)}`}
          </span>
        </div>
        <div
          role="group"
          aria-label="Filter model changes"
          className="mt-5 flex flex-wrap gap-x-6 gap-y-1 border-b border-line"
        >
          {filters.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              aria-pressed={filter === id}
              className="min-h-11 border-b-2 border-transparent text-[13px] text-fg-2 aria-pressed:border-accent aria-pressed:text-fg [&:hover]:text-fg"
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
              : `No changes recorded yet. History starts with the ${date(history.baselineFetchedAt)} snapshot. New entries appear when a data update is published.`}
          </p>
        )}
        {updates.map((batch) => (
          <section
            key={batch.checkedAt}
            className="mt-8"
            aria-label={`Changes checked ${checkedTime(batch.checkedAt)}`}
          >
            <h2 className="mb-3 text-[14px] font-medium">
              <time dateTime={batch.checkedAt}>{checkedTime(batch.checkedAt)}</time>{' '}
              <span className="ml-3 font-normal text-fg-2">
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
                className="grid grid-cols-[80px_minmax(0,1fr)] gap-5 border-t border-line py-5 phone:grid-cols-[58px_minmax(0,1fr)] phone:gap-3"
              >
                <span className="text-[12px] leading-6 text-fg-2">{kindLabels[change.kind]}</span>
                <div className="min-w-0">
                  <h3 className="text-[14px] font-medium leading-6">{change.name}</h3>
                  <p className="mt-0.5 mb-0 text-[12px] leading-5 text-fg-2">{change.effortLabel}</p>
                  {change.kind !== 'updated' && (
                    <p className="mt-2 mb-0 text-[12px] text-fg-2">
                      {change.kind === 'added' ? 'New benchmark entry' : 'No longer present in the source'}
                    </p>
                  )}
                  {change.fields.length > 0 && (
                    <table className="mt-3 w-full table-fixed border-collapse text-left text-[12px] leading-5">
                      <caption className="sr-only">
                        Changed values for {change.name}, {change.effortLabel}
                      </caption>
                      <thead className="text-fg-2">
                        <tr>
                          <th scope="col" className="w-[30%] pb-2 pr-3 font-normal">
                            Field
                          </th>
                          <th scope="col" className="w-[35%] pb-2 pr-3 font-normal">
                            Before
                          </th>
                          <th scope="col" className="pb-2 font-normal">
                            After
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {change.fields.map(({ field, before, after }) => (
                          <tr key={field} className="align-top">
                            <th
                              scope="row"
                              className="py-1 pr-3 font-normal text-fg-2 [overflow-wrap:anywhere]"
                            >
                              {fieldLabels[field]}
                            </th>
                            <td className="py-1 pr-3 text-fg-2 [overflow-wrap:anywhere]">
                              {formatValue(before, field)}
                            </td>
                            <td className="py-1 [overflow-wrap:anywhere]">{formatValue(after, field)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </article>
            ))}
            <p className="mt-2 mb-0 text-[11px] leading-5 text-fg-3">
              Source snapshot {checkedTime(batch.fetchedAt)}
            </p>
          </section>
        ))}
        <footer className="mt-10 border-t border-line pt-4 text-[12px] leading-6 text-fg-2">
          Data from{' '}
          <a
            href="https://artificialanalysis.ai/"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4"
          >
            Artificial Analysis
          </a>{' '}
          via{' '}
          <a href={history.source} target="_blank" rel="noreferrer" className="underline underline-offset-4">
            Slopalytics
          </a>
          . This page shows published data updates.
        </footer>
      </main>
    </div>
  );
}
