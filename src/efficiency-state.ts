import { efficiencyThresholds, type EfficiencyMetric } from './efficiency-data';

export function readEfficiencySettings(search: string) {
  const params = new URLSearchParams(search);
  const values = params.get('thresholds');
  const requested = new Set(values?.split(','));
  const metric: EfficiencyMetric = params.get('metric') === 'speed' ? 'speed' : 'cost';
  return {
    metric,
    thresholds: efficiencyThresholds.filter((value) => values === null || requested.has(String(value))),
  };
}

export type EfficiencySettings = ReturnType<typeof readEfficiencySettings>;

export function writeEfficiencySettings({ metric, thresholds }: EfficiencySettings) {
  const params = new URLSearchParams({ page: 'efficiency' });
  if (metric !== 'cost') params.set('metric', metric);
  if (thresholds.length !== efficiencyThresholds.length)
    params.set('thresholds', thresholds.join(','));
  return `?${params}`;
}
