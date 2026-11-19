import type { Model } from '../data/schema';
import { subscriptionSource } from '../data/subscriptions';
import { formatUtcDate } from '../formatDate';

export function taskCostLabel(model: Model) {
  return model.taskPricing?.basis === 'subscription' ? 'Estimated subscription cost per task'
    : model.taskPricing?.basis === 'api-fallback' ? 'Cost per task (API fallback)' : 'Cost per task (API)';
}

/** Keep estimate provenance available in both the desktop inspector and phone ranges. */
export function PricingDetails({ model }: { model: Model }) {
  const pricing = model.taskPricing;
  if (!pricing) return null;
  if (pricing.basis === 'api-fallback') return <p className="mt-2 mb-0 text-[11px] leading-5 text-fg-2">API fallback. {pricing.reason}</p>;
  return (
    <div className="mt-2 text-[11px] leading-5 text-fg-2">
      <p className="m-0">{pricing.plan}, ${pricing.feeUsd} a month. Source confidence is {pricing.confidence}.</p>
      <p className="m-0">Allowance data: {pricing.dataDate}. {pricing.resetBoost > 1 ? `Bonus allowance ×${pricing.resetBoost.toFixed(2)}.` : 'No bonus reset discount.'}</p>
      <p className="mt-1 mb-0">
        {pricing.reading
          ? `API-cost ratio from MyPriors: ${pricing.reading}.`
          : 'External coding token mix applied across efforts; model allowances are not additive.'}
        {pricing.sameAs && ` Allowance based on ${pricing.sameAs}.`}
      </p>
      <a href="https://mypriors.com/benchmarks/subscription-token-price" className="inline-block py-1 underline underline-offset-4 hover:text-accent">
        Prices from {formatUtcDate(subscriptionSource.capturedAt, 'short')}
      </a>
    </div>
  );
}
