import type { Model } from '../data/schema';
import { subscriptionSource } from '../data/subscriptions';
import { formatUtcDate } from '../formatDate';

export function taskCostLabel(model: Model) {
  return model.taskPricing?.basis === 'subscription' ? 'Estimated subscription cost per task'
    : model.taskPricing?.basis === 'api-fallback' ? 'Cost per task (API fallback)' : 'Cost per task (API)';
}

/** Allowance dates arrive as a day, a month, or a "start~end" range, and read like other Atlas dates ("8 Sep 2026 to 30 Oct 2026"). */
export function allowanceDate(raw: string) {
  return raw.split('~').map((part) =>
    /^\d{4}-\d{2}-\d{2}$/.test(part) ? formatUtcDate(`${part}T00:00:00Z`, 'short')
      : /^\d{4}-\d{2}$/.test(part) ? new Date(`${part}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
        : part).join(' to ');
}

/** Keep estimate provenance available in both the desktop inspector and phone ranges. */
export function PricingDetails({ model, pinned = true }: { model: Model; pinned?: boolean }) {
  const pricing = model.taskPricing;
  if (!pricing) return null;
  if (pricing.basis === 'api-fallback') return <p className="mt-2 mb-0 text-[11px] leading-5 text-fg-2">API fallback. {pricing.reason}</p>;
  return (
    <div className="mt-2 text-[11px] leading-5 text-fg-2">
      <p className="m-0">{pricing.plan}, ${pricing.feeUsd}/mo. Estimate confidence: {pricing.confidence}.</p>
      <p className="m-0">Allowance data: {allowanceDate(pricing.dataDate)}. {pricing.resetBoost > 1 ? `Bonus resets boost allowance ×${pricing.resetBoost.toFixed(2)}.` : 'No bonus reset boost.'}</p>
      <p className="mt-1 mb-0">
        {pricing.reading
          ? `API-cost ratio from MyPriors: ${pricing.reading}.`
          : 'External coding token mix across reasoning levels. Model allowances are not additive.'}
        {pricing.sameAs && ` Allowance based on ${pricing.sameAs}.`}
      </p>
      <a href="https://mypriors.com/benchmarks/subscription-token-price" target="_blank" rel="noreferrer" tabIndex={pinned ? undefined : -1} className="inline-block py-1 underline underline-offset-4 hover:text-accent">
        MyPriors prices, {formatUtcDate(subscriptionSource.capturedAt, 'short')}
      </a>
    </div>
  );
}
