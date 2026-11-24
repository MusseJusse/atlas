/** Segmented control classes shared by every page: `segments` on the group, `segment` on each aria-pressed button. */
export const segments = 'flex gap-0.5 rounded-lg bg-track p-0.5';
// 32px segments plus the track's padding make 36px, the toolbar row height; phones get 40px touch targets.
export const segment =
  'min-h-8 flex-1 rounded-md px-2.5 text-[12px] font-[500] whitespace-nowrap text-fg-2 hover:text-fg aria-pressed:bg-thumb aria-pressed:text-accent aria-pressed:shadow-[var(--shadow-raised)] phone:min-h-9';
