import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { models } from '../models';
import { defaults } from '../state';
import { Bars } from './Bars';
import { measureRows } from './geometry';

it('renders tied and tiny endpoints as keyboard controls in effort order', () => {
  const rows = measureRows([40, 60, 50, 60, 0.001, 0].map((intelligence, effortOrder) => ({
    ...models[0]!, id: `config-${effortOrder}`, family: 'fixture', name: `Configuration ${effortOrder}`,
    intelligence, effortOrder, effortLabel: `Effort ${effortOrder}`,
  })), 'intelligence');
  const markup = renderToStaticMarkup(<svg><Bars rows={rows} metric="intelligence" settings={{ ...defaults, combined: true }}
    width={960} height={640} interactions={{ activeModel: null, pinned: null, highlighted: null,
      hover: vi.fn(), togglePin: vi.fn(), highlight: vi.fn() }} /></svg>);
  const controls = [...markup.matchAll(/<g\b[^>]*role="button"[^>]*>([\s\S]*?)<\/g>/g)];
  expect(controls).toHaveLength(rows.length);
  controls.forEach(([control, content], index) => {
    expect(control).toContain('tabindex="0"');
    expect(control).toContain(`Configuration ${index}, Effort ${index} reasoning`);
    expect(control).toContain('focus-visible:[&amp;&gt;rect[data-focus-target]]:stroke-accent');
    const rects = [...content!.matchAll(/<rect\b[^>]*>/g)].map(([rect]) => rect);
    const segment = rects[0]!;
    expect(segment).toContain('data-focus-target');
  });
});

it('uses the rightmost configuration shade throughout each combined column', () => {
  function shades(values: number[], combined: boolean) {
    const rows = measureRows(values.map((intelligence, index) => ({
      ...models[0]!, id: `shade-${index}`, name: `Shade ${index}`, family: 'fixture', intelligence, effortOrder: index * 20,
    })), 'intelligence');
    const markup = renderToStaticMarkup(<svg><Bars rows={rows} metric="intelligence" settings={{ ...defaults, combined }}
      width={960} height={640} interactions={{ activeModel: null, pinned: null, highlighted: null,
        hover: vi.fn(), togglePin: vi.fn(), highlight: vi.fn() }} /></svg>);
    return [...markup.matchAll(/<g\b[^>]*role="button"[^>]*>([\s\S]*?)<\/g>/g)].map(([, content]) =>
      Number(content!.match(/<rect data-focus-target[^>]*opacity="([^"]+)"/)?.[1]),
    );
  }
  const separate = shades([30, 40, 50, 60], false);
  const rightmostShade = Math.max(...separate);
  expect(new Set(separate).size).toBe(4);
  for (const values of [[30, 40, 50, 60], [60, 50, 40, 30]]) {
    expect([...new Set(shades(values, true))]).toEqual([rightmostShade]);
  }
});
