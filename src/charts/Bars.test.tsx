import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { models } from '../models';
import { defaults } from '../state';
import { Bars } from './Bars';
import { measureRows } from './geometry';

it('renders tied and tiny endpoints as distinct controls in visible marker order', () => {
  const rows = measureRows([40, 60, 50, 60, 0.001, 0].map((intelligence, effortOrder) => ({
    ...models[0]!, id: `config-${effortOrder}`, family: 'fixture', name: `Configuration ${effortOrder}`,
    intelligence, effortOrder, effortLabel: `Effort ${effortOrder}`,
  })), 'intelligence');
  const markup = renderToStaticMarkup(<svg><Bars rows={rows} metric="intelligence" settings={{ ...defaults, combined: true }}
    width={960} height={640} interactions={{ activeModel: null, pinned: null, highlighted: null,
      hover: vi.fn(), togglePin: vi.fn(), highlight: vi.fn() }} /></svg>);
  const controls = [...markup.matchAll(/<g\b[^>]*role="button"[^>]*>([\s\S]*?)<\/g>/g)];
  expect(controls).toHaveLength(rows.length);
  const markerPositions = controls.map(([control, content], index) => {
    expect(control).toContain('tabindex="0"');
    expect(control).toContain(`Configuration ${index}, Effort ${index} reasoning`);
    expect(control).toContain('focus-visible:[&amp;&gt;rect[data-focus-target]]:stroke-accent');
    const rects = [...content!.matchAll(/<rect\b[^>]*>/g)].map(([rect]) => rect);
    const segment = rects[1]!;
    const marker = rects[2]!;
    const stripe = rects[3]!;
    expect(segment).toContain('data-focus-target');
    expect(marker).toContain('data-focus-target');
    expect(marker).toContain('stroke="var(--line-2)"');
    expect(stripe.match(/opacity="([^"]+)"/)?.[1]).toBe(segment.match(/opacity="([^"]+)"/)?.[1]);
    return Number(marker.match(/\bx="([^"]+)"/)?.[1]);
  });
  expect(new Set(markerPositions).size).toBe(rows.length);
  expect(markerPositions).toEqual(markerPositions.toSorted((a, b) => a - b));
});

it('keeps effort shades stable when values reverse or grouping changes', () => {
  function shades(values: number[], grouped: boolean) {
    const rows = measureRows(values.map((intelligence, index) => ({
      ...models[0]!, id: `shade-${index}`, name: `Shade ${index}`, family: 'fixture', intelligence, effortOrder: index * 20,
    })), 'intelligence');
    const markup = renderToStaticMarkup(<svg><Bars rows={rows} metric="intelligence" settings={{ ...defaults, grouped, combined: true }}
      width={960} height={640} interactions={{ activeModel: null, pinned: null, highlighted: null,
        hover: vi.fn(), togglePin: vi.fn(), highlight: vi.fn() }} /></svg>);
    return Object.fromEntries([...markup.matchAll(/<g\b[^>]*role="button"[^>]*>([\s\S]*?)<\/g>/g)].map(([control, content]) => [
      control.match(/Shade (\d+)/)?.[1], Number(content!.match(/<rect data-focus-target[^>]*opacity="([^"]+)"/)?.[1]),
    ]));
  }
  const expected = shades([30, 40, 50, 60], true);
  expect(new Set(Object.values(expected)).size).toBe(4);
  expect(shades([60, 50, 40, 30], true)).toEqual(expected);
  expect(shades([30, 40, 50, 60], false)).toEqual(expected);
});
