import { defaultSelected, families } from './models';
import { metrics, views, type Metric, type ViewId } from './chart-definitions';
import { efforts } from './data/efforts';

export type Settings = {
  selected: string[];
  excluded: string[];
  frontier: boolean;
  labels: boolean;
  grouped: boolean;
  descending: boolean | null;
  linear: ViewId[];
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
  scatter: true,
};

/** Keep known URL IDs once, in the order they first appeared. */
function readIds<Id extends string>(value: string, known: readonly Id[]): Id[] {
  return [...new Set(value.split(','))].filter((id): id is Id =>
    known.some((knownId) => knownId === id),
  );
}

export function readSettings(search: string): Settings {
  const params = new URLSearchParams(search);
  const selected = params.get('selected');
  const excluded = params.get('excluded');
  return {
    selected: selected === null
      ? defaults.selected
      : readIds(selected, families.map((family) => family.family)),
    excluded: excluded === null ? defaults.excluded : readIds(excluded, efforts),
    frontier: params.get('frontier') === 'true',
    labels: params.get('labels') !== 'false',
    grouped: params.get('grouped') !== 'false',
    descending: params.get('sort') === 'desc' ? true : params.get('sort') === 'asc' ? false : null,
    linear: readIds(params.get('linear') ?? '', views.map((view) => view.id)),
    scatter: params.get('scatter') !== 'false',
  };
}

export function readView(search: string): ViewId {
  const id = new URLSearchParams(search).get('chart');
  return views.find((view) => view.id === id)?.id ?? views[0].id;
}

/** Mobile ranges put the better end first unless the user chose an order. */
export function chartDescending(metric: Metric, phone: boolean, descending: Settings['descending']) {
  return descending ?? (phone && metrics[metric].higherIsBetter);
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
  if (!settings.scatter) params.set('scatter', 'false');
  if (view !== views[0].id) params.set('chart', view);
  return params.size ? `?${params}` : '/';
}
