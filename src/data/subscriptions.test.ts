import { expect, it } from 'vitest';
import { models } from '../models';
import source from './subscriptions.json';
import { subscriptionSchema, type SubscriptionSnapshot } from './subscription-schema';
import { allowanceResetBoost, blendedApiPrice, pricingDisclosure, readSubscriptionPlans, resetBoost, subscriptionRows, subscriptionSource, usesSubscriptionPricing } from './subscriptions';
import { defaults, readSettings, writeSettings } from '../state';

it('validates the captured source and named default plans', () => {
  expect(subscriptionSchema.parse(source)).toEqual(source);
  for (const data of subscriptionSource.models) {
    expect(data.plans.some((plan) => plan.id === data.defaultPlan)).toBe(true);
  }
});

const settings = { ...defaults, pricingMode: 'subscription' as const };
const sol = models.find((model) => model.id === 'gpt-6-1-sol-xhigh')!;

it('uses the exact external mix and selected plan without rounding or mutating measured values', () => {
  const data = subscriptionSource.models.find((model) => model.family === sol.family)!;
  expect(blendedApiPrice(data)).toBeCloseTo(0.197, 12);
  const selected = { ...settings, subscriptionPlans: { openai: 'ChatGPT Plus' } };
  const [priced] = subscriptionRows([sol], selected);
  const plan = data.plans.find((plan) => plan.id === 'ChatGPT Plus')!;
  expect(priced?.cost).toBe(sol.cost! * (plan.usdPerMtok / blendedApiPrice(data)));
  expect(priced?.taskPricing).toMatchObject({ basis: 'subscription', apiCost: sol.cost, plan: 'ChatGPT Plus' });
  expect(priced?.costTotal).toBe(sol.costTotal);
  expect(sol.taskPricing).toBeUndefined();
  expect(subscriptionRows([sol], defaults)[0]).toBe(sol);
});

it('preserves missing/zero costs and explicitly falls back for unknown models, plans or changed API prices', () => {
  expect(subscriptionRows([{ ...sol, cost: null }], settings)[0]?.cost).toBeNull();
  expect(subscriptionRows([{ ...sol, cost: 0 }], settings)[0]?.cost).toBe(0);
  for (const [model, config] of [
    [{ ...sol, family: 'future-sol' }, settings],
    [sol, { ...settings, subscriptionPlans: { openai: 'unknown' } }],
    [{ ...sol, inputPrice: 99 }, settings],
  ] as const) {
    const [priced] = subscriptionRows([model], config);
    expect(priced?.cost).toBe(model.cost);
    expect(priced?.taskPricing?.basis).toBe('api-fallback');
  }
});

it('round trips pricing controls and ignores unsupported URL plans', () => {
  const configured = { ...settings, countResets: true, subscriptionPlans: { anthropic: 'Claude Max 5x', openai: 'ChatGPT Plus' } };
  expect(readSettings(writeSettings(configured, 'cost-task'))).toEqual(configured);
  expect(readSubscriptionPlans(['openai:nope', 'unknown:ChatGPT Plus'])).toEqual({});
  expect(readSettings('?pricing=unknown').pricingMode).toBe('api');
});

const event = (at: string, extra = {}) => ({ at, kind: 'reset' as const, scope: 'all', source: 'https://example.com/reset', providerConfirmed: true, ...extra });
function resetSource(clock: 'fixed' | 'restart', events: SubscriptionSnapshot['resets'][number]['events']): SubscriptionSnapshot {
  return { ...subscriptionSource, sourceGeneratedAt: '2026-11-01T00:00:00.000Z', resets: [{ provider: 'test', clock, source: 'https://example.com', events }] };
}

it('normalizes 30-day bonus tokens to a 28-day allowance period', () => {
  expect(allowanceResetBoost(400, 28, 100)).toBeCloseTo(1 + 100 * 28 / 30 / 400, 14);
  expect(allowanceResetBoost(400, 28, 0)).toBe(1);
});

it('counts only eligible fixed-clock bonus events inside the capture-ended window', () => {
  const source = resetSource('fixed', [
    event('2026-10-02T00:00:00.000Z'), // exact cutoff excluded
    event('2026-10-10T00:00:00.000Z'),
    event('2026-10-11T00:00:00.000Z', { kind: 'banked' }),
    event('2026-10-12T00:00:00.000Z', { scope: 'affected users' }),
    event('2026-10-13T00:00:00.000Z', { providerConfirmed: false }),
    event('2026-11-01T00:00:00.000Z'), // exact end included
    event('2026-11-02T00:00:00.000Z'),
  ]);
  expect(resetBoost('test', 28, source)).toBeCloseTo(1 + 2 * 7 / 30, 14);
  expect(resetBoost('test', 30, source)).toBeCloseTo(resetBoost('test', 28, source), 14);
  expect(resetBoost('unknown', 28, source)).toBe(1);
});

it('subtracts displaced weekly allowance for restarted clocks and requires prior cycle evidence', () => {
  const source = resetSource('restart', [event('2026-10-01T00:00:00.000Z'), event('2026-10-04T12:00:00.000Z')]);
  expect(resetBoost('test', 28, source)).toBeCloseTo(1 + 0.5 * 7 / 30, 14);
  expect(resetBoost('test', 28, resetSource('restart', [event('2026-10-10T00:00:00.000Z')]))).toBe(1);
  expect(resetBoost('test', 28, resetSource('restart', [event('2026-10-01T00:00:00.000Z'), event('2026-10-08T00:00:00.000Z')]))).toBe(1);
  expect(resetBoost('test', 28, resetSource('restart', [event('2026-10-01T00:00:00.000Z', { providerConfirmed: false }), event('2026-10-04T12:00:00.000Z')]))).toBe(1);
});

it('changes costs with source-supported resets and scopes conversion to full-index cost views', () => {
  const [baseline] = subscriptionRows([sol], settings);
  const [reset] = subscriptionRows([sol], { ...settings, countResets: true });
  expect(reset!.cost).toBeLessThan(baseline!.cost!);
  expect(usesSubscriptionPricing('cost-intelligence', settings)).toBe(true);
  expect(usesSubscriptionPricing('cost-task', settings)).toBe(true);
  expect(usesSubscriptionPricing('cost-task', { ...settings, codingOnly: true })).toBe(false);
  for (const id of ['tokens-task', 'intelligence', 'coding-agents', 'cyber-index', 'cost-total'])
    expect(usesSubscriptionPricing(id, settings)).toBe(false);
  expect(pricingDisclosure([baseline!], false).join(' ')).toContain('External coding token mix');
});

it('fails closed on any benchmark revision, including unseen cache-price changes', () => {
  const [priced] = subscriptionRows([sol], settings, 'changed-cache-price-source');
  expect(priced?.cost).toBe(sol.cost);
  expect(priced?.taskPricing).toEqual({ basis: 'api-fallback', reason: 'Benchmark data refreshed. Subscription pricing needs recapture.' });
});

it('only discloses fallback when the rendered chart rows contain fallback models', () => {
  const rows = subscriptionRows([sol, { ...sol, family: 'unknown' }], settings);
  expect(pricingDisclosure(rows, false).join(' ')).toContain('Includes API fallback');
  expect(pricingDisclosure(rows.filter((row) => row.taskPricing?.basis === 'subscription'), false).join(' ')).not.toContain('Includes API fallback');
});
