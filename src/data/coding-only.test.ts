import { expect, it } from 'vitest';
import { codingOnlyRows, codingWorkload } from './coding-only';
import { models, paretoFrontier } from '../models';
import { measureScatterRows, measureRows } from '../charts/geometry';

const model = models[0]!;
const workload = { codingCost: 3, codingTokens: 15000, codingTime: 150, codingTokensTotal: 3300000, codingCostTotal: 660 };
const evaluations = [
  { slug: 'terminalbench-4-0', costPerTask: 2, outputTokensPerTask: 10000, timePerTask: 100 },
  { slug: 'frontiercode-2-0', costPerTask: 4, outputTokensPerTask: 20000, timePerTask: 200 },
];

it('weights per-task workloads equally and sums one full run of 66 and 132 tasks for totals', () => {
  expect(codingWorkload([...evaluations, { slug: 'unrelated', costPerTask: 999 }])).toEqual(workload);
  expect(codingWorkload([...evaluations].reverse())).toEqual(workload);
});

it('preserves measured zeros and missing measurements independently for each workload metric', () => {
  expect(codingWorkload(evaluations.map((e) => ({ ...e, costPerTask: 0, timePerTask: null }))))
    .toEqual({ ...workload, codingCost: 0, codingCostTotal: 0, codingTime: null });
  expect(Object.values(codingWorkload(evaluations.slice(0, 1)))).toEqual([null, null, null, null, null]);
});

it('switches every workload measurement without mutating original data or Omniscience scores', () => {
  const input = { ...model, ...workload, intelligence: 99, omniscience: -5,
    terminalBench40: 0.8, frontierCode20: 0.2, cost: 999, tokens: 999, time: 999, tokensTotal: 999, costTotal: 999 };
  const [coding] = codingOnlyRows([input]);
  expect(coding).toMatchObject({ codingIndex: 50, cost: 3, tokens: 15000, time: 150,
    tokensTotal: 3300000, costTotal: 660, intelligence: 99, omniscience: -5 });
  expect(input.cost).toBe(999);
  expect(input).not.toHaveProperty('codingIndex');
  for (const metric of ['codingIndex', 'cost', 'tokens', 'tokensTotal', 'time', 'omniscience'] as const)
    expect(measureRows([coding!], metric)).toHaveLength(1);
});

it('requires both component scores for all charts and distinguishes zero from unmeasured', () => {
  const rows = codingOnlyRows([
    { ...model, ...workload, terminalBench40: null, frontierCode20: 0.9 },
    { ...model, ...workload, terminalBench40: 0.9, frontierCode20: null },
    { ...model, ...workload, id: 'zero', intelligence: null, terminalBench40: 0, frontierCode20: 0 },
  ]);
  expect(rows.map((row) => row.codingIndex)).toEqual([0]);
  expect(measureScatterRows(rows, 'cost', false, 'codingIndex').map((row) => [row.id, row.score]))
    .toEqual([['zero', 0]]);
});

it('uses coding cost and score for dominance and preserves linear/log eligibility', () => {
  const rows = codingOnlyRows([
    { ...model, id: 'cheap', cost: 99, codingCost: 1, intelligence: 10, terminalBench40: 0.8, frontierCode20: 0.8 },
    { ...model, id: 'expensive', cost: 0.1, codingCost: 2, intelligence: 99, terminalBench40: 0.6, frontierCode20: 0.6 },
    { ...model, id: 'free', codingCost: 0, terminalBench40: 0, frontierCode20: 0 },
    { ...model, id: 'missing-cost', codingCost: null, terminalBench40: 1, frontierCode20: 1 },
  ]);
  expect(paretoFrontier(rows, 'cost', (row) => row.codingIndex).map((row) => row.id))
    .toEqual(['free', 'cheap']);
  expect(measureScatterRows(rows, 'cost', false, 'codingIndex').map((row) => row.id))
    .toEqual(['cheap', 'expensive']);
  expect(measureScatterRows(rows, 'cost', true, 'codingIndex').map((row) => row.id))
    .toEqual(['cheap', 'expensive', 'free']);
});
