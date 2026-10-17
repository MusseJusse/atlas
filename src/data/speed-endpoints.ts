import type { Model } from './schema';
import snapshot from 'virtual:benchmarks';

const ultrafastSpeed = 336.4;
const standardSolMax = snapshot.models.find((model) => model.id === 'gpt-6-1-sol');
// Reuse the matching Max workload's token use, scaling its decode time by endpoint speed.
const timeEstimate =
  standardSolMax?.time != null && standardSolMax.speed != null && standardSolMax.speed > 0
    ? {
        baselineModelId: standardSolMax.id,
        baselineTime: standardSolMax.time,
        baselineSpeed: standardSolMax.speed,
        baselineFetchedAt: snapshot.fetchedAt,
      }
    : undefined;

// Provider measurements stay separate from the original benchmark snapshot.
// Only decode time is estimated; other unmeasured task metrics stay null.
export const speedEndpoints = [
  {
    id: 'gpt-6-1-sol-ultrafast',
    family: 'gpt-6-1-sol-ultrafast',
    parentFamily: 'gpt-6-1-sol',
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
    speed: ultrafastSpeed,
    time: timeEstimate ? (timeEstimate.baselineTime * timeEstimate.baselineSpeed) / ultrafastSpeed : null,
    timeEstimate,
    speedSource: {
      url: 'https://artificialanalysis.ai/models/gpt-6-1-sol/providers',
      fetchedAt: '2026-10-17',
    },
  },
] satisfies (Model & { parentFamily: string })[];
