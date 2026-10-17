import { defaultSelected, families, views, type ViewId } from './models';

export type Settings = {
  selected: string[];
  excluded: string[];
  frontier: boolean;
  labels: boolean;
  grouped: boolean;
  descending: boolean;
  linear: string[];
  scatter: boolean;
  barLayout: 'bars' | 'ranges';
};
export const defaults: Settings = {
  selected: defaultSelected,
  excluded: ['none', 'max'],
  frontier: false,
  labels: true,
  grouped: true,
  descending: false,
  linear: [],
  scatter: false,
  barLayout: 'bars',
};

export function readSettings(search: string): Settings {
  const params = new URLSearchParams(search);
  const known = new Set(families.map((family) => family.family));
  return {
    selected: params.has('selected')
      ? params
          .get('selected')!
          .split(',')
          .filter((id) => known.has(id))
      : defaults.selected,
    excluded: params.has('excluded') ? params.get('excluded')!.split(',').filter(Boolean) : defaults.excluded,
    frontier: params.get('frontier') === 'true',
    labels: params.get('labels') !== 'false',
    grouped: params.get('grouped') !== 'false',
    descending: params.get('sort') === 'desc',
    linear:
      params
        .get('linear')
        ?.split(',')
        .filter((id) => views.some((view) => view.id === id)) ?? [],
    scatter: params.get('scatter') === 'tokens-task',
    barLayout: params.get('layout') === 'ranges' ? 'ranges' : 'bars',
  };
}

export function readView(search: string): ViewId {
  const id = new URLSearchParams(search).get('chart');
  return views.find((view) => view.id === id)?.id ?? views[0].id;
}

export function writeSettings(settings: Settings, view: ViewId) {
  const params = new URLSearchParams();
  if (settings.selected.join(',') !== defaults.selected.join(','))
    params.set('selected', settings.selected.join(','));
  if (settings.excluded.join(',') !== defaults.excluded.join(','))
    params.set('excluded', settings.excluded.join(','));
  if (settings.frontier) params.set('frontier', 'true');
  if (!settings.labels) params.set('labels', 'false');
  if (!settings.grouped) params.set('grouped', 'false');
  if (settings.descending) params.set('sort', 'desc');
  if (settings.linear.length) params.set('linear', settings.linear.join(','));
  if (settings.scatter) params.set('scatter', 'tokens-task');
  if (settings.barLayout === 'ranges') params.set('layout', 'ranges');
  if (view !== views[0].id) params.set('chart', view);
  return params.size ? `?${params}` : '/';
}
