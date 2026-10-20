import { X } from 'lucide-react';
import { Logo } from '../Logo';
import { format, formatModelValue, modelColor, type Model } from '../models';
import { metrics, type Metric } from '../chart-definitions';

/** A compact desktop overlay and a static, five-measurement readout on mobile. */
export function ConfigurationDetails({
  model,
  metric,
  mobile,
  pinned,
  onClose,
}: {
  model: Model;
  metric: Metric;
  mobile: boolean;
  pinned: boolean;
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

  // Keep the active chart metric and two supporting values without duplicate rows.
  const desktopMetrics = [...new Set<Metric>([scoreMetric, metric, 'cost', 'tokensTotal'])].slice(0, 3);
  return (
    <div className="configuration-inspector">
      <div className="flex items-start justify-between gap-2">
        <strong className="flex min-w-0 items-center gap-2 text-[13px] font-[550]" style={{ color: modelColor(model) }}>
          <Logo model={model} size={19} />
          {model.name}
        </strong>
        {pinned && (
          <button
            className="-my-3 -mr-3 flex size-11 shrink-0 items-center justify-center rounded-md text-fg-2 hover:bg-hover hover:text-accent"
            onClick={onClose}
            aria-label="Clear selected configuration"
          >
            <X size={15} aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="mt-1 text-[11px] text-fg-2">
        {model.effort === 'none' ? 'No reasoning' : model.effortLabel} · {pinned ? 'Pinned' : 'Preview'}
      </div>
      <dl className="mt-4 mb-3 space-y-2.5 text-[11px]">
        {desktopMetrics.map((measurement) => (
          <div key={measurement} className="flex items-baseline justify-between gap-3">
            <dt className="text-fg-2">{metrics[measurement].label}</dt>
            <dd className="m-0 whitespace-nowrap font-semibold">{formatModelValue(model, measurement)}</dd>
          </div>
        ))}
      </dl>
      {pinned && model.speedSource && (
        <p className="mt-3 mb-2 text-[10px] text-fg-2">
          Speed snapshot: {model.speedSource.fetchedAt.slice(0, 10)}
        </p>
      )}
      {pinned && model.timeEstimate && (
        <p className="mt-3 mb-2 text-[11px] leading-5 text-fg-2">
          Local time estimate. Uses standard Sol High task tokens at Max-measured throughput.
          <br />
          {model.timeEstimate.baselineTokens.toFixed(1)} tokens ÷ {format(model.speed, 'speed')} tokens/s.
          Baseline: {model.timeEstimate.baselineFetchedAt.slice(0, 10)}
        </p>
      )}
      <a
        className="inline-block py-1 text-[11px] text-fg-2 underline underline-offset-4 hover:text-accent"
        href={model.speedSource?.url ?? `https://artificialanalysis.ai/models/${model.family}`}
        target="_blank"
        rel="noreferrer"
        aria-label={`View ${model.name} on Artificial Analysis`}
      >
        Artificial Analysis
      </a>
    </div>
  );
}
