import type { Model } from './schema';

// Provider measurements stay separate from the original benchmark snapshot.
// Unmeasured task metrics must remain null rather than inherit standard-tier values.
export const speedEndpoints = [
  {
    id: 'gpt-6-1-sol-ultrafast',
    family: 'gpt-6-1-sol-ultrafast',
    name: 'GPT-6.1 Sol Ultrafast',
    lab: 'openai',
    labName: 'OpenAI',
    released: null,
    open: false,
    deprecated: false,
    effort: 'max',
    effortLabel: 'Max',
    effortOrder: 60,
    intelligence: null,
    cost: null,
    costTotal: null,
    tokens: null,
    tokensTotal: null,
    speed: 336.4,
    time: null,
    speedSource: {
      url: 'https://artificialanalysis.ai/models/gpt-6-1-sol/providers',
      fetchedAt: '2026-10-17',
    },
  },
] satisfies Model[];
