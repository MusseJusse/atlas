import type { Model } from './data/schema';
import { filterReasoning } from './data/efforts';
import { resolveView, type View } from './chart-definitions';
import { scatterRows } from './scatter-data';
import type { Settings } from './state';

/** Count reasoning alternatives only when they can actually appear in this chart. */
export function visibleChartRows(rows: Model[], view: View, settings: Settings) {
  const { scatter, linear, score } = resolveView(view, settings);
  const measured = scatter
    ? scatterRows(rows, view.metric, linear, score)
    : rows.filter((row) => row[view.metric] != null);
  return filterReasoning(measured, settings.excluded);
}
