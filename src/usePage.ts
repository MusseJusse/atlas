import { useEffect } from 'react';

let navigated = false;

/** Call when an in-app link swaps pages, so the next page takes keyboard focus instead of leaving it on <body>. */
export function markNavigation() {
  navigated = true;
}

/** Sets the tab title, and after in-app navigation moves focus to the page's <main>. */
export function usePage(title: string) {
  useEffect(() => {
    document.title = title;
  }, [title]);
  useEffect(() => {
    if (!navigated) return;
    navigated = false;
    document.querySelector<HTMLElement>('main')?.focus({ preventScroll: true });
  }, []);
}
