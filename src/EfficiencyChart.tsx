import { useId, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { EfficiencyLine, EfficiencyPoint } from './efficiency-data';
import { efficiencyGeometry } from './charts/efficiency-geometry';
import { formatUtcDate } from './formatDate';
import { nearestPoint, pinHandlers } from './charts/interactions';

const monthFormat = new Intl.DateTimeFormat('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' });
const costFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumSignificantDigits: 4 });

// Threshold colors stay distinct and readable in both existing Atlas themes.
export const efficiencyColors = {
  10: 'light-dark(#238542, #6ed78c)',
  20: 'light-dark(#c12a75, #f48fbd)',
  30: 'light-dark(#8c56c6, #c5a2f5)',
  40: 'light-dark(#4262bd, #95b1ff)',
  50: 'light-dark(#ac600f, #efba76)',
  60: 'light-dark(#65516f, #ccb6d9)',
} as const;

export type EfficiencyRecord = { threshold: EfficiencyLine['threshold']; point: EfficiencyPoint };

export function recordKey({ threshold, point }: EfficiencyRecord) {
  return `${threshold}:${point.model.id}`;
}

export function EfficiencyChart({ lines, selected, fetchedAt, active, highlightedThreshold, pinned, preview, togglePin }: {
  lines: EfficiencyLine[];
  selected: EfficiencyLine[];
  fetchedAt: string;
  active: EfficiencyRecord | null;
  highlightedThreshold: EfficiencyLine['threshold'] | null;
  pinned: string | null;
  preview: (key: string | null) => void;
  togglePin: (key: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const id = useId();
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const resize = () => setSize({ width: element.clientWidth, height: element.clientHeight });
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const geometry = size.width > 0 && size.height > 0
    ? efficiencyGeometry(lines, size.width, size.height, fetchedAt)
    : null;
  const populated = selected.some((line) => line.points.length > 0);
  const targets = geometry ? selected.flatMap((line) => line.points.map((point) => ({
    key: recordKey({ threshold: line.threshold, point }),
    x: geometry.x(Date.parse(point.date)), y: geometry.y(point.value),
  }))) : [];

  function pointerRecord(svg: SVGSVGElement, clientX: number, clientY: number) {
    const bounds = svg.getBoundingClientRect();
    return nearestPoint(targets,
      (clientX - bounds.left) * size.width / bounds.width,
      (clientY - bounds.top) * size.height / bounds.height,
      13,
    );
  }

  return (
    <div ref={ref} className="relative min-h-[280px] min-w-0 flex-1 mobile:h-[380px] mobile:flex-none phone:h-[360px]">
      {!populated ? (
        <div className="absolute inset-0 flex items-center justify-center text-center text-[13px] text-fg-2" role="status">
          {selected.length ? 'No qualifying measurements for these thresholds.' : 'Select an intelligence threshold.'}
        </div>
      ) : geometry && (
        <svg
          className="absolute inset-0 block size-full overflow-visible text-[11px]"
          viewBox={`0 0 ${size.width} ${size.height}`}
          role="group"
          aria-label="Cost per Intelligence Index task records by release date"
          aria-describedby={`${id}-description`}
          onPointerMove={(event) => {
            if (event.pointerType === 'touch') return;
            const record = pointerRecord(event.currentTarget, event.clientX, event.clientY);
            flushSync(() => preview(record?.key ?? null));
          }}
          onPointerLeave={() => flushSync(() => preview(null))}
          onClick={(event) => {
            const record = pointerRecord(event.currentTarget, event.clientX, event.clientY);
            if (!record) return;
            event.stopPropagation();
            // Focus the resolved record too, rather than whichever invisible target was on top.
            Array.from(event.currentTarget.querySelectorAll<SVGGElement>('g[data-record-key]'))
              .find((point) => point.dataset.recordKey === record.key)?.focus({ preventScroll: true });
            togglePin(record.key);
          }}
        >
          <desc id={`${id}-description`}>
            Each line shows records for an intelligence threshold. Focus a point for details, press Enter or Space to pin it, and Escape to clear the selection.
          </desc>
          <rect className="chart-background" width={size.width} height={size.height} fill="var(--panel)" />
          <g aria-hidden="true" fill="var(--fg-2)">
            {geometry.yTicks.map((tick) => (
              <g key={tick}>
                <line x1={geometry.left} x2={geometry.right} y1={geometry.y(tick)} y2={geometry.y(tick)} stroke="var(--line)" strokeDasharray="2 5" />
                <text x={geometry.left - 10} y={geometry.y(tick) + 4} textAnchor="end">
                  {costFormat.format(tick)}
                </text>
              </g>
            ))}
            {geometry.xTicks.map((tick) => (
              <text key={tick} x={geometry.x(tick)} y={geometry.bottom + 23} textAnchor="middle">{monthFormat.format(tick)}</text>
            ))}
            <text x={(geometry.left + geometry.right) / 2} y={size.height - 4} textAnchor="middle">Release date</text>
          </g>
          {selected.map((line) => (
            <g key={line.threshold} style={{ color: efficiencyColors[line.threshold], opacity: highlightedThreshold !== null && highlightedThreshold !== line.threshold ? 0.65 : 1 }}>
              <path d={geometry.path(line.points)} fill="none" stroke="currentColor" strokeWidth={highlightedThreshold === line.threshold ? 3 : 1.7} aria-hidden="true" />
              {line.points.map((point) => {
                const record = { threshold: line.threshold, point };
                const key = recordKey(record);
                const handlers = pinHandlers(record, (selected) => togglePin(recordKey(selected)));
                return (
                  <g
                    key={point.model.id}
                    data-record-key={key}
                    transform={`translate(${geometry.x(Date.parse(point.date))},${geometry.y(point.value)})`}
                    role="button"
                    tabIndex={0}
                    aria-pressed={pinned === key}
                    aria-label={`Intelligence Index at least ${line.threshold}, ${point.model.name}, ${point.model.effortLabel}, ${formatUtcDate(point.date)}, ${costFormat.format(point.value)}`}
                    className="cursor-pointer focus:[outline:none] [&:focus_.record-target]:stroke-accent [&:focus_.record-target]:stroke-2"
                    onFocus={() => preview(key)}
                    onBlur={() => preview(null)}
                    onKeyDown={handlers.onKeyDown}
                    onClick={(event) => {
                      // Assistive activation has no pointer coordinates.
                      if (event.detail === 0) { event.stopPropagation(); handlers.onClick(); }
                    }}
                  >
                    <circle className="record-target" r={13} fill="transparent" stroke="transparent" />
                    {active && recordKey(active) === key && <circle r={10} fill="none" stroke="currentColor" opacity={0.5} />}
                    <circle r={4.5} fill="currentColor" stroke="var(--panel)" strokeWidth={1.8} />
                  </g>
                );
              })}
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}
