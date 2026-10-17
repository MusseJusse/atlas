import { useEffect, useState } from 'react';

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('benchmark-theme') === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#000000' : '#ffffff');
    try {
      localStorage.setItem('benchmark-theme', theme);
    } catch {
      /* The theme still works when storage is unavailable. */
    }
  }, [theme]);
  return [theme, setTheme] as const;
}
