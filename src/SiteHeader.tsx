import type { ReactNode } from 'react';
import { Brand } from './Brand';
import { ThemeToggle } from './ThemeToggle';

export function SiteHeader({ page, children }: { page: 'benchmarks' | 'efficiency' | 'changelog'; children?: ReactNode }) {
  return <header className="site-header">
    <Brand />
    <nav aria-label="Sections">
      <a href="/" aria-current={page === 'benchmarks' ? 'page' : undefined}>Benchmarks</a>
      <a href="?page=efficiency" aria-current={page === 'efficiency' ? 'page' : undefined}>Efficiency</a>
      <a href="?page=changelog" aria-current={page === 'changelog' ? 'page' : undefined}>Changelog</a>
    </nav>
    {children}
    <ThemeToggle className="ml-auto flex size-11 shrink-0 items-center justify-center rounded-md text-fg-2 hover:bg-hover" showTitle />
  </header>;
}
