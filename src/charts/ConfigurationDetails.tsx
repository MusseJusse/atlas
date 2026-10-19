import { X } from 'lucide-react';
import { Logo } from '../Logo';
import { format, formatModelValue, shortName, type Model } from '../models';
import type { Metric } from '../chart-definitions';

/** A fixed place to inspect a configuration without covering the chart. */
export function ConfigurationDetails({
  model,
  metric,
  pinned,
  onClose,
}: {
  model: Model | null;
  metric: Metric;
  pinned: boolean;
  onClose: () => void;
}) {
  return (
    <div
      className="mt-3 min-h-[112px] short:min-h-24 shrink-0 rounded-lg bg-surface px-4 py-3 phone:px-3"
      aria-live={pinned ? 'polite' : 'off'}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
    >
      {model ? (
        <>
          <div className="flex min-h-6 flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[12px]">
              <strong className="inline-flex items-center gap-2 font-[550]">
                <Logo model={model} size={13} />
                {shortName(model)}
              </strong>
              <span className="text-[11px] text-fg-2">
                {model.effort === 'none' ? 'No reasoning' : `${model.effortLabel} reasoning`},{' '}
                {model.labName}
              </span>
              <span className="text-[10px] text-accent">{pinned ? 'Pinned' : 'Preview'}</span>
            </div>
            {pinned && (
              <a
                className="ml-auto shrink-0 text-[11px] text-accent underline underline-offset-4"
                href={
                  model.speedSource?.url ?? `https://artificialanalysis.ai/models/${model.family}`
                }
                target="_blank"
                rel="noreferrer"
                aria-label={`View ${model.name} on Artificial Analysis`}
              >
                View source
              </a>
            )}
            {pinned && (model.speedSource || model.timeEstimate) && (
              <details className="group relative shrink-0">
                <summary
                  className="flex min-h-8 cursor-pointer list-none items-center rounded-md px-2 text-[11px] text-accent hover:bg-hover focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden"
                  aria-label="Measurement notes"
                >
                  Notes
                </summary>
                <div className="absolute right-0 bottom-[calc(100%+10px)] z-10 w-[300px] max-w-[calc(100vw-80px)] rounded-lg border border-line bg-panel px-4 py-3 shadow-lg">
                  {model.speedSource && (
                    <p className="mt-2 mb-0 text-[11px] text-fg-2">
                      Speed snapshot: {model.speedSource.fetchedAt.slice(0, 10)}
                    </p>
                  )}
                  {model.timeEstimate && (
                    <p className="mt-2 mb-0 text-[11px] leading-5 text-fg-2">
                      Local time estimate. Uses standard Sol High task tokens at Max-measured
                      throughput.
                      <br />
                      {model.timeEstimate.baselineTokens.toFixed(1)} tokens ÷{' '}
                      {format(model.speed, 'speed')} tokens/s. Baseline:{' '}
                      {model.timeEstimate.baselineFetchedAt.slice(0, 10)}
                    </p>
                  )}
                </div>
              </details>
            )}
            {pinned && (
              <button
                className="-my-2 -mr-2 flex size-10 shrink-0 items-center justify-center rounded-md text-fg-2 hover:bg-hover hover:text-accent"
                onClick={onClose}
                aria-label="Close model details"
              >
                <X size={15} aria-hidden="true" />
              </button>
            )}
          </div>
          <dl className="mt-2 mb-0 grid grid-cols-5 gap-x-3 gap-y-3 phone:grid-cols-2">
            {(
              [
                metric === 'omniscience'
                  ? ['AA-Omniscience Index', format(model.omniscience, 'omniscience')]
                  : ['Intelligence index', format(model.intelligence, 'intelligence')],
                ['Cost per task', format(model.cost, 'cost')],
                ['Time per task', formatModelValue(model, 'time')],
                ['Tokens per task', format(model.tokens, 'tokens')],
                ['Output tokens / s', format(model.speed, 'speed')],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-[10px] text-fg-2">{label}</dt>
                <dd className="m-0 mt-0.5 text-[17px] font-medium tracking-[-0.4px] phone:text-[16px]">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </>
      ) : (
        <div className="flex min-h-[88px] short:min-h-[72px] flex-col justify-center gap-1">
          <strong className="text-[12px] font-medium">Configuration details</strong>
          <span className="text-[12px] text-fg-2 phone:hidden">
            Hover or focus a configuration to preview it. Click to pin its measurements.
          </span>
          <span className="hidden text-[12px] text-fg-2 phone:inline">
            Tap a point or model label to pin its measurements.
          </span>
        </div>
      )}
    </div>
  );
}
