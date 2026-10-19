import { defaultSelected, families, views, type Metric, type ViewId } from './models';

export type Settings = {
  selected: string[];
  excluded: string[];
  frontier: boolean;
  labels: boolean;
  grouped: boolean;
  descending: boolean | null;
  linear: string[];
  scatter: boolean;
};
export const defaults: Settings = {
  selected: defaultSelected,
  excluded: ['none', 'max'],
  frontier: false,
  labels: true,
  grouped: true,
  descending: null,
  linear: [],
  scatter: false,
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
    descending: params.get('sort') === 'desc' ? true : params.get('sort') === 'asc' ? false : null,
    linear:
      params
        .get('linear')
        ?.split(',')
        .filter((id) => views.some((view) => view.id === id)) ?? [],
    scatter: params.get('scatter') === 'tokens-task',
  };
}

export function readView(search: string): ViewId {
  const id = new URLSearchParams(search).get('chart');
  return views.find((view) => view.id === id)?.id ?? views[0].id;
}

/** Mobile ranges put the better end first unless the user chose an order. */
export function chartDescending(metric: Metric, phone: boolean, descending: Settings['descending']) {
  return descending ?? (
    phone && (metric === 'intelligence' || metric === 'omniscience' || metric === 'speed')
  );
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
  if (settings.descending !== null) params.set('sort', settings.descending ? 'desc' : 'asc');
  if (settings.linear.length) params.set('linear', settings.linear.join(','));
  if (settings.scatter) params.set('scatter', 'tokens-task');
  if (view !== views[0].id) params.set('chart', view);
  return params.size ? `?${params}` : '/';
}
