import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export type ChoiceOption<Id extends string> = {
  id: Id;
  label: string;
  divider?: boolean;
  icon?: ReactNode;
  /** Right-aligned extra, such as the model a use case recommends. */
  detail?: ReactNode;
};

/** A button that opens a list of choices. Axis titles use it, and so does the phone Best for picker on Vibes. */
export function ChoiceMenu<Id extends string>({
  name,
  label,
  children,
  options,
  current,
  choose,
  side,
  align,
  full = false,
}: {
  /** Names the menu for screen readers, such as "Vertical axis". */
  name: string;
  /** The current choice, read after the name. It's also the visible text unless children replace it. */
  label: string;
  children?: ReactNode;
  options: readonly ChoiceOption<Id>[];
  current: Id | null;
  choose: (id: Id) => void;
  side: 'above' | 'below';
  align: 'start' | 'end';
  /** Stretch the button and its list to the full width of the container. */
  full?: boolean;
}) {
  const menu = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);
  // A wrapped trigger can sit at either edge, so flip the menu when the preferred side would leave the viewport.
  const [edge, setEdge] = useState(align);
  function fit() {
    const trigger = menu.current?.getBoundingClientRect();
    if (!trigger || full) return;
    const width = 220 + 8;
    setEdge(align === 'end' ? (trigger.right - width < 0 ? 'start' : 'end') : (trigger.left + width > innerWidth ? 'end' : 'start'));
  }
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && menu.current && !menu.current.contains(event.target)) menu.current.open = false;
    };
    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', fit);
    return () => {
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('resize', fit);
    };
  }, [open]);
  function close() {
    if (!menu.current) return;
    menu.current.open = false;
    menu.current.querySelector('summary')?.focus();
  }
  return (
    <details
      ref={menu}
      data-choice-menu
      className={`group relative ${full ? 'w-full' : 'shrink-0'}`}
      onToggle={(event) => {
        setOpen(event.currentTarget.open);
        // Find in page can open the menu without a summary click, and the viewport can change before toggle fires.
        if (event.currentTarget.open) fit();
      }}
      onClickCapture={(event) => {
        // Summary clicks run before the menu opens, so its first frame already sits on the fitting side.
        if (!menu.current?.open && event.target instanceof Element && event.target.closest('summary')) fit();
      }}
      onBlur={(event) => {
        // Close when keyboard focus moves elsewhere. A null target is a pointer press, which the outside listener handles,
        // and Safari doesn't focus buttons on click, so closing then would swallow the option click.
        const next = event.relatedTarget;
        if (menu.current?.open && next instanceof Node && !menu.current.contains(next)) menu.current.open = false;
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && menu.current?.open) {
          close();
          event.stopPropagation();
        }
      }}
    >
      <summary
        className={`${full ? 'flex min-h-10 w-full' : 'inline-flex min-h-8'} cursor-pointer list-none items-center gap-1 rounded-md bg-surface py-1 pr-1.5 pl-2.5 text-[13px] font-[560] text-fg hover:bg-hover group-open:bg-accent-soft group-open:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden`}
        aria-label={`${name}: ${label}`}
      >
        {full ? <span className="flex min-w-0 flex-1 items-center gap-1.5">{children ?? label}</span> : children ?? label}
        <ChevronDown size={14} aria-hidden="true" className="shrink-0 text-fg-2 group-open:rotate-180 group-open:text-accent" />
      </summary>
      <div
        className={`absolute ${side === 'below' ? 'top-[calc(100%+6px)]' : 'bottom-[calc(100%+6px)]'} ${full ? 'inset-x-0' : `w-[220px] ${edge === 'start' ? 'left-0' : 'right-0'}`} z-20 flex flex-col gap-0.5 rounded-xl bg-panel p-1.5 shadow-[var(--shadow-pop)]`}
        role="group"
        aria-label={name}
      >
        {options.map((option) => (
          <Fragment key={option.id}>
            {option.divider && <span role="separator" className="mx-1 my-1 h-px bg-line" />}
            <button
              className="inline-flex min-h-9 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] text-fg hover:bg-hover aria-pressed:font-[560] aria-pressed:text-accent"
              aria-pressed={option.id === current}
              onClick={() => {
                close();
                choose(option.id);
              }}
            >
              {option.icon ?? <Check size={14} aria-hidden="true" className={option.id === current ? '' : 'invisible'} />}
              {option.label}
              {option.detail && <span className="ml-auto">{option.detail}</span>}
            </button>
          </Fragment>
        ))}
      </div>
    </details>
  );
}
