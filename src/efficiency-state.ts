import { efficiencyThresholds } from './efficiency-data';

export function readEfficiencySettings(search: string) {
  const params = new URLSearchParams(search);
  const values = params.get('thresholds');
  const requested = new Set(values?.split(','));
  return {
    thresholds: efficiencyThresholds.filter((value) => values === null || requested.has(String(value))),
  };
}

export type EfficiencySettings = ReturnType<typeof readEfficiencySettings>;

export function writeEfficiencySettings({ thresholds }: EfficiencySettings) {
  const params = new URLSearchParams({ page: 'efficiency' });
  if (thresholds.length !== efficiencyThresholds.length)
    params.set('thresholds', thresholds.join(','));
  return `?${params}`;
}
