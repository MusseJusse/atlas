import { useEffect, useRef, useState } from 'react';
import { RotateCcw, Search } from 'lucide-react';
import { defaults, type Settings } from './state';
import {
  efforts,
  families,
  familyMap,
  frontierFamilies,
  modelColor,
  notableFamilies,
  shortName,
  tier,
  type Family,
} from './models';
import { Logo } from './Logo';

export function Sidebar({
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
      const typing = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
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
  const filter = (family: Family) =>
    (!showOpen && family.model.open && !settings.selected.includes(family.family) ? false : true) &&
    (!showOlder && family.model.deprecated && !settings.selected.includes(family.family) ? false : true);
  const ordered = (ids: string[]) =>
    ids.flatMap((id) => {
      const family = familyMap.get(id);
      return family ? [family] : [];
    });
  const sections = search.trim()
    ? [
        {
          name: 'Results',
          items: families.filter((family) =>
            `${family.model.name} ${family.model.labName}`
              .toLowerCase()
              .includes(search.trim().toLowerCase()),
          ),
        },
      ]
    : [
        { name: 'Frontier', items: ordered(frontierFamilies) },
        { name: 'Notable', items: ordered(notableFamilies) },
        ...(browse
          ? [
              {
                name: 'Other',
                items: families
                  .filter(
                    (family) =>
                      ![...frontierFamilies, ...notableFamilies].includes(family.family) && filter(family),
                  )
                  .toSorted(
                    (a, b) =>
                      a.model.labName.localeCompare(b.model.labName) ||
                      (b.model.released ?? '').localeCompare(a.model.released ?? ''),
                  ),
              },
            ]
          : []),
      ];

  return (
    <aside
      className={`sidebar ${open ? 'open' : ''}`}
      ref={panel}
      aria-label="Model filters"
      role={open ? 'dialog' : undefined}
      aria-modal={open ? true : undefined}
    >
      <div className="side-heading">
        <h2>
          Models <span>{settings.selected.length}</span>
        </h2>
        <button
          aria-label="Reset model filters"
          title="Reset model filters"
          onClick={() => {
            update(defaults);
            setSearch('');
          }}
        >
          <RotateCcw size={14} />
        </button>
        <button className="mobile-only sheet-done" onClick={close}>
          Done
        </button>
      </div>
      <label className="search">
        <Search size={14} />
        <input
          ref={input}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Find models"
          aria-label="Find models"
        />
        <kbd>/</kbd>
      </label>
      <div className="effort-filter">
        <h3>Reasoning</h3>
        <div>
          {efforts.map((effort) => (
            <button
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
      {sections.map((section) => (
        <div key={section.name} className="model-section">
          <div className="section-head">
            <h3>{section.name}</h3>
            {section.name === 'Frontier'
              ? ['Small', 'Medium', 'Large'].map((size) => {
                  const ids = frontierFamilies.filter((id) => tier(id) === size);
                  return (
                    <button
                      key={size}
                      aria-pressed={ids.every((id) => settings.selected.includes(id))}
                      onClick={() => toggleGroup(ids)}
                    >
                      {size}
                    </button>
                  );
                })
              : section.items.length > 0 && (
                  <button onClick={() => toggleGroup(section.items.map((family) => family.family))}>
                    All
                  </button>
                )}
          </div>
          {section.items.map((family) => (
            <button
              key={family.family}
              className={`model-row ${settings.frontier && settings.selected.includes(family.family) ? (frontier.has(family.family) ? 'on-frontier' : 'off-frontier') : ''}`}
              aria-pressed={settings.selected.includes(family.family)}
              onClick={() => toggle(family.family)}
              onMouseEnter={() => onHighlight(family.family)}
              onMouseLeave={() => onHighlight(null)}
              title={`${family.model.name} · ${family.variants.length} configurations`}
            >
              <Logo model={family.model} />
              <span className="model-name">{shortName(family.model)}</span>
              <span className="model-dot" style={{ color: modelColor(family.model) }} />
            </button>
          ))}
          {section.items.length === 0 && <p className="side-note">No matching models.</p>}
        </div>
      ))}
      <div className="browse-options">
        <button onClick={() => setBrowse(!browse)}>{browse ? 'Show fewer models' : 'Show all models'}</button>
        {browse && (
          <div>
            <button aria-pressed={showOpen} onClick={() => setShowOpen(!showOpen)}>
              Open weights
            </button>
            <button aria-pressed={showOlder} onClick={() => setShowOlder(!showOlder)}>
              Older models
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
