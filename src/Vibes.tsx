import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Code2, Coins, Monitor, PenLine, SearchCode } from 'lucide-react';
import snapshot from 'virtual:benchmarks';
import { ConfigurationDetails } from './charts/ConfigurationDetails';
import { ChoiceMenu } from './ChoiceMenu';
import { placeCard } from './charts/card-placement';
import { formatUtcDate } from './formatDate';
import { Selection } from './Selection';
import { SiteHeader } from './SiteHeader';
import { usePage } from './usePage';
import { useMediaQuery } from './useMediaQuery';
import { VibesChart } from './VibesChart';
import { axisDefinitions, reasoningGuidance, resolveVibes, type UseCaseIcon } from './data/vibes';
import { modelColor, shortName } from './model-presentation';
import { segment, segments } from './segments';
import type { Model } from './models';

type VibeSelection = {
  family: string;
  useCaseId: string | null;
};


const iconMap: Record<UseCaseIcon, typeof Code2> = {
  coding: Code2,
  copywriting: PenLine,
  'digging-deep': SearchCode,
  cheap: Coins,
  'computer-use': Monitor,
};

export function Vibes() {
  const vibes = useMemo(() => resolveVibes(snapshot.models), []);
  const phone = useMediaQuery('(max-width: 600px)');
  const [hovered, setHovered] = useState<VibeSelection | null>(null);
  const [pinned, setPinned] = useState<VibeSelection | null>(null);
  const [showBenchmarks, setShowBenchmarks] = useState(false);
  const [showCost, setShowCost] = useState(false);
  const [plotSize, setPlotSize] = useState({ width: 960, height: 520 });
  const chartRef = useRef<HTMLDivElement>(null);
  const picksRef = useRef<HTMLDivElement>(null);
  const pickMenuRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLElement>(null);
  const belowCardRef = useRef<HTMLElement>(null);

  usePage('Atlas · Vibes');

  useLayoutEffect(() => {
    const element = chartRef.current;
    if (!element) return;
    const resize = () => {
      const width = Math.round(element.clientWidth);
      const height = Math.round(element.clientHeight);
      if (width > 0 && height > 0) {
        setPlotSize((current) => (current.width === width && current.height === height ? current : { width, height }));
      }
    };
    resize();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Pin takes precedence over hover, matching Benchmarks and Efficiency.
  const active = pinned ?? hovered;
  const activeEntry = active ? vibes.byFamily.get(active.family) ?? null : null;
  const activeUseCase = active?.useCaseId
    ? vibes.recommendations.find((item) => item.id === active.useCaseId) ?? null
    : null;
  const isPinned = pinned !== null;
  const pinnedPick = pinned?.useCaseId ? vibes.recommendations.find((item) => item.id === pinned.useCaseId) ?? null : null;
  const detailsBelow = phone;

  const compactCard = plotSize.width < 760 ? { width: 200, padding: 12 } : {};
  const corners = {
    'bottom-right': { right: 20, bottom: 62, maxHeight: 'calc(100% - 70px)', ...compactCard },
    'top-left': { left: 48, top: 44, maxHeight: 'calc(100% - 52px)', ...compactCard },
    'top-right': {
      right: 20,
      top: showCost ? 52 : 44,
      maxHeight: `calc(100% - ${showCost ? 60 : 52}px)`,
      ...compactCard,
    },
    'bottom-left': { left: 48, bottom: 62, maxHeight: 'calc(100% - 70px)', ...compactCard },
  } satisfies Record<string, CSSProperties>;
  const [placement, setPlacement] = useState<CSSProperties>(corners['bottom-right']);

  useEffect(() => {
    // On phones, reveal a card pinned below the fold and follow focus from the chart or the picks into it,
    // so focus never stays on a control that scrolled out of view.
    if (!detailsBelow || !isPinned || !belowCardRef.current) return;
    belowCardRef.current.scrollIntoView({ block: 'nearest' });
    const from = document.activeElement;
    if ([chartRef, picksRef, pickMenuRef].some((ref) => ref.current?.contains(from))) belowCardRef.current.focus({ preventScroll: true });
  }, [detailsBelow, isPinned, pinned?.family, pinned?.useCaseId]);

  useLayoutEffect(() => {
    const card = overlayRef.current;
    const plot = chartRef.current;
    if (detailsBelow || !card || !plot || !activeEntry) return;
    const bounds = plot.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;

    const points = [...plot.querySelectorAll<SVGGElement>('g[data-vibe-family]')].flatMap((group) => {
      const dot = group.querySelector<SVGCircleElement>('[data-vibe-dot]');
      if (!dot) return [];
      const box = dot.getBoundingClientRect();
      return [
        {
          x: box.x + box.width / 2 - bounds.x,
          y: box.y + box.height / 2 - bounds.y,
          selected: group.dataset.vibeFamily === activeEntry.family,
        },
      ];
    });
    const labels = [...plot.querySelectorAll<SVGTextElement>('[data-vibe-label], [data-vibe-sublabel]')].map(
      (element) => {
        const box = element.getBoundingClientRect();
        return {
          left: box.left - bounds.x,
          right: box.right - bounds.x,
          top: box.top - bounds.y,
          bottom: box.bottom - bounds.y,
        };
      },
    );

    const next = placeCard({
      corners: Object.values(corners),
      points,
      labels,
      plot: bounds,
      card: { width: card.offsetWidth, height: card.offsetHeight },
      compact: compactCard,
    });
    setPlacement((current) => (JSON.stringify(current) === JSON.stringify(next) ? current : next));
  }, [detailsBelow, activeEntry?.family, activeUseCase?.id, isPinned, showCost, showBenchmarks, plotSize.width, plotSize.height]);

  function clearSelection(restoreFocus = false) {
    const previous = pinned;
    const detailsElement = detailsBelow ? belowCardRef.current : overlayRef.current;
    const focusInDetails =
      typeof document !== 'undefined' &&
      detailsElement !== null &&
      detailsElement.contains(document.activeElement);
    // Restore focus before clearing state so synchronous onFocus on the SVG point doesn't re-open a preview.
    if (previous && (restoreFocus || focusInDetails)) {
      if (previous.useCaseId) {
        // Phones pick use cases from a menu instead of the row, so focus returns to its button.
        const pick = picksRef.current?.querySelector<HTMLButtonElement>(`button[data-use-case="${previous.useCaseId}"]`);
        const trigger = pick?.checkVisibility() ? pick : pickMenuRef.current?.querySelector('summary');
        trigger?.focus({ preventScroll: true });
        if (detailsBelow) trigger?.scrollIntoView({ block: 'nearest' });
      } else {
        const trigger = chartRef.current?.querySelector<SVGGElement>(`g[data-vibe-family="${previous.family}"]`);
        trigger?.focus({ preventScroll: true });
        if (detailsBelow) trigger?.scrollIntoView({ block: 'center' });
      }
    }
    setPinned(null);
    setHovered(null);
  }

  function togglePinModel(family: string) {
    setHovered(null);
    setPinned((current) => (current?.family === family ? null : { family, useCaseId: null }));
  }

  function togglePinUseCase(id: string, family: string) {
    setHovered(null);
    setPinned((current) => (current?.useCaseId === id ? null : { family, useCaseId: id }));
  }

  const detailsContent = activeEntry && (
    <ConfigurationDetails
      model={activeEntry.model}
      metric="cost"
      pinned={isPinned}
      onClose={() => clearSelection(true)}
      summary={
        <>
          {activeEntry.useCases.length > 0 && (
            <p className="mt-2.5 mb-0 text-[12px] leading-5 text-fg-2">
              Best for{' '}
              {activeEntry.useCases.map((useCase, index) => (
                <span key={useCase.id}>
                  {index > 0 && ', '}
                  <span className={activeUseCase?.id === useCase.id ? 'font-[600] text-accent' : 'text-fg'}>{useCase.label}</span>
                </span>
              ))}
            </p>
          )}
          <p className="mt-2.5 mb-0 text-[12px] leading-5 text-fg">
            {activeUseCase ? activeUseCase.note : activeEntry.summary}
          </p>
        </>
      }
    />
  );

  return (
    <div className="grid h-dvh grid-rows-[var(--header-height)_minmax(0,1fr)_auto] phone:block phone:h-auto">
      <a
        href="#vibes-workspace"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-40 focus:rounded-md focus:bg-panel focus:p-3"
      >
        Skip to vibes
      </a>
      <SiteHeader current="vibes" />

      <main
        id="vibes-workspace"
        tabIndex={-1}
        className="vibes-workspace mx-7 mt-6 mb-2 min-h-0 min-w-0 rounded-[14px] bg-panel [outline:none] short:mt-3 compact:mx-5 mobile:mx-4 mobile:mt-3 mobile:mb-0"
        onKeyDown={(event) => {
          if (event.key === 'Escape' && pinned !== null) clearSelection(false);
        }}
      >
        <h1 id="vibes-title" className="sr-only">
          Vibes
        </h1>
        <section
          aria-labelledby="vibes-title"
          className="flex h-full flex-col px-6 pt-4 pb-3 short:pt-3 short:pb-2 phone:h-auto mobile:px-4 mobile:pt-3 mobile:pb-2.5 phone:pt-4 phone:pb-5"
        >
          <div className="vibes-toolbar flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2">
            <div
              ref={picksRef}
              role="group"
              aria-label="Best for"
              className="flex min-w-0 items-center gap-1.5 mobile:max-w-full mobile:overflow-x-auto mobile:[scrollbar-width:none] phone:hidden"
            >
              {vibes.recommendations.map((item) => {
                const Icon = iconMap[item.icon];
                const selected = pinned?.useCaseId === item.id;
                const highlighted =
                  active?.useCaseId === item.id || (!active?.useCaseId && active?.family === item.family);
                const color = modelColor(item.entry.model);
                return (
                  <button
                    key={item.id}
                    type="button"
                    data-use-case={item.id}
                    aria-pressed={selected}
                    onClick={() => togglePinUseCase(item.id, item.family)}
                    onPointerEnter={(event) => {
                      // On phones, details mount below the plot; skip hover previews on touch or phone widths.
                      if (event.pointerType === 'touch' || phone) return;
                      setHovered((current) =>
                        current?.family === item.family && current.useCaseId === item.id
                          ? current
                          : { family: item.family, useCaseId: item.id },
                      );
                    }}
                    onPointerLeave={() => setHovered(null)}
                    className={`group flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-2.5 py-1 text-left mobile:px-2 phone:min-h-11 ${
                      selected
                        ? 'bg-accent-soft text-accent shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--accent)_28%,transparent)]'
                        : highlighted
                          ? 'bg-hover text-fg shadow-[inset_0_0_0_1px_var(--line-2)]'
                          : 'bg-surface text-fg-2 hover:bg-hover hover:text-fg'
                    }`}
                  >
                    <Icon
                      size={13}
                      className="shrink-0 text-fg-3 group-hover:text-accent group-aria-pressed:text-accent"
                      aria-hidden="true"
                    />
                    <span className="min-w-0">
                      <span className="block text-[10.5px] leading-tight text-fg-2 group-aria-pressed:text-accent">
                        {item.label}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-[12px] leading-tight font-[560] text-fg">
                        <span
                          aria-hidden="true"
                          className="size-[7px] shrink-0 rounded-full"
                          style={{ background: color }}
                        />
                        <span className="whitespace-nowrap">{shortName(item.entry.model)}</span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Five cards would push the plot down by about 170px on phones, so they collapse into one menu. */}
            <div ref={pickMenuRef} className="hidden w-full phone:block">
              <ChoiceMenu
                name="Best for"
                label={pinnedPick ? `${pinnedPick.label}, ${shortName(pinnedPick.entry.model)}` : 'Pick a use case'}
                options={vibes.recommendations.map((item) => {
                  const Icon = iconMap[item.icon];
                  return {
                    id: item.id,
                    label: item.label,
                    icon: <Icon size={14} aria-hidden="true" className="shrink-0 text-fg-3" />,
                    detail: <ModelName model={item.entry.model} />,
                  };
                })}
                current={pinnedPick?.id ?? null}
                choose={(id) => {
                  const item = vibes.recommendations.find((pick) => pick.id === id);
                  if (!item) return;
                  setHovered(null);
                  setPinned({ family: item.family, useCaseId: id });
                }}
                side="below"
                align="start"
                full
              >
                <span className="text-[11px] font-[450] text-fg-2">Best for</span>
                {pinnedPick ? (
                  <>
                    <span className="min-w-0 truncate text-accent">{pinnedPick.label}</span>
                    <span className="ml-auto shrink-0"><ModelName model={pinnedPick.entry.model} /></span>
                  </>
                ) : (
                  <span className="text-fg-2">Pick a use case</span>
                )}
              </ChoiceMenu>
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-4 phone:ml-0 phone:w-full phone:justify-between phone:gap-3">
              <button
                type="button"
                className="inline-flex min-h-9 items-center gap-2 rounded-md px-1 text-[13px] text-fg hover:text-accent aria-pressed:text-accent phone:min-h-10"
                aria-pressed={showCost}
                title="Tilt into a 3D view with a log-scaled high-effort API cost per task axis."
                onClick={() => setShowCost((current) => !current)}
              >
                <Selection checked={showCost} />
                Cost axis
              </button>
              <div className={segments} role="group" aria-label="Chart labels">
                <button
                  type="button"
                  className={segment}
                  aria-pressed={!showBenchmarks}
                  onClick={() => setShowBenchmarks(false)}
                >
                  Clean
                </button>
                <button
                  type="button"
                  className={segment}
                  aria-pressed={showBenchmarks}
                  onClick={() => setShowBenchmarks(true)}
                >
                  + Benchmarks
                </button>
              </div>
            </div>
          </div>

          <div ref={chartRef} className="vibes-plot relative mt-2 short:mt-1 mobile:mt-1 flex min-h-0 flex-1 flex-col">
            <VibesChart
              models={vibes.models}
              activeFamily={active?.family ?? null}
              pinnedFamily={pinned?.family ?? null}
              showBenchmarks={showBenchmarks}
              showCost={showCost}
              onPreview={(family) =>
                setHovered((current) =>
                  family
                    ? current?.family === family && current.useCaseId === null
                      ? current
                      : { family, useCaseId: null }
                    : null,
                )
              }
              onTogglePin={togglePinModel}
              onClear={() => clearSelection(false)}
            />
            {!detailsBelow && activeEntry && (
              <aside
                ref={overlayRef}
                className={`configuration-details scroll-fade${isPinned ? '' : ' pointer-events-none'}`}
                style={placement}
                aria-label="Selected model details"
                tabIndex={isPinned ? 0 : undefined}
              >
                {detailsContent}
              </aside>
            )}
          </div>

          <div className="flex shrink-0 flex-col pt-0.5 phone:gap-1.5 phone:pt-3">
            <p className="m-0 text-[12px] leading-[18px] text-fg-2">
              <strong className="font-[600] text-fg">Capability:</strong> {axisDefinitions.capability}
            </p>
            <p className="m-0 text-[12px] leading-[18px] text-fg-2">
              <strong className="font-[600] text-fg">Coherency:</strong> {axisDefinitions.coherency}
            </p>
            {showCost && (
              <p className="m-0 text-[12px] leading-[18px] text-fg-2">
                <strong className="font-[600] text-fg">Cost:</strong> high-effort API cost per task, log scale
              </p>
            )}
            <p className="m-0 text-[12px] leading-[18px] text-fg-2">
              <strong className="font-[600] text-fg">{reasoningGuidance.title}:</strong> default to{' '}
              <strong className="font-[550] text-fg">high</strong>. Never use{' '}
              <strong className="font-[550] text-fg">max</strong>: {reasoningGuidance.quote.toLowerCase()}
            </p>
          </div>

          {/* Narrow phone plots have no free corner, so a pinned card sits below the plot and axis definitions instead of covering points. */}
          {detailsBelow && isPinned && activeEntry && (
            <aside
              ref={belowCardRef}
              className="configuration-details scroll-mt-[calc(var(--header-height)+12px)]"
              data-placement="below"
              aria-label="Selected model details"
              tabIndex={0}
            >
              {detailsContent}
            </aside>
          )}
        </section>
      </main>

      <footer className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1 px-7 py-3 short:py-2 text-[12px] leading-5 text-fg-3 compact:px-5 mobile:px-4 mobile:py-2 phone:pt-5 phone:pb-[calc(20px+env(safe-area-inset-bottom))]">
        <span>
          Benchmarks &amp; cost from{' '}
          <a
            className="underline-offset-4 hover:text-accent hover:underline"
            href="https://artificialanalysis.ai/"
            target="_blank"
            rel="noreferrer"
          >
            Artificial Analysis
          </a>
        </span>
        <span title={`Snapshot captured ${snapshot.fetchedAt}`}>
          Snapshot captured{' '}
          <time dateTime={snapshot.fetchedAt}>{formatUtcDate(snapshot.fetchedAt, 'short')}</time>
        </span>
      </footer>
    </div>
  );
}

/** A model's colour dot and short name, as the picks show it. */
function ModelName({ model }: { model: Model }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] font-[560] whitespace-nowrap text-fg">
      <span aria-hidden="true" className="size-[7px] shrink-0 rounded-full" style={{ background: modelColor(model) }} />
      {shortName(model)}
    </span>
  );
}
