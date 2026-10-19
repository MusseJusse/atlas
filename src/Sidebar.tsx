import { memo, useEffect, useRef, useState } from 'react';
import { RotateCcw, Search } from 'lucide-react';
import { defaults, type Settings } from './state';
import { efforts, families, modelColor, shortName } from './models';
import { Logo } from './Logo';
import { browseFamilies, curatedSections } from './sidebar-catalogue';

export const Sidebar = memo(function Sidebar({
  settings,
  update,
  open,
  close,
  frontier,
  onHighlight,
}: {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  open: boolean;
  close: () => void;
  frontier: Set<string>;
  onHighlight: (id: string | null) => void;
}) {
  const [search, setSearch] = useState('');
  const [browse, setBrowse] = useState(false);
  const [showOpen, setShowOpen] = useState(false);
  const [showOlder, setShowOlder] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const panel = useRef<HTMLElement>(null);

  useEffect(() => {
    function keyboard(event: KeyboardEvent) {
      const typing =
        event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
      if (event.key === '/' && !typing) {
        event.preventDefault();
        input.current?.focus();
      }
      if (event.key === 'Escape') {
        setSearch('');
        input.current?.blur();
        if (open) close();
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
  }, [open, close]);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    panel.current?.querySelector<HTMLElement>('.sheet-done')?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [open]);

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
        ...(browse
          ? [
              {
                name: 'Other',
                items: browseFamilies(settings.selected, showOpen, showOlder),
              },
            ]
          : []),
      ];

  return (
    <aside
      id="model-filters"
      className={`flex h-full min-h-0 flex-col gap-4 overflow-hidden pr-1 pb-3 [scrollbar-width:thin] [scrollbar-color:var(--line-2)_var(--bg)] [&>:not(.model-catalog)]:shrink-0 mobile:fixed mobile:inset-0 mobile:z-10 mobile:h-dvh mobile:overflow-auto mobile:bg-bg mobile:px-4 mobile:pt-0 mobile:pb-[calc(24px+env(safe-area-inset-bottom))] ${open ? 'mobile:flex' : 'mobile:hidden'}`}
      ref={panel}
      aria-label="Model filters"
      role={open ? 'dialog' : undefined}
      aria-modal={open ? true : undefined}
    >
      <div className="flex min-h-8 items-center gap-2 mobile:sticky mobile:top-0 mobile:z-[1] mobile:-mx-4 mobile:h-14 mobile:border-b mobile:border-line mobile:bg-bg mobile:px-4">
        <h2 className="flex-1 text-[15px] font-medium mobile:text-[17px]">
          Models{' '}
          <span className="ml-1.5 text-[11px] font-normal text-fg-3 tabular-nums">
            {settings.selected.length} selected
          </span>
        </h2>
        <button
          className="flex size-8 items-center justify-center rounded-md text-fg-2 hover:bg-hover hover:text-accent mobile:size-10"
          aria-label="Reset model filters"
          title="Reset model filters"
          onClick={() => {
            update(defaults);
            setSearch('');
          }}
        >
          <RotateCcw size={14} aria-hidden="true" />
        </button>
        <button
          className="hidden! mobile:inline-flex! mobile:items-center mobile:gap-1.5 sheet-done justify-center mobile:w-auto mobile:h-10 mobile:py-0 mobile:pr-1 mobile:pl-3 mobile:text-[15px] mobile:font-[550] mobile:text-accent"
          onClick={close}
        >
          Done
        </button>
      </div>
      <label className="flex h-10 items-center gap-2 rounded-md border border-line-2 bg-panel px-3 text-fg-2 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent mobile:h-11">
        <Search size={14} aria-hidden="true" />
        <input
          className="min-w-0 flex-1 border-0 bg-transparent text-[12.5px] text-fg [outline:none] placeholder:text-fg-2 mobile:text-[16px]"
          ref={input}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Find models"
          aria-label="Find models"
        />
        <kbd className="font-sans text-[11px] mobile:hidden">/</kbd>
      </label>
      <div
        role="group"
        aria-label="Model selection"
        className="flex gap-1 rounded-md bg-surface p-1"
      >
        <button
          className="min-h-8 flex-1 rounded-sm text-[11px] text-fg-2 aria-pressed:bg-panel aria-pressed:font-medium aria-pressed:text-accent mobile:min-h-11 mobile:text-[13px]"
          aria-pressed={
            settings.selected.length === defaults.selected.length &&
            defaults.selected.every((id) => settings.selected.includes(id))
          }
          onClick={() => update({ selected: defaults.selected })}
        >
          Default
        </button>
        <button
          className="min-h-8 flex-1 rounded-sm text-[11px] text-fg-2 aria-pressed:bg-panel aria-pressed:font-medium aria-pressed:text-accent mobile:min-h-11 mobile:text-[13px]"
          aria-pressed={settings.selected.length === families.length}
          onClick={() => update({ selected: families.map((family) => family.family) })}
        >
          All
        </button>
        <button
          className="min-h-8 flex-1 rounded-sm text-[11px] text-fg-2 aria-pressed:bg-panel aria-pressed:font-medium aria-pressed:text-accent mobile:min-h-11 mobile:text-[13px]"
          aria-pressed={settings.selected.length === 0}
          onClick={() => update({ selected: [] })}
        >
          Clear
        </button>
      </div>
      <div className="model-catalog min-h-0 flex-1 overflow-y-auto pr-1 mobile:flex-none mobile:overflow-visible">
        {sections.map((section) => (
          <div className="mb-4 last:mb-0" key={section.name}>
            <div className="mb-1 flex items-baseline gap-2.5">
              <h3 className="flex-1 text-[12px] font-[550] mobile:text-[14px]">{section.name}</h3>
              {section.name !== 'Frontier' && section.items.length > 0 && (
                <button
                  className="-my-1 min-h-6 min-w-6 text-right text-[11.5px] text-fg-3 aria-pressed:text-accent mobile:my-0 mobile:min-h-8 mobile:text-[14px]"
                  onClick={() => toggleGroup(section.items.map((family) => family.family))}
                >
                  All
                </button>
              )}
            </div>
            {section.items.map((family) => (
              <button
                key={family.family}
                className={`group flex min-h-8 w-full items-center gap-2 rounded-md px-1 text-left text-[12px] text-fg-2 hover:bg-hover hover:text-fg aria-pressed:text-fg mobile:min-h-11 mobile:text-[15px] ${settings.frontier && settings.selected.includes(family.family) ? (frontier.has(family.family) ? 'font-[550]' : 'opacity-50 hover:opacity-100 focus-visible:opacity-100') : ''}`}
                aria-pressed={settings.selected.includes(family.family)}
                onClick={() => toggle(family.family)}
                onMouseEnter={() => onHighlight(family.family)}
                onMouseLeave={() => onHighlight(null)}
                title={`${family.model.name} · ${family.variants.length} configurations`}
              >
                <Logo model={family.model} size={13} />
                <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                  {shortName(family.model)}
                </span>
                <span
                  className="size-[7px] shrink-0 rounded-[50%] opacity-50 [box-shadow:inset_0_0_0_1px] group-aria-pressed:bg-current group-aria-pressed:opacity-100"
                  style={{ color: modelColor(family.model) }}
                />
              </button>
            ))}
            {section.items.length === 0 && (
              <p className="m-0 text-[12px] text-fg-2">No matching models.</p>
            )}
          </div>
        ))}
      </div>
      <div>
        <h3 className="text-[12px] font-[550] mobile:text-[14px]">Reasoning</h3>
        <div className="mt-2 grid grid-cols-3 gap-1 mobile:flex mobile:flex-wrap">
          {efforts.map((effort) => (
            <button
              className="min-h-8 rounded-md px-2 text-[11.5px] text-fg-2 aria-pressed:bg-accent-soft aria-pressed:font-medium aria-pressed:text-accent hover:bg-hover mobile:min-h-11 mobile:px-3 mobile:text-[14px]"
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
          className="min-h-10 text-left text-[12px] font-medium text-accent hover:underline mobile:min-h-11 mobile:text-[14px]"
          aria-expanded={browse}
          onClick={() => setBrowse(!browse)}
        >
          {browse ? 'Show fewer models' : 'Show all models'}
        </button>
        {browse && (
          <div className="flex gap-3.5">
            <button
              className="text-[11.5px] text-fg-3 aria-pressed:text-accent mobile:min-h-8 mobile:text-[14px]"
              aria-pressed={showOpen}
              onClick={() => setShowOpen(!showOpen)}
            >
              Open weights
            </button>
            <button
              className="text-[11.5px] text-fg-3 aria-pressed:text-accent mobile:min-h-8 mobile:text-[14px]"
              aria-pressed={showOlder}
              onClick={() => setShowOlder(!showOlder)}
            >
              Older models
            </button>
          </div>
        )}
      </div>
    </aside>
  );
});
