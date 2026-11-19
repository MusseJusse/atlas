import { Brand } from './Brand';
import { ThemeToggle } from './ThemeToggle';

type Section = 'benchmarks' | 'efficiency' | 'vibes' | 'changelog';

const sections = [
  { id: 'benchmarks', label: 'Benchmarks', href: '/' },
  { id: 'efficiency', label: 'Efficiency', href: '?page=efficiency' },
  { id: 'vibes', label: 'Vibes', href: '?page=vibes' },
  { id: 'changelog', label: 'Changelog', href: '?page=changelog' },
] as const satisfies readonly { id: Section; label: string; href: string }[];

// The current section's bar sits on the header rule, marking where you are on the site.
const item =
  'relative flex h-full items-center text-[14px] font-[500] max-[420px]:text-[13px] max-[360px]:text-[12px] text-fg-2 hover:text-fg aria-[current=page]:text-fg aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-0 aria-[current=page]:after:-bottom-px aria-[current=page]:after:h-0.5 aria-[current=page]:after:bg-accent';

/** One header for every page, so navigation stays in the same place. */
export function SiteHeader({
  current,
  onCurrent,
}: {
  current: Section;
  /** Replaces the current section's link, for pages that reset themselves without reloading. */
  onCurrent?: () => void;
}) {
  return (
    <header className="flex h-[var(--header-height)] items-center gap-10 border-b border-line px-7 compact:gap-8 compact:px-5 mobile:sticky mobile:top-0 mobile:z-[8] mobile:gap-6 mobile:bg-bg mobile:px-4 phone:gap-3 phone:px-3 max-[360px]:gap-2">
      <Brand />
      <nav aria-label="Sections" className="flex h-full min-w-0 items-stretch gap-7 phone:gap-3.5 max-[360px]:gap-2.5">
        {sections.map((section) =>
          section.id === current && onCurrent ? (
            <button key={section.id} className={item} aria-current="page" onClick={onCurrent}>
              {section.label}
            </button>
          ) : (
            <a
              key={section.id}
              href={section.href}
              className={item}
              aria-current={section.id === current ? 'page' : undefined}
            >
              {section.label}
            </a>
          ),
        )}
      </nav>
      <ThemeToggle
        className="ml-auto flex size-10 shrink-0 items-center justify-center rounded-md text-fg-2 hover:bg-hover hover:text-accent"
        showTitle
      />
    </header>
  );
}
