import type { SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';

/** A native select with the app's border, type, and chevron, so it matches the other controls. */
export function Select({ className = '', ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className={`relative flex min-w-0 ${className}`}>
      <select
        {...props}
        className="min-h-9 w-full min-w-0 appearance-none rounded-md border border-line-2 bg-panel pr-8 pl-2.5 text-[13px] text-fg hover:border-control-border focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent mobile:min-h-11"
      />
      <ChevronDown size={14} aria-hidden="true" className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-fg-3" />
    </span>
  );
}
