import { expect, test } from 'vitest';
import { scaleLinear, scaleLog } from 'd3-scale';
import { linearScale, logScale } from './scales';
import { models } from './models';

test('numeric scales preserve D3 coordinates and ticks across the benchmark domains', () => {
  const domains: [number, number][] = [
    [1, 1], [0.9, 1.1], [0.001, 1000000],
    ...(['cost', 'tokens', 'tokensTotal', 'costTotal', 'speed', 'time'] as const).map((metric): [number, number] => {
      const values = models.flatMap((model) => model[metric] !== null && model[metric]! > 0 ? [model[metric]!] : []);
      return [Math.min(...values) * 0.7, Math.max(...values) * 1.08];
    }),
  ];
  for (const domain of domains) {
    for (const range of [[46, 356], [544, 30]] as const) {
      for (const count of [4, 6, 10]) {
        const linear = linearScale(domain, range);
        const referenceLinear = scaleLinear().domain(domain).range(range);
        const logarithmic = logScale(domain, range);
        const referenceLog = scaleLog().domain(domain).range(range);
        const rounded = linearScale([0, domain[1]], range, { nice: true });
        const referenceRounded = scaleLinear().domain([0, domain[1]]).nice().range(range);
        expect(linear.ticks(count)).toEqual(referenceLinear.ticks(count));
        expect(logarithmic.ticks(count)).toEqual(referenceLog.ticks(count));
        expect(rounded.ticks(count)).toEqual(referenceRounded.ticks(count));
        for (let step = 0; step <= 20; step++) {
          const value = domain[0] + (domain[1] - domain[0]) * step / 20;
          expect(linear(value)).toBeCloseTo(referenceLinear(value), 10);
          expect(logarithmic(value)).toBeCloseTo(referenceLog(value), 10);
          expect(rounded(value)).toBeCloseTo(referenceRounded(value), 10);
        }
      }
    }
  }
});
