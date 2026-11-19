import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { views, type ViewId } from './models';
import { readView } from './state';

/** Select by section start, so even a section taller than the viewport can be active. */
export function chartAtLine<Id extends string>(
  sections: readonly { id: Id; top: number }[],
  line: number,
) {
  let active = sections[0]?.id;
  for (const section of sections) {
    if (section.top > line) break;
    active = section.id;
  }
  return active;
}

export function useChartNavigation(mobile: boolean) {
  const [active, setActive] = useState(() =>
    readView(typeof location === 'undefined' ? '' : location.search),
  );
  const feed = useRef<HTMLDivElement>(null);
  const chartNavigation = useRef<HTMLDivElement>(null);
  const [target, setTarget] = useState<{ id: ViewId } | null>(null);

  const navigate = useCallback((id: ViewId) => {
    setActive(id);
    setTarget({ id });
  }, []);

  // Popstate can restore filters too. Scroll after their chart heights have updated.
  useLayoutEffect(() => {
    if (target)
      document.getElementById(target.id)?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }, [target]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => navigate(readView(location.search)));
    return () => cancelAnimationFrame(frame);
  }, [navigate]);

  useEffect(() => {
    const navigation = chartNavigation.current?.querySelector<HTMLElement>('nav');
    const button = navigation?.querySelector<HTMLButtonElement>('[aria-current="page"]');
    if (!navigation || !button) return;
    const bounds = navigation.getBoundingClientRect();
    const rect = button.getBoundingClientRect();
    // Clear the 32px edge fade as well as the strip's edge, so the active tab never sits dimmed.
    const fade = 32;
    const offset = rect.left < bounds.left + fade
      ? Math.min(0, rect.left - bounds.left - fade)
      : Math.max(0, rect.right - bounds.right + fade);
    // Scroll only this strip, preserving the page's vertical scroll position.
    if (offset) navigation.scrollBy({ left: offset, behavior: 'instant' });
  }, [active, mobile]);

  useEffect(() => {
    const container = feed.current;
    const navigation = chartNavigation.current;
    if (!container || !navigation) return;
    const sections = views.flatMap(({ id }) => {
      const element = container.querySelector<HTMLElement>(`#${id}`);
      return element ? [{ id, element }] : [];
    });
    const scrollRoot = mobile ? window : container;
    let frame = 0;
    const track = () => {
      frame = 0;
      const bounds = container.getBoundingClientRect();
      // On phones, track below the sticky controls and respect the direct-scroll
      // landing position. Desktop charts switch as they pass the feed's midpoint.
      const margin = sections[0]
        ? parseFloat(getComputedStyle(sections[0].element).scrollMarginTop) || 0
        : 0;
      const line = mobile
        ? Math.max(navigation.getBoundingClientRect().bottom, margin) + 1
        : bounds.top + bounds.height / 2;
      const candidate = chartAtLine(
        sections.map(({ id, element }) => ({ id, top: element.getBoundingClientRect().top })),
        line,
      );
      if (candidate) setActive(candidate);
    };
    function schedule() {
      if (!frame) frame = requestAnimationFrame(track);
    }
    scrollRoot.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(container);
    observer.observe(navigation);
    sections.forEach(({ element }) => observer.observe(element));
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      scrollRoot.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      observer.disconnect();
    };
  }, [mobile]);

  return { active, navigate, feed, chartNavigation };
}
