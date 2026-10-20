// Sidebar filter groups. Models retain their source effort IDs and labels.
export const efforts = ['none', 'low', 'medium', 'high', 'xhigh', 'max'] as const;

/** Group source efforts for filtering without relabeling model configurations. */
export function effortGroup(effort: string) {
  if (effort === 'minimal') return 'low';
  if (effort === 'default') return 'medium';
  return effort;
}
