import { Check } from 'lucide-react';

export function Selection({ checked }: { checked: boolean }) {
  return (
    <span
      className={`inline-flex size-3.5 shrink-0 items-center justify-center rounded-[4px] border text-on-accent [&_svg]:size-2.5 ${checked ? 'border-accent bg-accent' : 'border-control-border'}`}
      aria-hidden="true"
    >
      {checked && <Check size={11} strokeWidth={3} />}
    </span>
  );
}
