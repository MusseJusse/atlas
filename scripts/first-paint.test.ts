import { expect, it } from 'vitest';
import { injectFirstPaint } from './first-paint';

const template = '<link rel="stylesheet" href="/assets/app.css"><div id="root"></div>';
const styles = new Map([['assets/app.css', 'body{color:black}']]);

it('injects rendered markup and emitted CSS without interpreting replacement characters', () => {
  expect(injectFirstPaint(template, '<main>$&</main>', styles)).toBe(
    '<style>body{color:black}</style><div id="root"><main>$&</main></div>',
  );
});

it('rejects template drift, missing markup and unresolvable CSS instead of silently degrading', () => {
  for (const html of [template.replace('id="root"', 'id="app"'), template + template])
    expect(() => injectFirstPaint(html, '<main/>', styles)).toThrow('exactly one');
  expect(() => injectFirstPaint(template, '', styles)).toThrow('nonempty');
  expect(() => injectFirstPaint(template, '<main/>', new Map())).toThrow('stylesheet');
  expect(() => injectFirstPaint('<div id="root"></div>', '<main/>', styles)).toThrow('stylesheet');
});
