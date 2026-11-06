import { useEffect, useRef } from 'react';
import type { View, ViewId } from './chart-definitions';

const groups = [
  { label: 'Overview', charts: [{ id: 'cost-intelligence', label: 'Cost vs intelligence' }] },
  { label: 'Scores', charts: [{ id: 'intelligence', label: 'Intelligence' }, { id: 'omniscience', label: 'Omniscience' }] },
  { label: 'Resources', charts: [
    { id: 'tokens-task', label: 'Tokens / task' }, { id: 'tokens-total', label: 'Total tokens' },
    { id: 'cost-task', label: 'Cost / task' }, { id: 'time-task', label: 'Time / task' },
  ] },
] as const satisfies readonly { label: string; charts: readonly { id: ViewId; label: string }[] }[];

/** Expose every chart on desktop; phones keep its category and choices visible together. */
export function ChartNavigation({ views, active, navigate }: {
  views: View[]; active: ViewId; navigate: (id: ViewId) => void;
}) {
  const currentGroup = groups.find((group) => group.charts.some((chart) => chart.id === active)) ?? groups[0];
  const lastVisited = useRef(new Map<string, ViewId>());
  useEffect(() => {
    lastVisited.current.set(currentGroup.label, active);
  }, [active, currentGroup.label]);
  const label = (chart: (typeof groups)[number]['charts'][number]) =>
    chart.id === 'intelligence' && views.find((view) => view.id === chart.id)?.metric === 'codingIndex'
      ? 'Coding score' : chart.id === 'cost-intelligence' && views.find((view) => view.id === chart.id)?.label === 'Cost vs coding score' ? 'Cost vs coding score' : chart.label;
  const chartButton = (chart: (typeof groups)[number]['charts'][number]) => (
    <button key={chart.id} type="button" aria-current={active === chart.id ? 'page' : undefined}
      aria-controls={chart.id} onClick={() => navigate(chart.id)}>
      {label(chart)}
    </button>
  );

  return <nav className="chart-navigation" aria-label="Chart views">
    <div className="chart-navigation-desktop">
      {groups.flatMap((group) => group.charts.map(chartButton))}
    </div>
    <div className="chart-navigation-phone">
      <div className="chart-categories" role="group" aria-label="Chart categories">
        {groups.map((group) => <button key={group.label} type="button"
          aria-current={group === currentGroup ? 'true' : undefined}
          onClick={() => { if (group !== currentGroup) navigate(lastVisited.current.get(group.label) ?? group.charts[0].id); }}>{group.label}</button>)}
      </div>
      {currentGroup.charts.length > 1 && <div className="chart-subnavigation" role="group" aria-label={`${currentGroup.label} charts`}>
        {currentGroup.charts.map(chartButton)}
      </div>}
    </div>
  </nav>;
}
