import { z } from 'zod';

const nonnegative = z.number().nonnegative();
const positive = z.number().positive();
const text = z.string().min(1);
const prices = z.object({ cached: nonnegative, input: nonnegative, cacheWrite: nonnegative, output: nonnegative });
export const subscriptionSchema = z.object({
  capturedAt: z.iso.datetime(),
  sourceGeneratedAt: z.iso.datetime(),
  source: z.url(),
  sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
  methodology: z.url(),
  models: z.array(z.object({
    family: text,
    sourceModel: text,
    provider: text,
    providerName: text,
    defaultPlan: text,
    dataDate: text,
    mix: z.object({ cache: nonnegative, input: nonnegative, cacheWrite: nonnegative, output: nonnegative })
      .refine((mix) => Math.abs(mix.cache + mix.input + mix.cacheWrite + mix.output - 1) < 1e-9, 'Token mix must sum to one.'),
    apiPrices: prices,
    plans: z.array(z.object({
      id: text, feeUsd: positive, usdPerMtok: nonnegative, confidence: z.enum(['high', 'medium', 'low']),
      // The upstream's synthetic month is four weeks, not a calendar month.
      periodDays: positive,
    })).nonempty(),
  })).superRefine((models, ctx) => {
    if (new Set(models.map((model) => model.family)).size !== models.length)
      ctx.addIssue({ code: 'custom', message: 'Duplicate subscription family.' });
    for (const model of models) {
      if (!model.plans.some((plan) => plan.id === model.defaultPlan) || new Set(model.plans.map((plan) => plan.id)).size !== model.plans.length)
        ctx.addIssue({ code: 'custom', message: `Invalid plans for ${model.family}.` });
    }
  }),
  resets: z.array(z.object({
    provider: text,
    source: z.url(),
    clock: z.enum(['fixed', 'restart']),
    events: z.array(z.object({
      at: z.iso.datetime(),
      kind: z.enum(['reset', 'banked', 'both']),
      scope: text,
      source: z.url(),
      // A tracker observation alone is insufficient evidence for a bonus.
      providerConfirmed: z.boolean(),
    })),
  })),
});
export type SubscriptionSnapshot = z.infer<typeof subscriptionSchema>;
export type SubscriptionModel = SubscriptionSnapshot['models'][number];
export type SubscriptionPlan = SubscriptionModel['plans'][number];
