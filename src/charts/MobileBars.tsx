import { Fragment, memo, useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { format, formatModelValue, modelColor, shortName } from '../models';
import { metrics, type Metric } from '../chart-definitions';
import { chartDescending, type Settings } from '../state';
import { mobileBarGeometry, type MeasuredRow } from './geometry';

type Geometry = ReturnType<typeof mobileBarGeometry>;

function BarAxis({
  geometry,
  metric,
  endpointsOnly = false,
}: {
  geometry: Geometry;
  metric: Metric;
  endpointsOnly?: boolean;
}) {
  const ticks = endpointsOnly ? [geometry.min, geometry.max] : geometry.ticks;
  return (
    <span className="relative block h-6 text-[12px] text-fg-2 tabular-nums" aria-hidden="true">
      {ticks.map((tick) => (
        <span
          className="absolute top-0"
          key={tick}
          style={{
            left: `${geometry.position(tick)}%`,
            transform: tick === geometry.min ? undefined
              : tick === geometry.max ? 'translateX(-100%)' : 'translateX(-50%)',
          }}
        >
          {format(tick, metric, true)}
        </span>
      ))}
    </span>
  );
}

/** Summary and reasoning bars share one signed scale and the model's theme-aware color. */
function BarTrack({ row, geometry }: { row: MeasuredRow; geometry: Geometry }) {
  const end = geometry.position(row.value);
  return (
    <span className="relative block h-3.5 min-w-0" aria-hidden="true">
      {geometry.ticks.map((tick) => (
        <span
          className="absolute inset-y-0 -translate-x-1/2 border-l border-line"
          key={tick}
          style={{ left: `${geometry.position(tick)}%` }}
        />
      ))}
      <span
        className="absolute inset-y-0 rounded-[2px]"
        style={{
          left: `${Math.min(geometry.zero, end)}%`,
          width: `${Math.abs(end - geometry.zero)}%`,
          background: modelColor(row),
        }}
      />
      <span
        className="absolute inset-y-0 -translate-x-1/2 border-l border-line-2"
        style={{ left: `${geometry.zero}%` }}
      />
    </span>
  );
}

export const MobileBars = memo(function MobileBars({
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
  const descending = chartDescending(metric, true, settings.descending);
  const geometry = useMemo(
    () => mobileBarGeometry(rows, metric, descending),
    [rows, metric, descending],
  );
  const { groups } = geometry;
  const higherIsBetter = metrics[metric].higherIsBetter;
  const leader = groups.at(descending === higherIsBetter ? 0 : -1)?.representative;
  return (
    <div className="flex flex-col">
      <p className="mt-3 mb-4 text-[14px] leading-normal text-fg-2">
        {higherIsBetter ? 'Highest' : 'Lowest'} selected {metric === 'intelligence' || metric === 'omniscience' ? 'score' : 'value'} per model.
        {' '}Tap a model for its reasoning levels.
      </p>
      {leader && (
        <p className="sr-only">
          Among selected configurations, {shortName(leader)} has the {higherIsBetter ? 'highest' : 'lowest'}{' '}
          {metrics[metric].label.toLowerCase()} at {formatModelValue(leader, metric)}.
          {' '}All bars begin at zero. The data table lists every selected configuration.
        </p>
      )}
      <span className="mb-2 text-[12px] text-fg-2">{metrics[metric].unit}</span>
      <div className="mr-7 border-b border-line-2">
        <BarAxis geometry={geometry} metric={metric} />
      </div>
      <ul className="m-0 list-none p-0">
        {groups.map((group) => {
          const model = group.representative;
          const open = group.id === expanded;
          const Icon = open ? ChevronDown : ChevronRight;
          return (
            <li className="border-b border-line" key={group.id}>
              <button
                className="grid min-h-[74px] w-full grid-cols-[minmax(0,1fr)_16px] items-center gap-x-3 py-3 text-left"
                aria-expanded={open}
                aria-controls={`variants-${metric}-${group.id}`}
                onClick={() => onExpand(open ? null : group.id)}
              >
                <span className="flex min-w-0 flex-col gap-2">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 text-[16px] font-[550] [overflow-wrap:anywhere]">{shortName(model)}</span>
                    <span className="shrink-0 text-[14px] tabular-nums">
                      {formatModelValue(model, metric)}
                      <span className="sr-only">, {model.effortLabel} reasoning</span>
                    </span>
                  </span>
                  <BarTrack row={model} geometry={geometry} />
                </span>
                <Icon size={16} className="text-fg-2" aria-hidden="true" />
              </button>
              <div
                className="mb-3 border-l-2 border-accent bg-surface p-3"
                id={`variants-${metric}-${group.id}`}
                hidden={!open}
              >
                <p className="mt-0 mb-3 text-[14px] text-fg-2">Reasoning level</p>
                <div className="grid grid-cols-[4rem_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2 text-[14px]">
                  <span />
                  <BarAxis geometry={geometry} metric={metric} endpointsOnly />
                  <span />
                  {group.rows.map((row) => (
                    <Fragment key={row.id}>
                      <span className="text-fg-2 [overflow-wrap:anywhere]">{row.effortLabel}</span>
                      <BarTrack row={row} geometry={geometry} />
                      <span className="text-right tabular-nums">{formatModelValue(row, metric)}</span>
                    </Fragment>
                  ))}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <details className="group mt-5 border-y border-line-2">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 text-[14px] font-medium text-accent focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden">
          View data table
          <ChevronRight size={16} className="group-open:rotate-90" aria-hidden="true" />
        </summary>
        <div className="overflow-x-auto pb-3">
          <table className="w-full border-collapse text-left text-[14px]">
            <caption className="pb-2 text-left font-medium">
              {metrics[metric].label} by model and reasoning level, {metrics[metric].unit}
            </caption>
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="py-2 pr-3 font-medium">Model</th>
                <th scope="col" className="py-2 pr-3 font-medium">Reasoning</th>
                <th scope="col" className="py-2 text-right font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              {groups.flatMap((group) => group.rows.map((row) => (
                <tr className="border-b border-line" key={row.id}>
                  <th scope="row" className="py-2 pr-3 font-normal">{shortName(row)}</th>
                  <td className="py-2 pr-3 text-fg-2">{row.effortLabel}</td>
                  <td className="py-2 text-right whitespace-nowrap tabular-nums">{formatModelValue(row, metric)}</td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
});
