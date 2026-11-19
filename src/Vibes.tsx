import { useEffect, useMemo, useRef, useState } from 'react';
import { Code2, Coins, Monitor, PenLine, SearchCode } from 'lucide-react';
import snapshot from 'virtual:benchmarks';
import { ConfigurationDetails } from './charts/ConfigurationDetails';
import { Selection } from './Selection';
import { SiteHeader } from './SiteHeader';
import { useMediaQuery } from './useMediaQuery';
import { VibesChart } from './VibesChart';
import { reasoningGuidance, resolveVibes, type UseCaseIcon } from './data/vibes';
import { modelColor, shortName } from './model-presentation';

type VibeSelection = {
  family: string;
  useCaseId: string | null;
};

const segments = 'flex gap-0.5 rounded-lg bg-track p-0.5';
const segment =
  'min-h-8 flex-1 rounded-md px-2.5 text-[12px] font-[500] whitespace-nowrap text-fg-2 hover:text-fg aria-pressed:bg-thumb aria-pressed:text-accent aria-pressed:shadow-[var(--shadow-raised)]';

const iconMap: Record<UseCaseIcon, typeof Code2> = {
  coding: Code2,
  copywriting: PenLine,
  'digging-deep': SearchCode,
  cheap: Coins,
  'computer-use': Monitor,
};

export function Vibes() {
  const vibes = useMemo(() => resolveVibes(snapshot.models), []);
  const mobile = useMediaQuery('(max-width: 900px)');
  const [hovered, setHovered] = useState<VibeSelection | null>(null);
  const [pinned, setPinned] = useState<VibeSelection | null>(null);
  const [showBenchmarks, setShowBenchmarks] = useState(false);
  const [showCost, setShowCost] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const detailsRef = useRef<HTMLElement>(null);

  useEffect(() => {
    document.title = 'Atlas · Vibes';
  }, []);

  // Pin takes precedence over hover, matching Benchmarks and Efficiency.
  const active = pinned ?? hovered;
  const activeEntry = active ? vibes.byFamily.get(active.family) ?? null : null;
  const activeUseCase = active?.useCaseId
    ? vibes.recommendations.find((item) => item.id === active.useCaseId) ?? null
    : null;
  const isPinned = pinned !== null;

  function clearSelection(restoreFocus = false) {
    const previous = pinned;
    const focusInDetails =
      typeof document !== 'undefined' &&
      detailsRef.current !== null &&
      detailsRef.current.contains(document.activeElement);
    setPinned(null);
    setHovered(null);
    if (!previous || (!restoreFocus && !focusInDetails)) return;
    if (previous.useCaseId) {
      sidebarRef.current
        ?.querySelector<HTMLButtonElement>(`button[data-use-case="${previous.useCaseId}"]`)
        ?.focus({ preventScroll: true });
    } else {
      chartRef.current
        ?.querySelector<SVGGElement>(`g[data-vibe-family="${previous.family}"]`)
        ?.focus({ preventScroll: true });
    }
  }

  function togglePinModel(family: string) {
    setHovered(null);
    setPinned((current) => (current?.family === family ? null : { family, useCaseId: null }));
  }

  function togglePinUseCase(id: string, family: string) {
    setHovered(null);
    setPinned((current) => (current?.useCaseId === id ? null : { family, useCaseId: id }));
  }

  const detailsCard = activeEntry && (
    <div className="vibes-details-slot">
      <aside
        ref={detailsRef}
        className={`configuration-details vibes-details${isPinned ? '' : ' pointer-events-none'}`}
        aria-label="Selected model details"
      >
        <ConfigurationDetails
          model={activeEntry.model}
          metric="cost"
          pinned={isPinned}
          onClose={() => clearSelection(true)}
          summary={
            <>
              {activeEntry.useCases.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {activeEntry.useCases.map((useCase) => (
                    <span
                      key={useCase.id}
                      className={`rounded-full px-2 py-0.5 text-[10.5px] font-[500] ${
                        activeUseCase?.id === useCase.id
                          ? 'bg-accent-soft text-accent'
                          : 'bg-surface text-fg-2'
                      }`}
                    >
                      {useCase.label}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-2.5 mb-0 text-[12px] leading-5 text-fg">
                {activeUseCase ? activeUseCase.note : activeEntry.summary}
              </p>
            </>
          }
        />
      </aside>
    </div>
  );

  return (
    <div className="grid h-dvh grid-rows-[var(--header-height)_minmax(0,1fr)] mobile:block mobile:h-auto">
      <a
        href="#vibes-workspace"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-30 focus:rounded-md focus:bg-panel focus:p-3"
      >
        Skip to vibes
      </a>
      <SiteHeader current="vibes" />

      <main
        id="vibes-workspace"
        tabIndex={-1}
        className="vibes-workspace [outline:none] grid min-h-0 grid-cols-[var(--sidebar-width)_minmax(0,1fr)] gap-6 px-7 pt-6 pb-4 compact:gap-5 compact:px-5 mobile:flex mobile:flex-col mobile:gap-4 mobile:px-4 mobile:py-4"
        onKeyDown={(event) => {
          if (event.key === 'Escape' && pinned !== null) clearSelection(false);
        }}
      >
        {/* Main chart precedes the sidebar in DOM order so mobile keyboard tabbing matches visual order. */}
        <section
          aria-labelledby="vibes-title"
          className="col-start-2 row-start-1 flex min-h-0 min-w-0 flex-col overflow-y-auto rounded-[14px] bg-panel px-6 pt-5 pb-4 mobile:rounded-[14px] mobile:px-4 mobile:py-4"
        >
          <div className="vibes-heading flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 id="vibes-title" className="display m-0 text-[30px] leading-[1.1] phone:text-[24px]">
                Vibes
              </h1>
              <p className="mt-1 mb-0 text-[13px] leading-5 text-fg-2">
                {showCost
                  ? 'Capability (height), Coherency (front), and high-effort API cost per task (depth, log scale).'
                  : 'Personal model recommendations across Capability and Coherency.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="inline-flex min-h-10 items-center gap-2 text-[12px] font-[500] text-fg aria-pressed:text-accent hover:text-accent"
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

          <div ref={chartRef} className="vibes-plot relative mt-2 flex min-h-0 flex-1 flex-col">
            <VibesChart
              models={vibes.models}
              activeFamily={active?.family ?? null}
              pinnedFamily={pinned?.family ?? null}
              showBenchmarks={showBenchmarks}
              showCost={showCost}
              onPreview={(family) => setHovered(family ? { family, useCaseId: null } : null)}
              onTogglePin={togglePinModel}
              onClear={() => clearSelection(false)}
            />
          </div>
        </section>

        <aside
          ref={sidebarRef}
          aria-label="Personal recommendations"
          className="col-start-1 row-start-1 flex min-h-0 min-w-0 flex-col gap-5 overflow-y-auto pt-2 mobile:overflow-visible mobile:rounded-[14px] mobile:bg-panel mobile:p-4"
        >
          {mobile && detailsCard}

          <section className="vibes-recommendations" aria-labelledby="vibes-use-cases-heading">
            <h2 id="vibes-use-cases-heading" className="mb-2 text-[12px] font-[550] text-fg mobile:text-[13px]">
              Best for
            </h2>
            <div className="flex flex-col gap-0.5 mobile:grid mobile:grid-cols-2 mobile:gap-1.5 phone:grid-cols-1">
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
                      if (event.pointerType === 'touch') return;
                      setHovered({ family: item.family, useCaseId: item.id });
                    }}
                    onPointerLeave={() => setHovered(null)}
                    className={`group flex min-h-11 w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors ${
                      selected
                        ? 'bg-panel font-medium text-fg shadow-[inset_0_0_0_1px_var(--line)] mobile:bg-surface'
                        : highlighted
                          ? 'bg-hover text-fg'
                          : 'text-fg-2 hover:bg-hover hover:text-fg'
                    }`}
                  >
                    <Icon
                      size={14}
                      className="shrink-0 text-fg-3 group-hover:text-accent group-aria-pressed:text-accent"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11px] leading-tight text-fg-2">{item.label}</span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-[12.5px] font-[550] text-fg">
                        <span aria-hidden="true" className="size-[7px] shrink-0 rounded-full" style={{ background: color }} />
                        <span className="truncate">{shortName(item.entry.model)}</span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="vibes-reasoning border-t border-line pt-4" aria-labelledby="vibes-reasoning-heading">
            <h2 id="vibes-reasoning-heading" className="m-0 text-[12px] font-[550] text-fg mobile:text-[13px]">
              {reasoningGuidance.title}
            </h2>
            <p className="mt-1.5 mb-0 text-[12px] leading-5 text-fg-2">
              Default to <strong className="font-medium text-fg">high</strong>. Never use{' '}
              <strong className="font-medium text-fg">max</strong>: {reasoningGuidance.quote.toLowerCase()}
            </p>
          </section>

          {!mobile && detailsCard}
        </aside>
      </main>
    </div>
  );
}
