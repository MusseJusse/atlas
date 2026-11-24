import { memo, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Check, ChevronDown, RotateCcw, Search } from 'lucide-react';
import { defaults, type Settings } from './state';
import { efforts, families } from './models';
import { modelColor, shortName } from './model-presentation';
import { Logo } from './Logo';
import { browseFamilies, curatedSections, selectedOtherFamilies } from './sidebar-catalogue';

export const Sidebar = memo(function Sidebar({
  settings,
  update,
  open,
  setOpen,
  frontier,
  onHighlight,
}: {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  frontier: Set<string>;
  onHighlight: (id: string | null) => void;
}) {
  const [search, setSearch] = useState('');
  const [browse, setBrowse] = useState(false);
  const [showOpen, setShowOpen] = useState(false);
  const [showOlder, setShowOlder] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const catalog = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLElement>(null);
  // "/" opens the picker straight into search; the Models button opens it on the Done button.
  const focusSearch = useRef(false);

  useEffect(() => {
    function keyboard(event: KeyboardEvent) {
      const typing =
        event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement
        || event.target instanceof HTMLSelectElement || (event.target instanceof HTMLElement && event.target.isContentEditable);
      if (event.key === '/' && !typing && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        if (open) input.current?.focus();
        else {
          focusSearch.current = true;
          setOpen(true);
        }
      }
      if (event.key === 'Escape' && open) {
        setSearch('');
        setOpen(false);
      }
      if (event.key === 'Tab' && open && panel.current) {
        const controls = [...panel.current.querySelectorAll<HTMLElement>('button,input,a')].filter(
          (element) => !element.hasAttribute('disabled'),
        );
        const first = controls[0];
        const last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        }
        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  }, [open, setOpen]);
  useEffect(() => {
    if (!open) return;
    // Focus returns where it was. From inside a menu, that's the menu's button, since the menu closes below.
    const previous = document.activeElement?.closest('details[open]')?.querySelector('summary') ?? document.activeElement;
    // Menus left open would otherwise stay open behind the picker.
    for (const menu of document.querySelectorAll('details[open]')) if (menu instanceof HTMLDetailsElement) menu.open = false;
    (focusSearch.current ? input.current : panel.current?.querySelector<HTMLElement>('.sheet-done'))?.focus();
    focusSearch.current = false;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      // Chart points and bars are SVG, so restore focus to those too. A point whose model was just removed,
      // a trigger hidden by crossing the phone breakpoint, or a click that never focused anything (Safari)
      // falls back to the Models button.
      const restorable = (previous instanceof HTMLElement || previous instanceof SVGElement) && previous !== document.body && previous.checkVisibility();
      (restorable ? previous : document.querySelector<HTMLElement>('[aria-controls="model-filters"]'))?.focus();
    };
  }, [open, setOpen]);

  function toggle(id: string) {
    update({
      selected: settings.selected.includes(id)
        ? settings.selected.filter((selected) => selected !== id)
        : [...settings.selected, id],
    });
  }
  function toggleGroup(ids: string[]) {
    const all = ids.every((id) => settings.selected.includes(id));
    update({
      selected: all
        ? settings.selected.filter((id) => !ids.includes(id))
        : [...new Set([...settings.selected, ...ids])],
    });
  }
  const query = search.trim().toLowerCase();
  const selectedOthers = selectedOtherFamilies(settings.selected);
  const sections = query
    ? [
        {
          name: 'Results',
          items: families.filter((family) =>
            `${family.model.name} ${family.model.labName}`.toLowerCase().includes(query),
          ),
        },
      ]
    : [
        ...curatedSections,
        ...(browse || selectedOthers.length > 0
          ? [
              {
                name: 'Other',
                items: browse
                  ? browseFamilies(settings.selected, showOpen, showOlder)
                  : selectedOthers,
              },
            ]
          : []),
      ];

  return (
    <>
    {/* The chart stays visible beside the desktop drawer. This transparent layer takes the click that closes the
        picker, so the same click can't also pin a point or flip a control underneath. */}
    {open && <div aria-hidden="true" className="fixed inset-0 z-[29]" onClick={() => setOpen(false)} />}
    <aside
      id="model-filters"
      // A drawer over the chart on desktop, so selection changes show as you make them. Phones get a full-screen sheet.
      className={`fixed inset-y-0 right-0 z-30 h-dvh w-[340px] flex-col gap-4 short:gap-3 overflow-hidden bg-bg px-5 pb-4 shadow-[var(--shadow-pop)] [scrollbar-width:thin] [scrollbar-color:var(--line-2)_var(--bg)] [&>:not(.model-catalog)]:shrink-0 phone:inset-x-0 phone:w-auto phone:overflow-auto phone:px-4 phone:shadow-none phone:pb-[calc(24px+env(safe-area-inset-bottom))] ${open ? 'flex' : 'hidden'}`}
      ref={panel}
      aria-label="Model filters"
      role="dialog"
      aria-modal
    >
      <div className="sticky top-0 z-[1] -mx-5 flex h-[var(--header-height)] items-center gap-2 border-b border-line bg-bg px-5 phone:-mx-4 phone:px-4">
        <h2 className="flex-1 text-[18px] font-[650] tracking-[-0.3px] mobile:text-[18px]">
          Models{' '}
          <span className="ml-1 text-[12px] font-normal tracking-normal text-fg-3 tabular-nums">
            {settings.selected.length} selected
          </span>
        </h2>
        <button
          className="flex size-8 items-center justify-center rounded-md text-fg-2 hover:bg-hover hover:text-accent mobile:size-10"
          aria-label="Reset filters and settings"
          title="Reset filters and settings"
          onClick={() => {
            update(defaults);
            setSearch('');
          }}
        >
          <RotateCcw size={14} aria-hidden="true" />
        </button>
        <button
          className="sheet-done inline-flex h-9 items-center justify-center -mr-2.5 rounded-md px-2.5 text-[14px] font-[550] text-accent hover:bg-hover mobile:h-10 mobile:text-[15px]"
          onClick={() => setOpen(false)}
        >
          Done
        </button>
      </div>
      <label className="flex h-10 items-center gap-2 rounded-lg border border-line-2 bg-panel px-3 text-fg-2 hover:border-fg-3 focus-within:border-accent focus-within:ring-1 focus-within:ring-inset focus-within:ring-accent mobile:h-11">
        <Search size={14} aria-hidden="true" />
        <input
          className="min-w-0 flex-1 border-0 bg-transparent text-[13px] text-fg focus-visible:outline-none placeholder:text-fg-2 mobile:text-[16px]"
          ref={input}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Find models"
          aria-label="Find models"
        />
        <kbd className="flex size-5 items-center justify-center rounded-[4px] border border-line font-sans text-[11px] text-fg-3 mobile:hidden">/</kbd>
      </label>
      <div
        role="group"
        aria-label="Model selection"
        className="flex gap-0.5 rounded-lg bg-track p-0.5"
      >
        <button
          className="min-h-8 flex-1 rounded-md text-[12px] font-[500] text-fg-2 hover:text-fg aria-pressed:bg-thumb aria-pressed:text-accent aria-pressed:shadow-[var(--shadow-raised)] mobile:min-h-11 mobile:text-[13px]"
          aria-pressed={
            settings.selected.length === defaults.selected.length &&
            defaults.selected.every((id) => settings.selected.includes(id))
          }
          onClick={() => update({ selected: defaults.selected })}
        >
          Default
        </button>
        <button
          className="min-h-8 flex-1 rounded-md text-[12px] font-[500] text-fg-2 hover:text-fg aria-pressed:bg-thumb aria-pressed:text-accent aria-pressed:shadow-[var(--shadow-raised)] mobile:min-h-11 mobile:text-[13px]"
          aria-pressed={settings.selected.length === families.length}
          onClick={() => update({ selected: families.map((family) => family.family) })}
        >
          All
        </button>
        <button
          className="min-h-8 flex-1 rounded-md text-[12px] font-[500] text-fg-2 hover:text-fg aria-pressed:bg-thumb aria-pressed:text-accent aria-pressed:shadow-[var(--shadow-raised)] mobile:min-h-11 mobile:text-[13px]"
          aria-pressed={settings.selected.length === 0}
          onClick={() => update({ selected: [] })}
        >
          Clear
        </button>
      </div>
      <div ref={catalog}
        className="model-catalog scroll-fade min-h-0 flex-1 overflow-y-auto py-1 pr-1 [--fade-surface:var(--bg)] phone:flex-none phone:overflow-visible">
        {sections.map((section) => (
          <div className="mb-4 last:mb-0 mobile:scroll-mt-[72px]" key={section.name} data-section={section.name}>
            <div className="mb-1 flex items-baseline gap-2.5">
              <h3 className="flex-1 text-[13px] font-[600] mobile:text-[15px]">{section.name}</h3>
              {section.name !== 'Frontier' && section.items.length > 0 && (
                <button
                  className="-my-1 min-h-6 min-w-6 text-right text-[12px] text-fg-3 hover:text-accent mobile:my-0 mobile:min-h-8 mobile:text-[14px]"
                  onClick={() => toggleGroup(section.items.map((family) => family.family))}
                  aria-label={`Toggle all ${section.name.toLowerCase()} models`}
                >
                  All
                </button>
              )}
            </div>
            {section.items.map((family) => (
              <button
                key={family.family}
                className={`group flex min-h-8 short:min-h-7 w-full items-center gap-2.5 rounded-md px-1.5 text-left text-[13px] text-fg-2 hover:bg-hover hover:text-fg aria-pressed:font-[550] aria-pressed:text-fg mobile:min-h-11 mobile:text-[15px] ${settings.frontier && settings.selected.includes(family.family) ? (frontier.has(family.family) ? 'font-[550]' : 'opacity-50 hover:opacity-100 focus-visible:opacity-100') : ''}`}
                aria-pressed={settings.selected.includes(family.family)}
                onClick={() => toggle(family.family)}
                onMouseEnter={() => onHighlight(family.family)}
                onMouseLeave={() => onHighlight(null)}
                title={`${family.model.name}, ${family.variants.length} ${family.variants.length === 1 ? 'configuration' : 'configurations'}`}
              >
                <Logo model={family.model} size={13} />
                <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                  {shortName(family.model)}
                </span>
                {/* A filled model-colour check makes selection readable without relying on weight alone. */}
                <span
                  aria-hidden="true"
                  className="flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-control-border text-on-accent group-aria-pressed:border-transparent group-aria-pressed:bg-[var(--model-color)]"
                  style={{ '--model-color': modelColor(family.model) } as CSSProperties}
                >
                  <Check size={11} strokeWidth={3.25} className="hidden group-aria-pressed:block" />
                </span>
              </button>
            ))}
            {section.items.length === 0 && (
              <p className="m-0 text-[12px] text-fg-2">No models match. Try another model or lab name.</p>
            )}
          </div>
        ))}
      </div>
      <div>
        <h3 className="text-[13px] font-[600] mobile:text-[15px]">Reasoning</h3>
        <div className="mt-2 grid grid-cols-3 gap-1">
          {efforts.map((effort) => (
            <button
              className="min-h-8 rounded-md border border-dashed border-line-2 px-2 text-[12px] text-fg-3 hover:bg-hover hover:text-fg aria-pressed:border-solid aria-pressed:border-transparent aria-pressed:bg-accent-soft aria-pressed:font-[550] aria-pressed:text-accent mobile:min-h-11 mobile:px-3 mobile:text-[14px]"
              key={effort}
              aria-pressed={!settings.excluded.includes(effort)}
              onClick={() =>
                update({
                  excluded: settings.excluded.includes(effort)
                    ? settings.excluded.filter((value) => value !== effort)
                    : [...settings.excluded, effort],
                })
              }
            >
              {effort}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2.5 border-t border-line pt-3.5">
        <button
          className="inline-flex min-h-10 items-center gap-1.5 self-start text-left text-[13px] font-[550] text-accent hover:underline mobile:min-h-11 mobile:text-[14px]"
          aria-expanded={browse}
          onClick={() => {
            setBrowse(!browse);
            // Bring the newly listed models into view instead of appending them below the fold.
            if (!browse) requestAnimationFrame(() => catalog.current?.querySelector('[data-section="Other"]')?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
          }}
        >
          {browse ? 'Show fewer models' : 'Show more models'}
          <ChevronDown size={14} aria-hidden="true" className={browse ? 'rotate-180' : undefined} />
        </button>
        {browse && (
          <div className="flex gap-2">
            <button
              className="min-h-8 rounded-md border border-dashed border-line-2 px-2.5 text-[12px] text-fg-3 hover:bg-hover hover:text-fg aria-pressed:border-solid aria-pressed:border-transparent aria-pressed:bg-accent-soft aria-pressed:font-[550] aria-pressed:text-accent mobile:min-h-11 mobile:px-3 mobile:text-[14px]"
              aria-pressed={showOpen}
              onClick={() => setShowOpen(!showOpen)}
            >
              Open weights
            </button>
            <button
              className="min-h-8 rounded-md border border-dashed border-line-2 px-2.5 text-[12px] text-fg-3 hover:bg-hover hover:text-fg aria-pressed:border-solid aria-pressed:border-transparent aria-pressed:bg-accent-soft aria-pressed:font-[550] aria-pressed:text-accent mobile:min-h-11 mobile:px-3 mobile:text-[14px]"
              aria-pressed={showOlder}
              onClick={() => setShowOlder(!showOlder)}
            >
              Older models
            </button>
          </div>
        )}
      </div>
    </aside>
    </>
  );
});
