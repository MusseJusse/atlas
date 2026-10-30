import type { Model } from './schema';

export const codingOnlyDescription = 'All charts use models measured on Terminal-Bench 4.0 and FrontierCode 2.0. Scores and per-task cost, tokens and decode time weight the two benchmarks equally. Totals cover their 66 and 132 tasks. Omniscience retains its own score.';

type CodingEvaluation = {
  slug: string;
  costPerTask?: number | null;
  outputTokensPerTask?: number | null;
  timePerTask?: number | null;
};

const average = (a: number | null | undefined, b: number | null | undefined) =>
  a == null || b == null ? null : (a + b) / 2;

// AA publishes these task counts for the fixed benchmark versions, excluding repeats.
const total = (terminal: number | null | undefined, frontier: number | null | undefined) =>
  terminal == null || frontier == null ? null : terminal * 66 + frontier * 132;

/** Use each evaluation's unweighted per-task measurements, requiring both for each metric. */
export function codingWorkload(evaluations: readonly CodingEvaluation[]) {
  const terminal = evaluations.find((evaluation) => evaluation.slug === 'terminalbench-4-0');
  const frontier = evaluations.find((evaluation) => evaluation.slug === 'frontiercode-2-0');
  return {
    codingCost: average(terminal?.costPerTask, frontier?.costPerTask),
    codingTokens: average(terminal?.outputTokensPerTask, frontier?.outputTokensPerTask),
    codingTime: average(terminal?.timePerTask, frontier?.timePerTask),
    codingTokensTotal: total(terminal?.outputTokensPerTask, frontier?.outputTokensPerTask),
    codingCostTotal: total(terminal?.costPerTask, frontier?.costPerTask),
  };
}

/** Switch the shared chart dataset without mutating the original Intelligence Index measurements. */
export function codingOnlyRows(rows: Model[]): Model[] {
  return rows.flatMap((model) => model.terminalBench40 == null || model.frontierCode20 == null ? [] : [{
    ...model,
    codingIndex: (model.terminalBench40 + model.frontierCode20) * 50,
    cost: model.codingCost,
    tokens: model.codingTokens,
    time: model.codingTime,
    tokensTotal: model.codingTokensTotal,
    costTotal: model.codingCostTotal,
    timeEstimate: undefined,
  }]);
}
