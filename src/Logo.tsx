import type { Model } from './models';

const logos = new Set([
  'openai',
  'anthropic',
  'google',
  'xai',
  'meta',
  'kimi',
  'zai',
  'deepseek',
  'xiaomi',
]);
const monochrome = new Set(['openai', 'anthropic', 'xai', 'zai']);

export function Logo({ model, size = 15 }: { model: Model; size?: number }) {
  return logos.has(model.lab) ? (
    <img
      className={`shrink-0 object-contain align-middle group-[:not([aria-pressed=true])]:opacity-40 group-aria-pressed:opacity-100 group-hover:opacity-100 ${monochrome.has(model.lab) ? '[filter:var(--logo-filter)]' : ''}`}
      src={`/logos/${model.lab}.svg`}
      width={size}
      height={size}
      alt=""
    />
  ) : (
    <span
      className="shrink-0 object-contain align-middle group-[:not([aria-pressed=true])]:opacity-40 group-aria-pressed:opacity-100 group-hover:opacity-100 inline-flex items-center justify-center rounded-[3px] bg-hover font-semibold text-fg-2 leading-none"
      style={{ width: size, height: size, fontSize: size * 0.65 }}
      aria-hidden="true"
    >
      {model.labName[0]}
    </span>
  );
}

export function SvgLogo({
  model,
  x,
  y,
  size = 16,
}: {
  model: Model;
  x: number;
  y: number;
  size?: number;
}) {
  return logos.has(model.lab) ? (
    <image
      className={monochrome.has(model.lab) ? '[filter:var(--logo-filter)]' : undefined}
      href={`/logos/${model.lab}.svg`}
      x={x}
      y={y}
      width={size}
      height={size}
    />
  ) : (
    // A rounded chip, like the HTML Logo, so a lab initial never reads as a reasoning letter.
    <g>
      <rect x={x} y={y} width={size} height={size} rx={3} fill="var(--hover)" />
      <text
        x={x + size / 2}
        y={y + size * 0.74}
        textAnchor="middle"
        fill="var(--fg-2)"
        fontSize={size * 0.65}
        fontWeight={600}
      >
        {model.labName[0]}
      </text>
    </g>
  );
}
