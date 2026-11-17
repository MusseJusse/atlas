import snapshot from 'virtual:subscriptions';
import type { Model } from './schema';
import type { SubscriptionModel, SubscriptionSnapshot } from './subscription-schema';

export const subscriptionSource = snapshot;
export type PricingSettings = {
  pricingMode: 'api' | 'subscription';
  subscriptionPlans: Record<string, string>;
  countResets: boolean;
};
export type TaskPricing =
  | { basis: 'api-fallback'; reason: string }
  | { basis: 'subscription'; apiCost: number | null; plan: string; feeUsd: number; confidence: string;
      dataDate: string; ratio: number; resetBoost: number };

const byFamily = new Map(snapshot.models.map((model) => [model.family, model]));
export const subscriptionProviders = [...new Map(snapshot.models.map((model) => [model.provider, {
  id: model.provider, name: model.providerName,
  plans: [...new Map(snapshot.models.filter((other) => other.provider === model.provider)
    .flatMap((other) => other.plans).map((plan) => [plan.id, plan])).values()]
    .sort((a, b) => a.feeUsd - b.feeUsd || a.id.localeCompare(b.id)),
}])).values()];

/** Unknown URL plan IDs are discarded; supported provider/plan pairs retain their exact names. */
export function readSubscriptionPlans(values: string[]) {
  return Object.fromEntries(subscriptionProviders.flatMap((provider) => {
    const plan = values.map((value) => value.split(':')).find(([id, ...parts]) =>
      id === provider.id && provider.plans.some((plan) => plan.id === parts.join(':')));
    return plan ? [[provider.id, plan.slice(1).join(':')]] : [];
  }));
}

export function blendedApiPrice(model: SubscriptionModel) {
  return model.mix.cache * model.apiPrices.cached + model.mix.input * model.apiPrices.input
    + model.mix.cacheWrite * model.apiPrices.cacheWrite + model.mix.output * model.apiPrices.output;
}

/** Normalize observed bonus tokens to the same source period as the base allowance. */
export function allowanceResetBoost(baseTokens: number, periodDays: number, observedBonusTokens: number) {
  return 1 + (observedBonusTokens * periodDays / 30) / baseTokens;
}

/** Source-linked bonus events only. Banked/targeted resets never earn a discount. */
export function resetBoost(provider: string, periodDays: number, source: SubscriptionSnapshot = snapshot) {
  const tracker = source.resets.find((reset) => reset.provider === provider);
  if (!tracker) return 1;
  const end = Date.parse(source.sourceGeneratedAt);
  const start = end - 30 * 864e5;
  const events = tracker.events.filter((event) => event.kind !== 'banked')
    .toSorted((a, b) => Date.parse(a.at) - Date.parse(b.at));
  let weeks = 0;
  for (const [index, event] of events.entries()) {
    const at = Date.parse(event.at);
    if (at <= start || at > end || !event.providerConfirmed || event.scope !== 'all') continue;
    if (tracker.clock === 'fixed') { weeks += 1; continue; }
    const previous = events[index - 1];
    // An unconfirmed intervening event makes the prior cycle boundary unknown.
    if (!previous?.providerConfirmed || previous.scope !== 'all') continue;
    const elapsedDays = (at - Date.parse(previous.at)) / 864e5;
    // The new full week displaces the unspent remainder of the previous weekly cycle.
    weeks += (elapsedDays % 7) / 7;
  }
  // Unit base allowance, with one weekly pool per seven days of the source period.
  return allowanceResetBoost(1, periodDays, weeks * 7 / periodDays);
}

/** Resolve only the main Intelligence Index task costs, preserving every measured API value. */
export function subscriptionRows(rows: Model[], settings: PricingSettings): Model[] {
  if (settings.pricingMode === 'api') return rows;
  return rows.map((model) => {
    const data = byFamily.get(model.family);
    const planId = settings.subscriptionPlans[data?.provider ?? ''] ?? data?.defaultPlan;
    const plan = data?.plans.find((plan) => plan.id === planId);
    // Benchmark refreshes also change scores and unrelated models. Validate rates per model.
    const reason = !data ? 'No subscription estimate for this model.'
      : !plan ? 'Selected plan has no estimate for this model.'
      : model.inputPrice !== data.apiPrices.input || model.outputPrice !== data.apiPrices.output
        ? 'API prices changed since the subscription capture.' : null;
    if (reason || !data || !plan)
      return { ...model, taskPricing: { basis: 'api-fallback', reason: reason ?? 'No comparable plan data.' } };
    const apiPrice = blendedApiPrice(data);
    if (apiPrice <= 0) return { ...model, taskPricing: { basis: 'api-fallback', reason: 'No comparable API token price.' } };
    const boost = settings.countResets ? resetBoost(data.provider, plan.periodDays) : 1;
    const ratio = plan.usdPerMtok / apiPrice / boost;
    return { ...model, cost: model.cost === null ? null : model.cost * ratio, taskPricing: {
      basis: 'subscription', apiCost: model.cost, plan: plan.id, feeUsd: plan.feeUsd,
      confidence: plan.confidence, dataDate: data.dataDate, ratio, resetBoost: boost,
    } };
  });
}

/** Apply subscription estimates only to the two cost views. */
export function usesSubscriptionPricing(viewId: string, settings: PricingSettings) {
  return settings.pricingMode === 'subscription'
    && (viewId === 'cost-intelligence' || viewId === 'cost-task');
}

export function pricingDisclosure(rows: Model[], countResets: boolean) {
  const plans = [...new Set(rows.flatMap((row) => row.taskPricing?.basis === 'subscription' ? [row.taskPricing.plan] : []))];
  return [
    'Estimated subscription. One model uses the full allowance. External coding token mix, shared across efforts.',
    `Pricing captured ${snapshot.capturedAt.slice(0, 10)}. ${plans.length ? plans.join('; ') : 'No supported plan estimates.'}`,
    `${countResets ? 'Source-linked bonus resets included where supported' : 'Bonus resets excluded'}. ${rows.some((row) => row.taskPricing?.basis === 'api-fallback') ? 'Includes API fallback.' : 'Subscription estimates only.'}`,
  ];
}
