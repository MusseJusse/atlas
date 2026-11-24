import type { ReactNode } from 'react';
import { PricingDetails, taskCostLabel } from './PricingDetails';
import { X } from 'lucide-react';
import { Logo } from '../Logo';
import type { Model } from '../models';
import { modelColor, shortName } from '../model-presentation';
import { format, formatModelValue } from '../formatModel';
import { metrics, type Metric } from '../chart-definitions';
import { formatUtcDate } from '../formatDate';

/** The same compact selection overlay on desktop and mobile. */
export function ConfigurationDetails({
  model,
  metric,
  pinned,
  onClose,
  summary,
}: {
  model: Model;
  metric: Metric;
  pinned: boolean;
  onClose: () => void;
  /** The page's headline finding for this configuration, shown before the measurements. */
  summary?: ReactNode;
}) {
  const scoreMetric = metric === 'omniscience' ? 'omniscience' : 'intelligence';
  // Keep the active chart metric and two supporting values without duplicate rows.
  const displayMetrics = [...new Set<Metric>([scoreMetric, metric, 'cost', 'tokensTotal'])].slice(0, model.taskPricing?.basis === 'subscription' ? 2 : 3);
  const measurements = model.codingAgent
    ? [['Coding Agent Index v2.0', format(model.codingScore ?? null, 'intelligence')], ['Cost per task', format(model.cost, 'cost')]]
    : model.cyber
    ? [['Cyber Index', format(model.cyberScore ?? null, 'intelligence')], ['Cost per task', format(model.cost, 'cost')]]
    : displayMetrics.map((measurement) => [measurement === 'cost' ? taskCostLabel(model) : measurement === 'costTotal' ? 'Total cost (API)' : metrics[measurement].label, formatModelValue(model, measurement)]);
  return (
    <div className="configuration-inspector">
      <div className="flex items-start justify-between gap-2">
        <strong className="flex min-w-0 items-center gap-2 text-[14px] font-[600] tracking-[-0.1px]" style={{ color: `color-mix(in srgb, ${modelColor(model)} 80%, var(--fg))` }}>
          <Logo model={model} size={19} />
          {shortName(model)}
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
      <div className="mt-1 flex items-baseline justify-between gap-3 text-[12px] text-fg-2">
        <span>{model.codingAgent?.configuration ?? model.cyber?.configuration ?? (model.effort === 'none' ? 'No reasoning' : `Reasoning: ${model.effortLabel.toLowerCase()}`)}</span>
        {!pinned && <span className="text-fg-3">Click to pin</span>}
      </div>
      {summary}
      {model.taskPricing?.basis === 'subscription' && (
        <p className="mt-2 mb-0 text-[11px] leading-4 text-fg-2">Assumes one model uses the full allowance. Estimated cost, not measured spend.</p>
      )}
      <dl className="mt-3 mb-3 divide-y divide-line border-y border-line text-[12px]">
        {measurements.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-3 py-2">
            <dt className="text-fg-2">{label}</dt>
            <dd className="m-0 whitespace-nowrap font-[600] tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      {model.taskPricing?.basis === 'subscription' && (
        <div className="flex items-baseline justify-between gap-3 text-[12px]">
          <span className="text-fg-2">Measured API cost per task</span><span className="font-[600] tabular-nums">{format(model.taskPricing.apiCost, 'cost')}</span>
        </div>
      )}
      <PricingDetails model={model} />
      {pinned && model.speedSource && (
        <p className="mt-3 mb-2 text-[11px] text-fg-2">
          Speed measured {formatUtcDate(model.speedSource.fetchedAt, 'short')}.
        </p>
      )}
      {pinned && model.timeEstimate && (
        <p className="mt-3 mb-2 text-[11px] leading-5 text-fg-2">
          Local time estimate. Divides GPT-6.1 Sol High output tokens by this endpoint’s Max output speed.
          <br />
          {model.timeEstimate.baselineTokens.toFixed(1)} tokens ÷ {format(model.speed, 'speed')} tokens/s.
          Token count from {formatUtcDate(model.timeEstimate.baselineFetchedAt, 'short')}.
        </p>
      )}
      <a
        className="inline-block py-1 text-[12px] text-fg-2 underline underline-offset-4 hover:text-accent"
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
