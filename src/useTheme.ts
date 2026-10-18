import { useEffect, useState } from 'react';

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('benchmark-theme') === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#131c2b' : '#f1f4fa');
    try {
      localStorage.setItem('benchmark-theme', theme);
    } catch {
      /* The theme still works when storage is unavailable. */
    }
  }, [theme]);
  return [theme, setTheme] as const;
}
