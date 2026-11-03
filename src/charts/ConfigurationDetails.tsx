import { PricingDetails, taskCostLabel } from './PricingDetails';
import { X } from 'lucide-react';
import { Logo } from '../Logo';
import { format, formatModelValue, modelColor, type Model } from '../models';
import { metrics, type ScoreMetric, type Metric } from '../chart-definitions';

/** The same compact selection overlay on desktop and mobile. */
export function ConfigurationDetails({
  model,
  metric,
  pinned,
  score,
  onClose,
}: {
  model: Model;
  metric: Metric;
  pinned: boolean;
  score?: ScoreMetric;
  onClose: () => void;
}) {
  const scoreMetric = metric === 'omniscience' ? 'omniscience' : 'intelligence';
  // Keep the active chart metric and two supporting values without duplicate rows.
  const displayMetrics = [...new Set<Metric>([scoreMetric, metric, 'cost', 'tokensTotal'])].slice(0, model.taskPricing?.basis === 'subscription' ? 2 : 3);
  const measurements = score === 'codingIndex'
    ? [...new Set<Metric>(['codingIndex', metric, 'cost'])].map((measurement) => [measurement === 'cost' ? taskCostLabel(model) : measurement === 'costTotal' ? 'Total cost · API' : metrics[measurement].label, formatModelValue(model, measurement)])
    : model.codingAgent
    ? [['Coding Agent Index v2.0', format(model.codingScore ?? null, 'intelligence')], ['Cost per task', format(model.cost, 'cost')]]
    : model.cyber
    ? [['Cyber Index', format(model.cyberScore ?? null, 'intelligence')], ['Cost per task', format(model.cost, 'cost')]]
    : displayMetrics.map((measurement) => [measurement === 'cost' ? taskCostLabel(model) : measurement === 'costTotal' ? 'Total cost · API' : metrics[measurement].label, formatModelValue(model, measurement)]);
  return (
    <div className="configuration-inspector">
      <div className="flex items-start justify-between gap-2">
        <strong className="flex min-w-0 items-center gap-2 text-[13px] font-[550]" style={{ color: `color-mix(in srgb, ${modelColor(model)} 80%, var(--fg))` }}>
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
        {model.codingAgent?.configuration ?? model.cyber?.configuration ?? (model.effort === 'none' ? 'No reasoning' : model.effortLabel)} · {pinned ? 'Pinned' : 'Preview'}
      </div>
      {model.taskPricing?.basis === 'subscription' && (
        <p className="mt-2 mb-0 text-[10px] leading-4 text-fg-2">Full allowance for one model. External token mix, not measured subscription spend.</p>
      )}
      <dl className="mt-4 mb-3 space-y-2.5 text-[11px]">
        {measurements.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-3">
            <dt className="text-fg-2">{label}</dt>
            <dd className="m-0 whitespace-nowrap font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      {model.taskPricing?.basis === 'subscription' && (
        <div className="flex items-baseline justify-between gap-3 text-[11px]">
          <span className="text-fg-2">Measured API / task</span><span className="font-semibold">{format(model.taskPricing.apiCost, 'cost')}</span>
        </div>
      )}
      <PricingDetails model={model} />
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
        href={model.codingAgent?.source ?? model.cyber?.source ?? model.speedSource?.url ?? `https://artificialanalysis.ai/models/${model.family}`}
        target="_blank"
        rel="noreferrer"
        aria-label={`View ${model.name} on Artificial Analysis`}
      >
        Artificial Analysis
      </a>
    </div>
  );
}
