import { PricingDetails } from './PricingDetails';
import { memo, useMemo } from 'react';
import { Logo } from '../Logo';
import { format, formatModelValue, modelColor, shortName } from '../models';
import type { Metric } from '../chart-definitions';
import { chartDescending, type Settings } from '../state';
import { rangeGeometry, type MeasuredRow } from './geometry';

export const DotPlot = memo(function DotPlot({
  rows,
  metric,
  settings,
  expanded,
  onExpand,
}: {
  rows: MeasuredRow[];
  metric: Metric;
  settings: Settings;
  expanded: string | null;
  onExpand: (id: string | null) => void;
}) {
  const { groups, min, max, position } = useMemo(
    () => rangeGeometry(rows, metric, chartDescending(metric, true, settings.descending)),
    [rows, metric, settings.descending],
  );
  return (
    <div className="flex flex-col">
      <div className="relative flex justify-between border-b border-line pt-0.5 pb-1.5 text-[11px] text-fg-3 tabular-nums">
        <span>{format(min, metric, true)}</span>
        {min < 0 && max > 0 && position(0) > 10 && position(0) < 90 && (
          <span className="absolute -translate-x-1/2" style={{ left: `${position(0)}%` }}>
            0
          </span>
        )}
        <span>{format(max, metric, true)}</span>
      </div>
      {groups.map((group) => {
        const model = group.rows[0]!;
        const { minimum } = group;
        const open = group.id === expanded;
        return (
          <div className="border-b border-line" key={group.id}>
            <button
              className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 pt-[11px] pb-3 text-left"
              aria-expanded={open}
              aria-controls={`variants-${metric}-${group.id}`}
              onClick={() => onExpand(open ? null : group.id)}
            >
              <span className="flex min-w-0 items-center gap-[7px] text-[14px] font-[550]">
                <Logo model={model} />
                <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                  {shortName(model)}
                </span>
              </span>
              <span className="text-[13px] text-fg-2 tabular-nums">
                {metric === 'time' && model.timeEstimate && '~'}
                {format(minimum, metric)}
                {minimum !== group.maximum && ` to ${format(group.maximum, metric)}`}
              </span>
              <span
                className="relative col-span-full mx-[5px] h-3 [background:linear-gradient(var(--line-2),var(--line-2))_center/100%_1px_no-repeat]"
                aria-hidden="true"
              >
                <span
                  className="absolute top-[5px] h-0.5 opacity-45"
                  style={{
                    left: `${position(minimum)}%`,
                    width: `${position(group.maximum) - position(minimum)}%`,
                    background: modelColor(model),
                  }}
                />
                {min < 0 && (
                  <span
                    className="absolute top-0 h-3 border-l border-line-2"
                    style={{ left: `${position(0)}%` }}
                  />
                )}
                {group.rows.map((row) => (
                  <span
                    className="absolute top-px -ml-[5px] size-2.5 rounded-[50%] [box-shadow:0_0_0_1.5px_var(--panel)]"
                    key={row.id}
                    style={{
                      left: `${position(row.value)}%`,
                      background: modelColor(row),
                      opacity: 0.62 + (0.38 * row.effortOrder) / 60,
                    }}
                  />
                ))}
              </span>
            </button>
            {open && (
              <div
                className="flex flex-col gap-1.5 pb-3.5 pl-[21px] text-[13px]"
                id={`variants-${metric}-${group.id}`}
              >
                <PricingDetails model={model} />
                {group.rows.map((row) => (
                  <div className="flex justify-between gap-3" key={row.id}>
                    <span className="text-fg-2">{row.effortLabel}</span>
                    <b className="text-right font-medium tabular-nums">
                      {formatModelValue(row, metric)}
                    </b>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});
