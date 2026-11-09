import { Brand } from './Brand';
import { ThemeToggle } from './ThemeToggle';

export function SiteHeader({ page }: { page: 'benchmarks' | 'efficiency' | 'changelog' }) {
  return <header className="site-header">
    <Brand />
    <nav aria-label="Sections">
      <a href="/" aria-current={page === 'benchmarks' ? 'page' : undefined} className="phone:hidden">Benchmarks</a>
      <a href="?page=efficiency" aria-current={page === 'efficiency' ? 'page' : undefined}>Efficiency</a>
      <a href="?page=changelog" aria-current={page === 'changelog' ? 'page' : undefined}>Changelog</a>
    </nav>
    <ThemeToggle className="ml-auto flex size-11 shrink-0 items-center justify-center rounded-md text-fg-2 hover:bg-hover" showTitle />
  </header>;
}
