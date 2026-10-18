/** Shared wordmark for the benchmark workspace and its changelog. */
export function Brand() {
  return (
    <a
      href="/"
      aria-label="Slopalytics home"
      className="inline-flex min-h-11 shrink-0 items-center gap-2.5 text-accent"
    >
      <svg width="23" height="23" viewBox="0 0 26 26" fill="none" aria-hidden="true">
        <path d="M3 21V13M10 21V8M17 21V4M24 21V10" stroke="currentColor" strokeWidth="3.5" />
      </svg>
      <strong className="text-[23px] font-[650] tracking-[-1px] phone:text-[20px]">
        slopalytics
      </strong>
    </a>
  );
}
