import { useId } from 'react';
import type { Settings } from './state';
import { subscriptionProviders, subscriptionSource } from './data/subscriptions';

/** Pricing settings reuse global state inside each eligible chart settings menu. */
export function PricingControls({ settings, update }: {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
}) {
  const id = useId();
  return (
    <div className="w-full shrink-0 border-b border-line pb-3 text-[12px]">
      <fieldset className="m-0 flex min-w-0 gap-4 border-0 p-0">
        <legend className="sr-only">Task cost pricing</legend>
        {(['api', 'subscription'] as const).map((mode) => (
          <label key={mode} className="flex min-h-11 cursor-pointer items-center gap-1.5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent has-[:focus-visible]:outline-offset-2">
            <input className="sr-only" type="radio" name={`${id}-pricing`} checked={settings.pricingMode === mode}
              onChange={() => update({ pricingMode: mode })} />
            <span className={settings.pricingMode === mode ? 'font-semibold text-accent underline decoration-2 underline-offset-8' : 'text-fg-2'}>
              {mode === 'api' ? 'API' : 'Estimated subscription'}
            </span>
          </label>
        ))}
      </fieldset>
      <div className="space-y-3">
        {subscriptionProviders.map((provider) => (
          <label key={provider.id} className="block text-fg-2">
            {provider.name}
            <select className="mt-1 block min-h-11 w-full rounded-sm border border-line-2 bg-panel px-2 text-[12px] text-fg focus-visible:outline-2 focus-visible:outline-accent"
              value={settings.subscriptionPlans[provider.id] ?? ''}
              onChange={(event) => {
                const plans = { ...settings.subscriptionPlans };
                if (event.target.value) plans[provider.id] = event.target.value;
                else delete plans[provider.id];
                update({ subscriptionPlans: plans });
              }}>
              <option value="">Source default per model</option>
              {provider.plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.id} · ${plan.feeUsd}/mo</option>)}
            </select>
          </label>
        ))}
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-fg">
          <input type="checkbox" checked={settings.countResets} onChange={(event) => update({ countResets: event.target.checked })} />
          Count bonus resets
        </label>
        <p className="m-0 text-[11px] leading-5 text-fg-2">Applies to Cost per task and Cost vs intelligence. Other charts retain API costs. Source-linked bonus resets use the captured 30-day window. Banked and unconfirmed resets are excluded.</p>
        <a className="inline-block py-1 text-[11px] text-fg-2 underline underline-offset-4" href="https://mypriors.com/benchmarks/subscription-token-price">
          Pricing captured {subscriptionSource.capturedAt.slice(0, 10)}
        </a>
      </div>
    </div>
  );
}
