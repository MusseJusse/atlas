import type { Model } from './models';

const logos = new Set(['openai', 'anthropic', 'google', 'xai', 'meta', 'kimi', 'zai', 'deepseek', 'xiaomi']);
const monochrome = new Set(['openai', 'anthropic', 'xai', 'zai']);

export function Logo({ model, size = 15 }: { model: Model; size?: number }) {
  return logos.has(model.lab) ? (
    <img
      className={`lab-logo ${monochrome.has(model.lab) ? 'monochrome-logo' : ''}`}
      src={`/logos/${model.lab}.svg`}
      width={size}
      height={size}
      alt=""
    />
  ) : (
    <span
      className="lab-logo lab-monogram"
      style={{ width: size, height: size, fontSize: size * 0.65 }}
      aria-hidden="true"
    >
      {model.labName[0]}
    </span>
  );
}

export function SvgLogo({ model, x, y, size = 16 }: { model: Model; x: number; y: number; size?: number }) {
  return logos.has(model.lab) ? (
    <image
      className={monochrome.has(model.lab) ? 'monochrome-logo' : undefined}
      href={`/logos/${model.lab}.svg`}
      x={x}
      y={y}
      width={size}
      height={size}
    />
  ) : (
    <text x={x + size / 2} y={y + size * 0.8} textAnchor="middle" fill="var(--fg-2)" fontSize={size * 0.8}>
      {model.labName[0]}
    </text>
  );
}
