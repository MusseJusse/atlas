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
    <div className="w-full shrink-0 border-b border-line px-2 pt-1 pb-3 text-[12px]">
      <fieldset className="m-0 mb-3 flex min-w-0 gap-0.5 rounded-md border-0 bg-surface p-0.5">
        <legend className="sr-only">Task cost pricing</legend>
        {(['api', 'subscription'] as const).map((mode) => (
          <label key={mode} className="flex min-h-9 flex-1 cursor-pointer items-center justify-center rounded-[5px] has-[:checked]:bg-panel has-[:checked]:shadow-[var(--shadow-raised)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent has-[:focus-visible]:outline-offset-2">
            <input className="sr-only" type="radio" name={`${id}-pricing`} checked={settings.pricingMode === mode}
              onChange={() => update({ pricingMode: mode })} />
            <span className={settings.pricingMode === mode ? 'font-[550] text-accent' : 'text-fg-2 hover:text-fg'}>
              {mode === 'api' ? 'API' : 'Estimated subscription'}
            </span>
          </label>
        ))}
      </fieldset>
      <div className="space-y-3">
        {subscriptionProviders.map((provider) => (
          <label key={provider.id} className="block text-fg-2">
            {provider.name}
            <select className="mt-1 block min-h-10 w-full rounded-md border border-line-2 bg-panel px-2 text-[12px] text-fg hover:border-fg-3 focus-visible:outline-2 focus-visible:outline-accent"
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
          <input className="size-3.5 accent-[var(--accent)]" type="checkbox" checked={settings.countResets} onChange={(event) => update({ countResets: event.target.checked })} />
          Count bonus resets
        </label>
        <p className="m-0 text-[11px] leading-5 text-fg-2">Applies to Cost per task and Cost vs intelligence. Other charts retain API costs. Source-linked bonus resets use the captured 30-day window. Banked and unconfirmed resets are excluded.</p>
        <a className="inline-block py-1 text-[11px] text-fg-2 underline underline-offset-4 hover:text-accent" href="https://mypriors.com/benchmarks/subscription-token-price">
          Pricing captured {subscriptionSource.capturedAt.slice(0, 10)}
        </a>
      </div>
    </div>
  );
}
