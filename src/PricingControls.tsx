import { useId } from 'react';
import type { Settings } from './state';
import { subscriptionProviders, subscriptionSource } from './data/subscriptions';
import { formatUtcDate } from './formatDate';
import { Select } from './Select';
import { Selection } from './Selection';

/** Pricing settings reuse global state inside each eligible chart settings menu. */
export function PricingControls({ settings, update }: {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
}) {
  const id = useId();
  const subscription = settings.pricingMode === 'subscription';
  return (
    <div className="w-full shrink-0 border-b border-line px-2 pt-2 pb-4 text-[13px]">
      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className="p-0 text-[13px] font-[600] text-fg">Task cost</legend>
        <p className="mt-0.5 mb-3 text-[12px] leading-5 text-fg-2">Applies to cost charts. Subscription costs are estimates.</p>
        <div className="flex gap-0.5 rounded-lg bg-track p-0.5">
          {(['api', 'subscription'] as const).map((mode) => (
            <label key={mode} className="flex min-h-8 flex-1 text-[12px] cursor-pointer items-center justify-center rounded-md px-2 font-[500] has-[:checked]:bg-thumb has-[:checked]:shadow-[var(--shadow-raised)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent has-[:focus-visible]:outline-offset-2">
              <input className="sr-only" type="radio" name={`${id}-pricing`} checked={settings.pricingMode === mode}
                onChange={() => update({ pricingMode: mode })} />
              <span className={`whitespace-nowrap ${settings.pricingMode === mode ? 'text-accent' : 'text-fg-2 hover:text-fg'}`}>
                {mode === 'api' ? 'API prices' : 'Subscription'}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {/* Plans only change subscription estimates, so they stay out of the way for API prices. */}
      {subscription && (
        <div className="mt-4">
          <div className="grid grid-cols-[max-content_minmax(0,1fr)] items-center gap-x-3 gap-y-2 max-[360px]:grid-cols-1 max-[360px]:gap-y-1 max-[360px]:[&>label:first-child>span]:mt-0">
            {subscriptionProviders.map((provider) => (
              <label key={provider.id} className="contents">
                <span className="text-[12px] text-fg-2 max-[360px]:mt-1">{provider.name}</span>
                <Select
                  value={settings.subscriptionPlans[provider.id] ?? ''}
                  onChange={(event) => {
                    const plans = { ...settings.subscriptionPlans };
                    if (event.target.value) plans[provider.id] = event.target.value;
                    else delete plans[provider.id];
                    update({ subscriptionPlans: plans });
                  }}>
                  <option value="">Default for each model</option>
                  {provider.plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.id}, ${plan.feeUsd}/mo</option>)}
                </Select>
              </label>
            ))}
          </div>
          <label className="-mx-2 mt-3 flex min-h-10 cursor-pointer items-center gap-2.5 rounded-md px-2 text-fg hover:bg-hover has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent">
            <input className="sr-only" type="checkbox" checked={settings.countResets} onChange={(event) => update({ countResets: event.target.checked })} />
            <Selection checked={settings.countResets} />
            Count bonus resets
          </label>
          <p className="mt-1 mb-0 text-[12px] leading-5 text-fg-2">
            Counts confirmed resets in the 30 days before capture. Excludes banked and unconfirmed resets.
          </p>
          <p className="mt-2 mb-0 text-[12px] leading-5 text-fg-2">
            <a className="underline underline-offset-4 hover:text-accent" href="https://mypriors.com/benchmarks/subscription-token-price" target="_blank" rel="noreferrer">
              MyPriors prices, {formatUtcDate(subscriptionSource.capturedAt, 'short')}
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
