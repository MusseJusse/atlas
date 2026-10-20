import { X } from 'lucide-react';
import { Logo } from '../Logo';
import { format, formatModelValue, shortName, type Model } from '../models';
import { metrics, type Metric } from '../chart-definitions';

const priceFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/** A side inspector on desktop and a compact readout on mobile. */
export function ConfigurationDetails({
  model,
  metric,
  mobile,
  pinned,
  variants,
  onSelect,
  onClose,
}: {
  model: Model;
  metric: Metric;
  mobile: boolean;
  pinned: boolean;
  variants: Model[];
  onSelect: (model: Model) => void;
  onClose: () => void;
}) {
  const scoreMetric = metric === 'omniscience' ? 'omniscience' : 'intelligence';
  const measurements = [
    { label: metrics[scoreMetric].label, compact: scoreMetric === 'intelligence' ? 'index' : 'omni', metric: scoreMetric },
    { label: 'Cost per task', compact: '/ task', metric: 'cost' },
    { label: 'Time per task', compact: 'time', metric: 'time' },
    { label: 'Tokens per task', compact: 'tokens', metric: 'tokens' },
    { label: 'Output tokens / s', compact: 'tok / s', metric: 'speed' },
  ] as const;
  if (mobile) {
    return (
      <div className="configuration-readout grid min-h-16 grid-rows-[minmax(20px,auto)_1fr] py-1.5">
        <div className="flex min-w-0 items-center gap-2 text-[11px]">
          <Logo model={model} size={13} />
          <strong className="min-w-0 font-[550] [overflow-wrap:anywhere]">{model.name}</strong>
          <span className="shrink-0 text-[10px] text-fg-2">{model.effortLabel}</span>
        </div>
        <dl className="m-0 grid grid-cols-5 gap-2">
          {measurements.map((measurement) => (
            <div className="flex min-w-0 flex-col" key={measurement.label}>
              <dt className="text-[9px] leading-[12px] text-fg-2">
                <span aria-hidden="true">{measurement.compact}</span>
                <span className="sr-only">{measurement.label}</span>
              </dt>
              <dd className="order-first m-0 whitespace-nowrap text-[12px] font-medium leading-[16px]">
                {model[measurement.metric] === null ? (
                  <abbr className="no-underline" title="Not measured">n/a</abbr>
                ) : formatModelValue(model, measurement.metric)}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    );
  }

  const otherScoreMetric = scoreMetric === 'intelligence' ? 'omniscience' : 'intelligence';
  const allMeasurements = [
    ...measurements,
    { label: metrics[otherScoreMetric].label, metric: otherScoreMetric },
  ] as const;
  const reasoning = model.effort === 'none' ? 'No reasoning' : `${model.effortLabel} reasoning`;
  return (
    <div className="configuration-inspector">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <strong className="flex items-center gap-2 text-[13px] font-[550]">
            <Logo model={model} size={14} />
            {shortName(model)}
          </strong>
          <div className="mt-1 text-[11px] text-fg-2">{model.labName} · {reasoning}</div>
          <div className="mt-2 text-[10px] text-accent">{pinned ? 'Pinned configuration' : 'Preview · Click a point to pin'}</div>
        </div>
        {pinned && (
          <button
            className="-mt-2 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-md text-fg-2 hover:bg-hover hover:text-accent"
            onClick={onClose}
            aria-label="Clear selected configuration"
          >
            <X size={15} aria-hidden="true" />
          </button>
        )}
      </div>
      <dl className="my-5 grid grid-cols-2 gap-x-3 gap-y-4">
        {allMeasurements.map((measurement) => (
          <div key={measurement.label} className="min-w-0">
            <dt className="text-[10px] text-fg-2">{measurement.label}</dt>
            <dd className="m-0 mt-1 text-[17px] font-medium tracking-[-0.4px]">
              {formatModelValue(model, measurement.metric)}
            </dd>
          </div>
        ))}
      </dl>
      {variants.length > 1 && (
        <table className="mb-5 w-full border-collapse text-[11px] tabular-nums">
          <caption className="pb-2 text-left text-[12px] font-medium">Visible reasoning levels</caption>
          <thead>
            <tr className="border-b border-line text-[10px] text-fg-2">
              <th scope="col" className="py-2 text-left font-normal">Effort</th>
              <th scope="col" className="py-2 text-right font-normal">
                {metric === 'omniscience' ? 'Omniscience' : 'Index'}
              </th>
              <th scope="col" className="py-2 text-right font-normal">Cost / task</th>
            </tr>
          </thead>
          <tbody>
            {variants.map((variant) => (
              <tr key={variant.id} className={variant.id === model.id ? 'bg-surface text-accent' : undefined}>
                <th scope="row" className="text-left font-normal">
                  <button
                    className="min-h-11 w-full pr-2 text-left hover:text-accent"
                    onClick={() => onSelect(variant)}
                    aria-label={`Select ${shortName(variant)}, ${variant.effortLabel} reasoning`}
                    aria-pressed={variant.id === model.id}
                  >
                    {variant.effortLabel}
                  </button>
                </th>
                <td className="text-right">
                  {formatModelValue(variant, scoreMetric)}
                </td>
                <td className="text-right">{format(variant.cost, 'cost')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <dl className="m-0 grid grid-cols-3 gap-2 border-t border-line pt-3">
        {[
          ['Context', format(model.context, 'tokens')],
          ['Input / 1M', model.inputPrice === null ? 'Not measured' : priceFormat.format(model.inputPrice)],
          ['Output / 1M', model.outputPrice === null ? 'Not measured' : priceFormat.format(model.outputPrice)],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-[9px] text-fg-2">{label}</dt>
            <dd className="m-0 mt-1 text-[11px]">{value}</dd>
          </div>
        ))}
      </dl>
      {pinned && (
        <>
          {model.speedSource && (
            <p className="mt-3 mb-0 text-[10px] text-fg-2">
              Speed snapshot: {model.speedSource.fetchedAt.slice(0, 10)}
            </p>
          )}
          {model.timeEstimate && (
            <p className="mt-3 mb-0 text-[11px] leading-5 text-fg-2">
              Local time estimate. Uses standard Sol High task tokens at Max-measured throughput.
              <br />
              {model.timeEstimate.baselineTokens.toFixed(1)} tokens ÷ {format(model.speed, 'speed')} tokens/s.
              Baseline: {model.timeEstimate.baselineFetchedAt.slice(0, 10)}
            </p>
          )}
          <a
            className="mt-3 inline-flex min-h-11 items-center text-[11px] text-accent underline underline-offset-4"
            href={model.speedSource?.url ?? `https://artificialanalysis.ai/models/${model.family}`}
            target="_blank"
            rel="noreferrer"
            aria-label={`View ${model.name} on Artificial Analysis`}
          >
            View source
          </a>
        </>
      )}
    </div>
  );
}
