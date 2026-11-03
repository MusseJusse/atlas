import { families } from './models';
import { defaultSelected } from './model-presentation';
import { metrics, views, type Metric, type ViewId } from './chart-definitions';
import { readSubscriptionPlans, type PricingSettings } from './data/subscriptions';
import { effortGroup, efforts } from './data/efforts';

export type Settings = PricingSettings & {
  selected: string[];
  excluded: string[];
  frontier: boolean;
  codingOnly: boolean;
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
  codingOnly: false,
  pricingMode: 'api',
  subscriptionPlans: {},
  countResets: false,
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
    excluded: excluded === null
      ? defaults.excluded
      : readIds(excluded.split(',').map(effortGroup).join(','), efforts),
    pricingMode: params.get('pricing') === 'subscription' ? 'subscription' : 'api',
    subscriptionPlans: readSubscriptionPlans(params.getAll('plan')),
    countResets: params.get('resets') === 'true',
    frontier: params.get('frontier') === 'true',
    codingOnly: params.get('codingOnly') === 'true',
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
  if (settings.pricingMode === 'subscription') params.set('pricing', 'subscription');
  for (const [provider, plan] of Object.entries(readSubscriptionPlans(Object.entries(settings.subscriptionPlans).map(([provider, plan]) => `${provider}:${plan}`))).sort(([a], [b]) => a.localeCompare(b)))
    params.append('plan', `${provider}:${plan}`);
  if (settings.countResets) params.set('resets', 'true');
  if (settings.frontier) params.set('frontier', 'true');
  if (settings.codingOnly) params.set('codingOnly', 'true');
  if (!settings.labels) params.set('labels', 'false');
  if (!settings.grouped) params.set('grouped', 'false');
  if (settings.descending !== null) params.set('sort', settings.descending ? 'desc' : 'asc');
  if (settings.linear.length) params.set('linear', settings.linear.join(','));
  if (!settings.scatter) params.set('scatter', 'false');
  if (view !== views[0].id) params.set('chart', view);
  return params.size ? `?${params}` : '/';
}
