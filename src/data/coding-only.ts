import type { Model } from './schema';

export const codingOnlyDescription = 'Equal-weight average of Terminal-Bench 4.0 and FrontierCode 2.0 on a 0–100 scale. Both scores are required. Cost remains the Intelligence Index cost per task.';

/** Both benchmarks report fractions. Missing scores stay missing; measured zero is valid. */
export function codingOnlyRows(rows: Model[]): Model[] {
  return rows.map((model) => ({
    ...model,
    codingIndex: model.terminalBench40 == null || model.frontierCode20 == null
      ? null
      : (model.terminalBench40 + model.frontierCode20) * 50,
  }));
}
