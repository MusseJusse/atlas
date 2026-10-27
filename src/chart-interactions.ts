/** Hidden configurations cannot override a visible preview; keep IDs so pins can return. */
export function resolveChartInteraction<Row extends { id: string }>(rows: readonly Row[], pinnedId: string | null, hoveredId: string | null) {
  const pinned = rows.find((row) => row.id === pinnedId) ?? null;
  const hovered = rows.find((row) => row.id === hoveredId) ?? null;
  return { pinned, activeModel: pinned ?? hovered };
}
