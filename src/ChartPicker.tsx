import type { View, ViewId } from './chart-definitions';

const groups = [
  { label: 'Compare', ids: ['cost-intelligence'] },
  { label: 'Scores', ids: ['intelligence', 'omniscience'] },
  { label: 'Cost & tokens', ids: ['cost-task', 'tokens-task', 'tokens-total'] },
  { label: 'Time', ids: ['time-task'] },
] as const;

export function ChartPicker({ views, active, navigate }: { views: View[]; active: ViewId; navigate: (id: ViewId) => void }) {
  return <label className="chart-picker">Chart
    <select value={active} onChange={(event) => {
      const view = views.find((view) => view.id === event.currentTarget.value);
      if (view) navigate(view.id);
    }}>
      {groups.map((group) => <optgroup key={group.label} label={group.label}>
        {views.filter((view) => group.ids.some((id) => id === view.id)).map((view) =>
          <option key={view.id} value={view.id}>{view.label}</option>)}
      </optgroup>)}
    </select>
  </label>;
}
