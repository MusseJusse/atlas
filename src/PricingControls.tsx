import { useEffect, useId, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Settings } from './state';
import { subscriptionProviders, subscriptionSource } from './data/subscriptions';

/** One shared pricing state for the two full-index task-cost views. */
export function PricingControls({ settings, update }: {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
}) {
  const id = useId();
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !menu.current?.contains(event.target) && menu.current)
        menu.current.open = false;
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, []);
  return (
    <div className="relative flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-line py-1 text-[12px]">
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
      <details ref={menu} className="group ml-auto" onKeyDown={(event) => {
        if (event.key === 'Escape' && menu.current?.open) {
          menu.current.open = false;
          menu.current.querySelector('summary')?.focus();
          event.stopPropagation();
        }
      }}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-sm px-2 text-fg-2 focus-visible:outline-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden">
          Plans <ChevronDown size={13} aria-hidden="true" />
        </summary>
        <div className="absolute top-full right-0 z-30 max-h-[calc(100dvh-var(--header-height)-180px)] w-[310px] max-w-[calc(100vw-64px)] space-y-3 overflow-y-auto overscroll-contain rounded-lg border border-line bg-panel p-4 shadow-lg">
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
          <p className="m-0 text-[11px] leading-5 text-fg-2">Plans apply to estimated subscription pricing. Source-linked bonus resets use the captured 30-day window. Banked and unconfirmed resets are excluded.</p>
          <a className="inline-block py-1 text-[11px] text-fg-2 underline underline-offset-4" href="https://mypriors.com/benchmarks/subscription-token-price">
            Pricing captured {subscriptionSource.capturedAt.slice(0, 10)}
          </a>
        </div>
      </details>
    </div>
  );
}
