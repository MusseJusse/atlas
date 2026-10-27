import { expect, it } from 'vitest';
import { readEfficiencySettings, writeEfficiencySettings } from './efficiency-state';

it('defaults to cost and all thresholds, while preserving an explicit empty selection', () => {
  expect(readEfficiencySettings('')).toEqual({ metric: 'cost', thresholds: [10, 20, 30, 40, 50, 60] });
  expect(readEfficiencySettings('?thresholds=')).toEqual({ metric: 'cost', thresholds: [] });
});

it('normalizes shared URLs and keeps benchmark filters out of the efficiency page', () => {
  const settings = readEfficiencySettings('?page=efficiency&metric=speed&thresholds=40,20,40,35,bad&selected=gpt-6-1-sol');
  expect(settings).toEqual({ metric: 'speed', thresholds: [20, 40] });
  const url = writeEfficiencySettings(settings);
  expect(readEfficiencySettings(url)).toEqual(settings);
  expect(new URLSearchParams(url.slice(1)).has('selected')).toBe(false);
  expect(readEfficiencySettings('?metric=invalid&thresholds=bad')).toEqual({ metric: 'cost', thresholds: [] });
  expect(readEfficiencySettings(writeEfficiencySettings(readEfficiencySettings('?thresholds=')))).toEqual({ metric: 'cost', thresholds: [] });
});
