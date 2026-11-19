import type { Model } from './schema';

export type VibeLabelPlacement = 'right' | 'left' | 'below' | 'above';

export type VibeModelEntry = {
  /** Model family id matching `benchmarks.json`. */
  family: string;
  /** Subjective Capability score (0-100, Y-axis). */
  capability: number;
  /** Subjective Coherency score (0-100, X-axis). */
  coherency: number;
  /** Label offset direction in flat 2D view. */
  labelPlacement: VibeLabelPlacement;
  /** Label offset direction in 3D cost view. */
  labelPlacement3D: VibeLabelPlacement;
  /** Optional override for narrow/compact 2D and 3D plots. */
  compactLabelPlacement?: VibeLabelPlacement;
  compactLabelPlacement3D?: VibeLabelPlacement;
  /** Short personal summary of how this model feels to use. */
  summary: string;
};

export type UseCaseIcon = 'coding' | 'copywriting' | 'digging-deep' | 'cheap' | 'computer-use';

export type UseCaseRecommendation = {
  id: string;
  label: string;
  family: string;
  icon: UseCaseIcon;
  note: string;
};

export const vibeModels: readonly VibeModelEntry[] = [
  {
    family: 'claude-fable-5-2',
    capability: 91,
    coherency: 68,
    labelPlacement: 'right',
    labelPlacement3D: 'right',
    compactLabelPlacement: 'above',
    compactLabelPlacement3D: 'above',
    summary: 'Highest overall capability while staying coherent and grounded on complex work.',
  },
  {
    family: 'gpt-6-2-astra',
    capability: 90,
    coherency: 19,
    labelPlacement: 'right',
    labelPlacement3D: 'right',
    summary: 'Frontier raw problem-solving ceiling, though it takes more steering to keep on track.',
  },
  {
    family: 'claude-opus-5-5',
    capability: 80,
    coherency: 68,
    labelPlacement: 'left',
    labelPlacement3D: 'left',
    summary: 'Dependable daily driver for coding with a strong ceiling and coherent execution.',
  },
  {
    family: 'gpt-6-2-sol',
    capability: 72,
    coherency: 40,
    labelPlacement: 'below',
    labelPlacement3D: 'right',
    summary: 'Tenacious and fast for digging deep into thorny issues and driving computer-use loops.',
  },
  {
    family: 'gemini-4-neon',
    capability: 70,
    coherency: 79,
    labelPlacement: 'below',
    labelPlacement3D: 'right',
    compactLabelPlacement3D: 'below',
    summary: 'Most coherent feel on the map, with smooth prose, snappy iteration, and strong copywriting instincts.',
  },
  {
    family: 'gemini-4-carbon',
    capability: 18,
    coherency: 38,
    labelPlacement: 'right',
    labelPlacement3D: 'left',
    summary: 'Benchmarks look solid on paper, but day-to-day capability and coherency trail Neon.',
  },
  {
    family: 'gpt-6-1-terra',
    capability: 48,
    coherency: 30,
    labelPlacement: 'right',
    labelPlacement3D: 'right',
    summary: 'Low-cost everyday workhorse when you want quick, cheap, and cheerful output without overthinking spend.',
  },
];

export const axisDefinitions = {
  capability: 'At its best, what can it do',
  coherency: "Does it understand what it's doing",
} as const;

export const reasoningGuidance = {
  title: 'Reasoning effort',
  quote: 'Lighting tokens on fire so you can wait longer for worse answers.',
} as const;

export const useCaseRecommendations: readonly UseCaseRecommendation[] = [
  {
    id: 'coding',
    label: 'Coding',
    family: 'claude-opus-5-5',
    icon: 'coding',
    note: 'Default pick for day-to-day engineering: strong edits, clean structure, and reliable taste.',
  },
  {
    id: 'copywriting',
    label: 'Copywriting',
    family: 'gemini-4-neon',
    icon: 'copywriting',
    note: 'Highest coherency on the board, with natural phrasing and responsive tone adjustments.',
  },
  {
    id: 'digging-deep',
    label: 'Digging deep on an issue',
    family: 'gpt-6-2-sol',
    icon: 'digging-deep',
    note: 'Great when you need methodical root-cause investigation without blowing the token budget.',
  },
  {
    id: 'cheap-and-cheerful',
    label: 'Cheap & cheerful',
    family: 'gpt-6-1-terra',
    icon: 'cheap',
    note: 'Very cheap per task while still fast and capable for lighter daily jobs.',
  },
  {
    id: 'computer-use',
    label: 'Computer use',
    family: 'gpt-6-2-sol',
    icon: 'computer-use',
    note: 'Snappy and steady across multi-step UI and tool-driven workflows.',
  },
];

export type ResolvedVibeModel = VibeModelEntry & {
  model: Model;
  useCases: readonly UseCaseRecommendation[];
};

export type ResolvedUseCase = UseCaseRecommendation & {
  entry: ResolvedVibeModel;
};

function requireHighEffortModel(family: string, variants: readonly Model[]): Model {
  const high = variants.find((variant) => variant.effort === 'high');
  if (!high) {
    throw new Error(`Vibes model "${family}" is missing a high-effort benchmark record.`);
  }
  return high;
}

/** Resolve personal vibe entries and use-case recommendations against high-effort records in the benchmark snapshot. */
export function resolveVibes(models: readonly Model[]) {
  const byFamily = new Map<string, Model[]>();
  for (const model of models) {
    const variants = byFamily.get(model.family) ?? [];
    variants.push(model);
    byFamily.set(model.family, variants);
  }

  const useCasesByFamily = new Map<string, UseCaseRecommendation[]>();
  for (const recommendation of useCaseRecommendations) {
    const list = useCasesByFamily.get(recommendation.family) ?? [];
    list.push(recommendation);
    useCasesByFamily.set(recommendation.family, list);
  }

  const resolvedModels: ResolvedVibeModel[] = [];
  for (const entry of vibeModels) {
    const variants = byFamily.get(entry.family);
    if (!variants?.length) {
      throw new Error(`Vibes model "${entry.family}" was not found in the benchmark snapshot.`);
    }
    resolvedModels.push({
      ...entry,
      model: requireHighEffortModel(entry.family, variants),
      useCases: useCasesByFamily.get(entry.family) ?? [],
    });
  }

  const modelMap = new Map(resolvedModels.map((entry) => [entry.family, entry]));
  const recommendations: ResolvedUseCase[] = useCaseRecommendations.map((recommendation) => {
    const entry = modelMap.get(recommendation.family);
    if (!entry) {
      throw new Error(`Use-case recommendation "${recommendation.id}" references unknown family "${recommendation.family}".`);
    }
    return { ...recommendation, entry };
  });

  return {
    models: resolvedModels,
    recommendations,
    byFamily: modelMap,
  };
}
