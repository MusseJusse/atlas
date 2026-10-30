import { expect, it } from 'vitest';
import { codingOnlyRows } from './coding-only';
import { models, paretoFrontier } from '../models';
import { measureScatterRows } from '../charts/geometry';

const model = models[0]!;

it('weights both fractional scores equally, preserving original measurements and measured zero', () => {
  const input = [
    { ...model, terminalBench40: 0.8, frontierCode20: 0.2 },
    { ...model, terminalBench40: 0, frontierCode20: 0 },
    { ...model, terminalBench40: 1, frontierCode20: 1 },
    { ...model, terminalBench40: 0.75, frontierCode20: 0.213456789 },
  ];
  const rows = codingOnlyRows(input);
  expect(rows.map((row) => row.codingIndex)).toEqual([50, 0, 100, (0.75 + 0.213456789) * 50]);
  expect(rows[0]).toEqual({ ...input[0], codingIndex: 50 });
  expect(input[0]).not.toHaveProperty('codingIndex');
});

it('omits a model missing either score, even if it has an Intelligence Index score', () => {
  const rows = codingOnlyRows([
    { ...model, id: 'missing-terminal', intelligence: 99, cost: 1, terminalBench40: null, frontierCode20: 0.9 },
    { ...model, id: 'missing-frontier', intelligence: 99, cost: 1, terminalBench40: 0.9, frontierCode20: null },
    { ...model, id: 'zero', intelligence: null, cost: 1, terminalBench40: 0, frontierCode20: 0 },
  ]);
  expect(rows.map((row) => row.codingIndex)).toEqual([null, null, 0]);
  expect(measureScatterRows(rows, 'cost', false, 'codingIndex').map((row) => [row.id, row.score]))
    .toEqual([['zero', 0]]);
});

it('uses coding scores for dominance while retaining the existing cost and axis eligibility', () => {
  const rows = codingOnlyRows([
    { ...model, id: 'cheap', cost: 1, intelligence: 10, terminalBench40: 0.8, frontierCode20: 0.8 },
    { ...model, id: 'expensive', cost: 2, intelligence: 99, terminalBench40: 0.6, frontierCode20: 0.6 },
    { ...model, id: 'free', cost: 0, terminalBench40: 0, frontierCode20: 0 },
    { ...model, id: 'missing-cost', cost: null, terminalBench40: 1, frontierCode20: 1 },
  ]);
  expect(paretoFrontier(rows, 'cost', (row) => row.codingIndex).map((row) => row.id))
    .toEqual(['free', 'cheap']);
  expect(measureScatterRows(rows, 'cost', false, 'codingIndex').map((row) => row.id))
    .toEqual(['cheap', 'expensive']);
  expect(measureScatterRows(rows, 'cost', true, 'codingIndex').map((row) => row.id))
    .toEqual(['cheap', 'expensive', 'free']);
});
