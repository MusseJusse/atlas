import { Fragment, useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export type AxisOption<Id extends string> = { id: Id; label: string; divider?: boolean };

/** An axis title that doubles as the menu of what that axis can show. */
export function AxisMenu<Id extends string>({
  axis,
  label,
  options,
  current,
  choose,
  side,
  align,
}: {
  /** Names the axis for screen readers, such as "Vertical axis". */
  axis: string;
  label: string;
  options: readonly AxisOption<Id>[];
  current: Id;
  choose: (id: Id) => void;
  side: 'above' | 'below';
  align: 'start' | 'end';
}) {
  const menu = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && menu.current && !menu.current.contains(event.target)) menu.current.open = false;
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  function close() {
    if (!menu.current) return;
    menu.current.open = false;
    menu.current.querySelector('summary')?.focus();
  }
  return (
    <details
      ref={menu}
      data-axis-menu
      className="group relative shrink-0"
      onToggle={(event) => setOpen(event.currentTarget.open)}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && menu.current?.open) {
          close();
          event.stopPropagation();
        }
      }}
    >
      <summary
        className="inline-flex min-h-8 cursor-pointer list-none items-center gap-1 rounded-md bg-surface py-1 pr-1.5 pl-2.5 text-[13px] font-[560] text-fg hover:bg-hover group-open:bg-accent-soft group-open:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden"
        aria-label={`${axis}: ${label}`}
      >
        {label}
        <ChevronDown size={14} aria-hidden="true" className="text-fg-2 group-open:rotate-180 group-open:text-accent" />
      </summary>
      <div
        className={`absolute ${side === 'below' ? 'top-[calc(100%+6px)]' : 'bottom-[calc(100%+6px)]'} ${align === 'start' ? 'left-0' : 'right-0'} z-20 flex w-[220px] flex-col gap-0.5 rounded-xl bg-panel p-1.5 shadow-[var(--shadow-pop)]`}
        role="group"
        aria-label={axis}
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
              <Check size={14} aria-hidden="true" className={option.id === current ? '' : 'invisible'} />
              {option.label}
            </button>
          </Fragment>
        ))}
      </div>
    </details>
  );
}
