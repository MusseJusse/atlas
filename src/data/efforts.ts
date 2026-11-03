// Sidebar filter groups. Models retain their source effort IDs and labels.
export const efforts = ['none', 'low', 'medium', 'high', 'xhigh', 'max'] as const;

/** Group source efforts for filtering without relabeling model configurations. */
export function effortGroup(effort: string) {
  if (effort === 'minimal') return 'low';
  if (effort === 'default') return 'medium';
  return effort;
}

/** Keep Max when it is the only available reasoning tier, regardless of non-reasoning rows. */
export function filterReasoning<Row extends { family: string; effort: string }>(rows: Row[], excluded: string[]) {
  const excludedEfforts = new Set(excluded.map(effortGroup));
  const otherReasoningFamilies = new Set(rows
    .filter((row) => row.effort !== 'max' && row.effort !== 'none')
    .map((row) => row.family));
  return rows.filter((row) => !excludedEfforts.has(effortGroup(row.effort)) ||
    (row.effort === 'max' && !otherReasoningFamilies.has(row.family)));
}
