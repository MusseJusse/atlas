/** Shared wordmark for the benchmark workspace and its changelog. */
export function Brand() {
  return (
    <a
      href="/"
      aria-label="Atlas home"
      className="inline-flex min-h-11 shrink-0 items-center gap-2.5 text-fg"
    >
      <span className="flex size-[30px] items-center justify-center rounded-lg bg-accent text-on-accent shadow-[var(--shadow-raised)] phone:size-7">
        <svg width="17" height="17" viewBox="0 0 26 26" fill="none" aria-hidden="true">
          <path d="M3 22V14M10 22V9M17 22V4M24 22V11" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </svg>
      </span>
      <strong className="text-[21px] font-[650] tracking-[-0.8px] phone:text-[19px] max-[380px]:sr-only">
        Atlas
      </strong>
    </a>
  );
}
