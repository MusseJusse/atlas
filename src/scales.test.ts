import { expect, test } from 'vitest';
import { scaleLinear, scaleLog } from 'd3-scale';
import { barDomain, linearScale, logScale } from './scales';
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

test('signed chart scales include zero and keep negative scores within desktop and mobile bounds', () => {
  for (const values of [[-88.6, 0, 46.4], [-21.9, -5.5], [0], [], [0, 52.4]]) {
    for (const padding of [0, 0.15]) {
      const domain = barDomain(values, padding);
      const desktop = linearScale(domain, [300, 30]);
      const mobile = linearScale(domain, [0, 100]);
      for (const value of [...values, 0]) {
        expect(desktop(value)).toBeGreaterThanOrEqual(30);
        expect(desktop(value)).toBeLessThanOrEqual(300);
        expect(mobile(value)).toBeGreaterThanOrEqual(0);
        expect(mobile(value)).toBeLessThanOrEqual(100);
        if (value < 0) expect(desktop(value)).toBeGreaterThan(desktop(0));
        if (value > 0) expect(desktop(value)).toBeLessThan(desktop(0));
      }
    }
  }
});
