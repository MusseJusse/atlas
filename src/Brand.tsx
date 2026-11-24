/** Shared wordmark for the benchmark workspace and its changelog. */
export function Brand() {
  return (
    <a
      href="/"
      aria-label="Atlas home"
      className="inline-flex min-h-11 shrink-0 items-center gap-2 text-fg max-[390px]:hidden"
    >
      <svg className="text-accent" width="22" height="22" viewBox="0 0 26 26" fill="none" aria-hidden="true">
        <path d="M3 21V13M10 21V8M17 21V4M24 21V10" stroke="currentColor" strokeWidth="3.5" />
      </svg>
      <strong className="display text-[24px] font-[760] phone:text-[21px] max-[460px]:sr-only">
        Atlas
      </strong>
    </a>
  );
}
