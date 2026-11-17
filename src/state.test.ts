import { describe, expect, expectTypeOf, it } from 'vitest';
import { efforts } from './data/efforts';
import { visibleModels, type ViewId } from './models';
import { defaults, readSettings, readView, writeSettings } from './state';

describe('URL settings', () => {
  it('keeps combined bars off by default and round-trips explicit opt-in', () => {
    expect(defaults.combined).toBe(false);
    for (const search of ['', '?combined=false', '?combined=unknown']) expect(readSettings(search).combined).toBe(false);
    const settings = readSettings('?combined=true');
    expect(settings.combined).toBe(true);
    expect(readSettings(writeSettings(settings, 'intelligence'))).toEqual(settings);
    expect(writeSettings({ ...settings, combined: false }, 'cost-intelligence')).not.toContain('combined');
  });
  it('counts each known selected family once and preserves its first occurrence', () => {
    const selected = ['gpt-6-1-sol', 'gemini-4-argon'];
    const settings = readSettings(
      '?selected=gpt-6-1-sol,unknown,gemini-4-argon,gpt-6-1-sol,,gemini-4-argon',
    );
    expect(settings.selected).toEqual(selected);
    expect(settings.selected).toHaveLength(2);
    expect(visibleModels(settings.selected, settings.excluded)).toEqual(
      visibleModels(selected, settings.excluded),
    );
  });

  it('accepts every canonical effort once and discards unknown effort IDs', () => {
    const settings = readSettings(`?excluded=${[...efforts, 'unknown', ...efforts, ''].join(',')}`);
    expect(settings.excluded).toEqual(efforts);
    expect(readSettings('?excluded=high,none,high,unknown').excluded).toEqual(['high', 'none']);
  });

  it('normalizes old effort IDs into filter groups before deduplicating and writing URLs', () => {
    const settings = readSettings('?excluded=minimal,low,default,medium,minimal,unknown');
    expect(settings.excluded).toEqual(['low', 'medium']);
    const url = writeSettings(settings, 'cost-intelligence');
    expect(url).toBe('?excluded=low%2Cmedium');
    expect(readSettings(url)).toEqual(settings);
  });

  it('keeps known linear view IDs once in URL order', () => {
    const { linear } = readSettings(
      '?linear=tokens-task,unknown,cost-intelligence,tokens-task,,cost-intelligence',
    );
    expect(linear).toEqual(['tokens-task', 'cost-intelligence']);
    expectTypeOf(linear).toEqualTypeOf<ViewId[]>();
  });

  it.each(['?selected=&excluded=&linear=', '?selected=unknown&excluded=unknown&linear=unknown'])(
    'round-trips explicit empty arrays after reading %s',
    (search) => {
      const settings = readSettings(search);
      expect(settings).toEqual({ ...defaults, selected: [], excluded: [], linear: [] });
      const url = writeSettings(settings, 'cost-intelligence');
      expect(url).toBe('?selected=&excluded=');
      expect(readSettings(url)).toEqual(settings);
    },
  );

  it('round-trips defaults without adding query parameters', () => {
    expect(readSettings('')).toEqual(defaults);
    expect(writeSettings(readSettings(''), 'cost-intelligence')).toBe('/');
    expect(readSettings('/')).toEqual(defaults);
  });

  it.each(['', '&sort=unknown', '&sort=asc', '&sort=desc'])(
    'round-trips normalized settings and preserves the sort choice %s',
    (sort) => {
      const search = '?selected=gemini-4-argon,gpt-6-1-sol,gemini-4-argon,unknown'
        + '&excluded=high,unknown,none,high&linear=tokens-task,unknown,tokens-task'
        + '&frontier=true&labels=false&grouped=false&scatter=false&chart=tokens-task'
        + sort;
      const settings = readSettings(search);
      const url = writeSettings(settings, readView(search));
      expect(readSettings(url)).toEqual(settings);
      expect(readView(url)).toBe('tokens-task');
      expect(url).not.toContain('unknown');
      expect(settings.descending).toBe(sort === '&sort=asc' ? false : sort === '&sort=desc' ? true : null);
    },
  );
});
