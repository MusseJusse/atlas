import { Brand } from './Brand';
import { ThemeToggle } from './ThemeToggle';
import { formatUtcDate } from './formatDate';

type Section = 'benchmarks' | 'efficiency' | 'changelog';

const sections = [
  { id: 'benchmarks', label: 'Benchmarks', href: '/' },
  { id: 'efficiency', label: 'Efficiency', href: '?page=efficiency' },
  { id: 'changelog', label: 'Changelog', href: '?page=changelog' },
] as const satisfies readonly { id: Section; label: string; href: string }[];

const item =
  'flex min-h-9 items-center rounded-md px-3 text-[13px] text-fg-2 hover:text-fg aria-[current=page]:bg-panel aria-[current=page]:font-[550] aria-[current=page]:text-fg aria-[current=page]:shadow-[var(--shadow-raised)] phone:px-2.5';

/** One header for every page, so navigation and the data date stay in the same place. */
export function SiteHeader({
  current,
  fetchedAt,
  onCurrent,
}: {
  current: Section;
  fetchedAt?: string;
  /** Replaces the current section's link, for pages that reset themselves without reloading. */
  onCurrent?: () => void;
}) {
  return (
    <header className="flex min-h-[var(--header-height)] items-center gap-8 border-b border-line px-7 compact:gap-6 compact:px-5 mobile:sticky mobile:top-0 mobile:z-[8] mobile:h-[var(--header-height)] mobile:gap-3 mobile:bg-bg/90 mobile:px-4 mobile:backdrop-blur-md">
      <Brand />
      <nav aria-label="Sections" className="flex items-center gap-0.5 rounded-lg bg-surface-2 p-1">
        {sections.map((section) =>
          section.id === current && onCurrent ? (
            <button key={section.id} className={`${item} phone:hidden`} aria-current="page" onClick={onCurrent}>
              {section.label}
            </button>
          ) : (
            <a
              key={section.id}
              href={section.href}
              className={`${item}${section.id === 'benchmarks' ? ' phone:hidden' : ''}`}
              aria-current={section.id === current ? 'page' : undefined}
            >
              {section.label}
            </a>
          ),
        )}
      </nav>
      <div className="ml-auto flex items-center gap-3">
        {fetchedAt && (
          <span
            className="inline-flex items-center gap-2 text-[12px] text-fg-2 mobile:hidden"
            title={`Local snapshot captured ${fetchedAt}`}
          >
            <span aria-hidden="true" className="size-1.5 rounded-full bg-positive" />
            <span>
              Data <time dateTime={fetchedAt}>{formatUtcDate(fetchedAt, 'short')}</time>
            </span>
          </span>
        )}
        <ThemeToggle
          className="flex size-10 shrink-0 items-center justify-center rounded-md text-fg-2 hover:bg-hover hover:text-accent"
          showTitle
        />
      </div>
    </header>
  );
}
