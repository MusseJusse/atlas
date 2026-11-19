import { useCallback, useState } from 'react';

/**
 * Track whether a horizontal scroller has more content past either edge.
 * Pass `ref` as the element's ref and `update` as its onScroll handler; resizes re-measure on their own.
 */
export function useScrollEdges() {
  const [edges, setEdges] = useState({ start: false, end: false });
  const update = useCallback((element: HTMLElement) => {
    const next = { start: element.scrollLeft > 1, end: element.scrollLeft + element.clientWidth < element.scrollWidth - 1 };
    setEdges((current) => current.start === next.start && current.end === next.end ? current : next);
  }, []);
  const ref = useCallback((element: HTMLElement | null) => {
    if (!element) return;
    const observer = new ResizeObserver(() => update(element));
    observer.observe(element);
    // The scroller's content can widen without the scroller itself resizing.
    if (element.firstElementChild) observer.observe(element.firstElementChild);
    return () => observer.disconnect();
  }, [update]);
  return [edges, update, ref] as const;
}
