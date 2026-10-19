import { Moon, Sun } from 'lucide-react';
import { useTheme } from './useTheme';

export function ThemeToggle({ className, showTitle = false }: { className: string; showTitle?: boolean }) {
  const [theme, setTheme] = useTheme();
  const label = `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`;

  return (
    <button
      className={className}
      aria-label={label}
      title={showTitle ? label : undefined}
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      {theme === 'dark' ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
    </button>
  );
}
