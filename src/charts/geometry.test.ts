import { expect, it } from 'vitest';
import { models, type Model } from '../models';
import { speedEndpoints } from '../data/speed-endpoints';
import { barDomain, linearScale, logScale } from '../scales';
import { scatterDomain } from '../scatter-data';
import { barGeometry, measureRows, measureScatterRows, rangeGeometry, scatterGeometry } from './geometry';

const base = models[0]!;
function model(id: string, family: string, cost: number | null, intelligence = 40): Model {
  return { ...base, id, family, cost, intelligence };
}

it('prepares only measured rows, preserving zero, signed scores and estimate provenance', () => {
  const estimate = speedEndpoints.find((row) => row.timeEstimate)!;
  const signed = { ...base, omniscience: -88.6 };
  expect(measureRows([model('null', 'a', null), model('free', 'a', 0)], 'cost').map((row) => row.value)).toEqual([0]);
  expect(measureRows([signed], 'omniscience')[0]?.value).toBe(-88.6);
  expect(measureRows([estimate], 'time')[0]?.timeEstimate).toBe(estimate.timeEstimate);
});

it.each([false, true])('keeps scatter coordinates, frontier and family paths on their existing scales, linear=%s', (linear) => {
  const source = [
    model('free', 'free', 0, 35),
    model('small', 'a', 0.2, 40),
    { ...model('large', 'a', 1, 60), effortOrder: 60 },
    model('dominated', 'b', 2, 30),
    model('null', 'c', null),
    { ...model('no-score', 'c', 1), intelligence: null },
  ];
  const rows = measureScatterRows(source, 'cost', linear);
  expect(rows.some((row) => row.id === 'free')).toBe(linear);
  expect(rows.some((row) => row.id === 'null' || row.id === 'no-score')).toBe(false);
  const original = structuredClone(rows);
  for (const width of [390, 960]) {
    const geometry = scatterGeometry(rows, 'cost', width, 640, true, linear);
    const left = width < 600 ? 46 : 64;
    const right = width - (width < 600 ? 24 : 235);
    const domain = scatterDomain(rows, 'cost', linear);
    const reference = linear ? linearScale(domain, [left, right], { nice: true }) : logScale(domain, [left, right]);
    for (const row of rows) expect(geometry.x(row.value)).toBe(reference(row.value));
    expect([...geometry.frontierIds]).toEqual(linear ? ['free', 'small', 'large'] : ['small', 'large']);
    const family = geometry.series.find((series) => series.family === 'a')!;
    expect(geometry.path(family.rows)).toBe(family.rows.map((row, index) => `${index ? 'L' : 'M'}${reference(row.value)},${geometry.y(row.score)}`).join(''));
    expect(geometry.labels.every((label) => label.y >= geometry.top && label.y <= geometry.bottom)).toBe(true);
  }
  expect(rows).toEqual(original);
});

it('keeps a zero-only linear scatter usable', () => {
  const rows = measureScatterRows([model('free', 'a', 0)], 'cost', true);
  const geometry = scatterGeometry(rows, 'cost', 390, 640, true, true);
  expect(geometry.x(0)).toBe(geometry.left);
  expect(geometry.logTicks).toContain(0);
  expect(geometry.path(rows)).not.toMatch(/NaN|Infinity/);
});

it('keeps negative bars below zero, reserves label space and avoids overlapping value labels', () => {
  const rows = measureRows([-88.6, -88.6, 0, 46.4].map((omniscience, i) => ({
    ...base, id: `signed-${i}`, family: 'signed', omniscience, effortOrder: i,
  })), 'omniscience');
  const original = structuredClone(rows);
  const geometry = barGeometry(rows, 'omniscience', 320, 640, true, false);
  const reference = linearScale(barDomain(rows.map((row) => row.value), 0.15), [640 - 96 - 42, 50]);
  for (const row of rows) {
    expect(geometry.y(row.value)).toBe(reference(row.value));
    if (row.value < 0) expect(geometry.y(row.value)).toBeGreaterThan(geometry.y(0));
    if (row.value > 0) expect(geometry.y(row.value)).toBeLessThan(geometry.y(0));
  }
  const bars = geometry.positioned.flatMap((group) => group.bars);
  for (const [index, bar] of bars.entries()) {
    for (const other of bars.slice(index + 1)) {
      const combinedWidth = (bar.text.length + other.text.length) * 6.4 / 2 + 4;
      expect(Math.abs(bar.labelX - other.labelX) >= combinedWidth || Math.abs(bar.labelY - other.labelY) >= 17).toBe(true);
    }
  }
  expect(rows).toEqual(original);
});

it('preserves phone minimum ordering versus desktop maximum ordering and explicit descending', () => {
  const rows = measureRows([
    model('a-low', 'a', 1), model('a-high', 'a', 100),
    model('b-low', 'b', 2), model('b-high', 'b', 3),
  ], 'cost');
  expect(rangeGeometry(rows, 'cost', false).groups.map((group) => group.id)).toEqual(['a', 'b']);
  expect(barGeometry(rows, 'cost', 960, 640, true, false).positioned.map((group) => group.id)).toEqual(['b', 'a']);
  expect(rangeGeometry(rows, 'cost', true).groups.map((group) => group.id)).toEqual(['a', 'b']);
  const ungrouped = barGeometry(rows, 'cost', 960, 640, false, false);
  expect(ungrouped.positioned.map((group) => group.id)).toEqual(['a-low', 'b-low', 'b-high', 'a-high']);
});

it('places signed phone ranges within bounds and keeps a zero reference', () => {
  const rows = measureRows([-88.6, 0, 46.4].map((omniscience, i) => ({ ...base, id: `${i}`, omniscience })), 'omniscience');
  const geometry = rangeGeometry(rows, 'omniscience', true);
  expect(geometry.position(0)).toBeGreaterThan(0);
  expect(geometry.position(0)).toBeLessThan(100);
  for (const row of rows) {
    expect(geometry.position(row.value)).toBeGreaterThanOrEqual(0);
    expect(geometry.position(row.value)).toBeLessThanOrEqual(100);
  }
});


it('thins dense model labels within bounds without dropping points or series', () => {
  const rows = measureScatterRows(Array.from({ length: 80 }, (_, index) =>
    model(`dense-${index}`, `family-${index}`, index + 1, 40 + index / 10)), 'cost', false);
  const geometry = scatterGeometry(rows, 'cost', 960, 400, true, false);
  expect(geometry.series).toHaveLength(rows.length);
  expect(geometry.labels.length).toBeLessThan(20);
  for (const label of geometry.labels) {
    expect(label.y).toBeGreaterThanOrEqual(geometry.top);
    expect(label.y).toBeLessThanOrEqual(geometry.bottom);
  }
});
